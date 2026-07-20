import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { campaignDetail } from "../domain/fixtures";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";
import { projectOwnerFundingProofRequiredEvidenceKeys } from "../domain/projectOwnerFundingProofReviewBridge";
import { rewardDistributionHandoffRequiredEvidenceKeys } from "../domain/rewardDistributionHandoffRuntime";
import type { WalletClient } from "../wallet/walletClient";
import { createDeprecatedNonLivePreviewAuthorityOption } from "./apiRuntime";
import { startCampaignOsApiServer, type CampaignOsApiServerHandle } from "./server";
import {
  WALLET_AUTHENTICATION_MESSAGE_MAX_BYTES,
  WALLET_AUTHENTICATION_PROTOCOL_VERSION,
} from "./walletAuthenticationChallenge";
import {
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX,
  WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN,
} from "./walletAuthenticationConfig";

type SmokePayload = {
  data?: unknown;
  error?: unknown;
  ok?: boolean;
  traceId?: string;
};

export interface BackendRuntimeSmokeOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  port?: number;
  serverFactory?: typeof startCampaignOsApiServer;
  shutdownTimeoutMs?: number;
}

export interface BackendRuntimeWalletAuthenticationSmokeOptions {
  adapterId: string;
  audience: string;
  baseUrl: string;
  campaignId: string;
  clock?: Readonly<{ now: () => Date }>;
  fetchImpl?: typeof fetch;
  origin: string;
  taskId: string;
  walletClient: Pick<WalletClient, "close" | "connect" | "disconnect" | "signMessage">;
}

export type BackendRuntimeWalletAuthenticationSmokePhase =
  | "challenge"
  | "cleanup"
  | "connect"
  | "current_session"
  | "input"
  | "logout"
  | "post_logout_session"
  | "proof"
  | "session"
  | "task_verification";

export class BackendRuntimeWalletAuthenticationSmokeError extends Error {
  readonly code = "BACKEND_RUNTIME_WALLET_AUTH_SMOKE_FAILED";
  readonly phase: BackendRuntimeWalletAuthenticationSmokePhase;

  constructor(phase: BackendRuntimeWalletAuthenticationSmokePhase) {
    super("Campaign OS live wallet authentication smoke check failed.");
    this.name = "BackendRuntimeWalletAuthenticationSmokeError";
    this.phase = phase;
    delete this.stack;
  }
}

export interface BackendRuntimeWalletAuthenticationSmokeSummary {
  canonicalSubjectContinuity: true;
  credentialAuthority: "durable_cookie";
  proofPort: "wallet_client";
  status: "passed";
  subjectDigest: string;
  traceIds: {
    challenge: string;
    currentSession: string;
    logout: string;
    postLogoutSession: string;
    session: string;
    verification: string;
  };
  verificationBodyFields: readonly ["campaignId"];
}

export interface BackendRuntimeSmokeCliOptions {
  logger?: Pick<Console, "error" | "log">;
  smokeOptions?: BackendRuntimeSmokeOptions;
  smokeRunner?: (
    options?: BackendRuntimeSmokeOptions,
  ) => Promise<BackendRuntimeSmokeSummary>;
}

class BackendRuntimeSmokeCleanupError extends Error {
  readonly code = "BACKEND_RUNTIME_SMOKE_CLEANUP_FAILED";
  readonly failureCount: number;

  constructor(failureCount: number) {
    super("Campaign OS smoke cleanup failed.");
    this.name = "BackendRuntimeSmokeCleanupError";
    this.failureCount = failureCount;
  }
}

export interface BackendRuntimeSmokeCheck {
  activationPresent: boolean;
  analyticsIngestionRuntime?: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary;
  authSessionFoundation?: BackendRuntimeSmokeAuthSessionFoundationSummary;
  campaignDatabase?: BackendRuntimeSmokeCampaignDatabaseSummary;
  contractWriterRuntime?: BackendRuntimeSmokeContractWriterRuntimeSummary;
  deploymentHandoff?: unknown;
  endpoint: "/api/health" | "/api/contracts";
  ok: boolean;
  objectStorageExportRuntime?: BackendRuntimeSmokeObjectStorageExportRuntimeSummary;
  observabilityExporterFoundation?: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation?: BackendRuntimeSmokePersistenceFoundationSummary;
  productionBackendReadiness?: BackendRuntimeSmokeProductionBackendReadinessSummary;
  providerClientReadiness?: BackendRuntimeSmokeProviderClientReadinessSummary;
  providerIndexerFoundation?: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  projectOwnerFundingProofReviewBridge?: BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary;
  queueRuntimeFoundation?: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  rewardDistributionHandoffRuntime?: BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary;
  schedulerRuntimeFoundation?: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  status: number;
  traceId: string;
  workerIdempotencyStoreFoundation?: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary;
  workerLeaseStoreFoundation?: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary;
  workerSchedulerFoundation?: BackendRuntimeSmokeWorkerSchedulerFoundationSummary;
}

export interface BackendRuntimeSmokeCampaignDatabaseSummary {
  adapterId?: string;
  fallbackUsed: boolean;
  liveConnectionAttempted: boolean;
  liveQueryExecutionEnabled: boolean;
  liveStorageExecutionEnabled: boolean;
  selectedMode?: string;
  status?: string;
}

export interface BackendRuntimeSmokeDurableLocalPersistenceSummary {
  adapterLabel?: string;
  countsByKind: Record<string, number>;
  durable: true;
  latestRecordKinds: string[];
  localOnly: true;
  mode: "local_json";
  noMigrationRunner: true;
  noProductionDatabase: true;
  noSecretHandling: true;
  recordCount: number;
  restartedRecordCount: number;
  status: "passed";
  traceIds: {
    campaignDraft: string;
    exportPreview: string;
    firstHealth: string;
    restartedHealth: string;
    taskDraft: string;
    verification: string;
    walletSession: string;
  };
  wroteRecordKinds: string[];
}

export interface BackendRuntimeSmokePersistenceFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveConnectionAttempted: boolean;
  liveMigrationExecutionEnabled: boolean;
  liveQueryExecutionEnabled: boolean;
  migrationDryRunStatus?: string;
  productionReady: boolean;
  status?: string;
  storeCoverageCount: number;
  valid: boolean;
}

export interface BackendRuntimeSmokeAuthSessionFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveSideEffectsEnabled: boolean;
  liveSigningExecuted: boolean;
  liveVerificationExecuted: boolean;
  productionReady: boolean;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeAdminReviewRuntimeSummary {
  coverage: "default_disabled_route";
  enabled: false;
  endpoint: "/api/admin/campaigns";
  errorCode: "ROUTE_NOT_FOUND";
  httpStatus: 404;
  responseDataPresent: false;
  routeExposed: false;
  safeEnvelope: true;
  status: "disabled";
  traceId: string;
}

export interface BackendRuntimeSmokeTaskTemplateCatalogRuntimeSummary {
  coverage: "default_disabled_fail_closed";
  enabled: false;
  endpoint: "/api/task-templates";
  errorCode: "TASK_TEMPLATE_CATALOG_UNAVAILABLE";
  httpStatus: 503;
  responseDataPresent: false;
  routeExposed: true;
  safeEnvelope: true;
  shellHealthAvailable: true;
  status: "disabled";
  traceIds: {
    catalog: string;
    shellHealth: string;
  };
}

export interface BackendRuntimeSmokeObjectStorageExportRuntimeSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  downloadEnabled: false;
  localReviewOnly: true;
  manifestOnly: true;
  objectKeyCreated: false;
  productionReady: false;
  providerCallAttempted: false;
  providerStatus?: string;
  requiredConfigKeys: string[];
  signedUrlCreated: false;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary {
  diagnosticCodes: string[];
  eventCatalogCount: number;
  liveAnalyticsSdkExecuted: false;
  liveEventIngestionEnabled: false;
  liveEventWarehouseWrite: false;
  metricLineageCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  traceId?: string;
  valid: boolean;
  warehouseStatus?: string;
}

export interface BackendRuntimeSmokeContractWriterRuntimeSummary {
  configStatus?: string;
  diagnosticCodes: string[];
  liveContractWrite: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSignerExecution: false;
  liveWalletSignature: false;
  operationCount: number;
  operationGroupCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  traceId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary {
  diagnosticCodes: string[];
  evidenceStatus?: string;
  itemCount: number;
  liveClaim: false;
  liveContractWrite: false;
  livePayout: false;
  liveProviderCall: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSchedulerExecution: false;
  liveWalletSignature: false;
  liveWorkerExecution: false;
  missingEvidenceCount: number;
  productionReady: false;
  recipientCount: number;
  requiredEvidenceKeys: string[];
  status?: string;
  traceId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary {
  blockedItemCount: number;
  diagnosticCodes: string[];
  liveContractWrite: false;
  liveFundingTransfer: false;
  liveObjectStorageWrite: false;
  liveProviderCall: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSchedulerExecution: false;
  liveWalletSignature: false;
  liveWorkerExecution: false;
  missingEvidenceCount: number;
  productionReady: false;
  proofPackageStatus?: string;
  readyItemCount: number;
  requiredEvidenceKeys: string[];
  requiredItemCount: number;
  reviewRequiredItemCount: number;
  status?: string;
  traceId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary {
  dbClientConstructed: false;
  diagnosticCodes: string[];
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  localMvpReady: true;
  migrationGateLiveExecutionEnabled: false;
  migrationGateStatus?: string;
  noLiveFlagsAllFalse: boolean;
  packageBindingId?: string;
  packageName?: string;
  packageRef?: string;
  productionReady: false;
  requiredReferenceCount: number;
  requiredReferenceKeys: string[];
  status?: string;
  storeCoverageCount: number;
  traceId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProviderIndexerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveIndexerCallsEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveSocialCallsEnabled: false;
  productionReady: false;
  providerGroupCount: number;
  status?: string;
  valid: boolean;
  verificationSourceCoverageCount: number;
  workerExecutionEnabled: false;
}

export interface BackendRuntimeSmokeProviderClientReadinessSummary {
  activationStatus?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  liveProviderCallsAttempted: false;
  productionReady: false;
  providerHttpRuntime: BackendRuntimeSmokeProviderHttpRuntimeSummary;
  providerClientsEnabled: boolean;
  providerClientsProvided: boolean;
  queueHandoffStatus?: string;
  registryClientCount: number;
  registryProviderGroupCount: number;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProviderHttpRuntimeSummary {
  activationStatus?: string;
  blockerCount: number;
  configuredCategories: string[];
  diagnosticCodes: string[];
  endpointCount: number;
  endpointRollout: {
    blockedCount: number;
    configuredCategories: string[];
    deferredCount: number;
    diagnosticCodes: string[];
    disabledCount: number;
    enabledCount: number;
    endpointCount: number;
    providerFamilies: string[];
    requiredConfigKeys: string[];
    valid: boolean;
  };
  liveHttpCallsAttempted: false;
  productionReady: false;
  runtimeId?: string;
  status?: string;
  transportProvided: boolean;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerSchedulerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  jobCatalogCount: number;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  schedulePolicyCount: number;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeQueueRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  dryRunEnqueueEnabled: boolean;
  id?: string;
  liveCronExecutionEnabled: false;
  liveQueueConsumptionEnabled: false;
  liveQueueConsumingReadiness: BackendRuntimeSmokeQueueConsumingReadinessSummary;
  liveQueuePublishingEnabled: false;
  liveQueuePublishingReadiness: BackendRuntimeSmokeQueuePublishingReadinessSummary;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary;
  queuePlanCount: number;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeQueuePublishingReadinessSummary {
  activationStatus?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  livePublishAttempted: boolean;
  liveQueuePublishingEnabled: boolean;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  publishAttemptPolicy?: string;
  publishRequestEvaluated: boolean;
  publishResultStatus?: string;
  publisherId?: string;
  publisherProvided: boolean;
  requiredConfigKeys: string[];
  status?: string;
}

export interface BackendRuntimeSmokeQueueConsumingReadinessSummary {
  activationStatus?: string;
  ackAttempted: boolean;
  blockerCount: number;
  consumeAttemptPolicy?: string;
  consumeRequestEvaluated: boolean;
  consumeResultStatus?: string;
  consumerId?: string;
  consumerProvided: boolean;
  deadLetterAttempted: boolean;
  diagnosticCodes: string[];
  handlerRegistryProvided: boolean;
  liveConsumeAttempted: boolean;
  liveQueueConsumptionEnabled: boolean;
  nackAttempted: boolean;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  requiredConfigKeys: string[];
  retryScheduled: boolean;
  status?: string;
}

export interface BackendRuntimeSmokeQueueProviderAdapterSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  driverActivationGateSatisfied: boolean;
  driverBlockerCount: number;
  driverDiagnosticCodes: string[];
  driverDisabledLiveOperationCount: number;
  driverId?: string;
  driverLiveQueueConsumptionEnabled: false;
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode?: string;
  driverOperationCount: number;
  driverProductionReady: false;
  driverProviderId?: string;
  driverConsumeAckAttempted: boolean;
  driverConsumeAttemptPolicy?: string;
  driverConsumeDeadLetterAttempted: boolean;
  driverConsumeDiagnosticCodes: string[];
  driverConsumeNackAttempted: boolean;
  driverConsumeRequestEvaluated: boolean;
  driverConsumeResultStatus?: string;
  driverConsumeRetryScheduled: boolean;
  driverConsumingActivationStatus?: string;
  driverConsumingBlockerCount: number;
  driverConsumingConsumerId?: string;
  driverConsumingConsumerProvided: boolean;
  driverConsumingHandlerRegistryProvided: boolean;
  driverConsumingLiveConsumeAttempted: boolean;
  driverConsumingLiveQueueConsumptionEnabled: boolean;
  driverConsumingNoLiveSideEffects: Record<string, false>;
  driverConsumingProductionReady: false;
  driverConsumingRequiredConfigKeys: string[];
  driverConsumingStatus?: string;
  driverPublishAttemptPolicy?: string;
  driverPublishDiagnosticCodes: string[];
  driverPublishRequestEvaluated: boolean;
  driverPublishResultStatus?: string;
  driverPublishingActivationStatus?: string;
  driverPublishingBlockerCount: number;
  driverPublishingLivePublishAttempted: boolean;
  driverPublishingLiveQueuePublishingEnabled: boolean;
  driverPublishingNoLiveSideEffects: Record<string, false>;
  driverPublishingPublisherId?: string;
  driverPublishingPublisherProvided: boolean;
  driverPublishingRequiredConfigKeys: string[];
  driverPublishingStatus?: string;
  driverRequiredConfigKeys: string[];
  driverSdkBindingActivationGateSatisfied: boolean;
  driverSdkBindingBlockerCount: number;
  driverSdkBindingDiagnosticCodes: string[];
  driverSdkBindingDisabledLiveOperationCount: number;
  driverSdkBindingId?: string;
  driverSdkBindingLiveProviderCallAttempted: false;
  driverSdkBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingMode?: string;
  driverSdkBindingOperationCount: number;
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: number;
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: string[];
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode?: string;
  driverSdkBindingPackageBindingBrokerConnectionId?: string;
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: string[];
  driverSdkBindingPackageBindingBrokerConnectionStatus?: string;
  driverSdkBindingPackageBindingBlockerCount: number;
  driverSdkBindingPackageBindingBrowserBundleAllowed: false;
  driverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: number;
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: string[];
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
  driverSdkBindingPackageBindingBullmqConstructionId?: string;
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
  driverSdkBindingPackageBindingBullmqConstructionStatus?: string;
  driverSdkBindingPackageBindingDiagnosticCodes: string[];
  driverSdkBindingPackageBindingFamily?: string;
  driverSdkBindingPackageBindingId?: string;
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingPackageBindingPackageName?: string;
  driverSdkBindingPackageBindingPackageRef?: string;
  driverSdkBindingPackageBindingQueueClientConstructed: boolean;
  driverSdkBindingPackageBindingQueueEventsConstructed: boolean;
  driverSdkBindingPackageBindingSdkClientConstructed: false;
  driverSdkBindingPackageBindingStatus?: string;
  driverSdkBindingPackageBindingWorkerConstructed: boolean;
  driverSdkBindingProductionReady: false;
  driverSdkBindingProviderKind?: string;
  driverSdkBindingQueueRouteCount: number;
  driverSdkBindingRequiredConfigKeys: string[];
  driverSdkBindingSdkClientConstructed: false;
  driverSdkBindingSdkPackageRef?: string;
  driverSdkBindingStatus?: string;
  driverSdkBindingValid: boolean;
  driverStatus?: string;
  driverValid: boolean;
  liveQueueConsumptionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  operationCount: number;
  productionReady: false;
  providerId?: string;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeSchedulerRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  dryRunTriggerEnabled: boolean;
  id?: string;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  registrationCount: number;
  scheduleIds: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  id?: string;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  storeId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  id?: string;
  keySchemaVersion?: string;
  liveIdempotencyExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  namespace?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  storeId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeObservabilityExporterFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  exporterId?: string;
  id?: string;
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace?: string;
  mode?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  sinkId?: string;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProductionBackendReadinessSummary {
  databasePackageBinding?: BackendRuntimeSmokeDatabasePackageBindingSummary;
  contractsEndpoint?: string;
  healthEndpoint?: string;
  missingApiSkillIds: string[];
  noLiveSideEffectsAllFalse: boolean;
  productionReady: false;
  profileId?: string;
  routeCount: number;
  smokeCommand?: string;
  startCommand?: string;
  status?: string;
  traceHeaderName?: string;
}

export interface BackendRuntimeSmokeDatabasePackageBindingSummary {
  bindingId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  noLiveFlagsAllFalse: boolean;
  packageName?: string;
  packageRef?: string;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeSummary {
  activationId?: string;
  adminReviewRuntime: BackendRuntimeSmokeAdminReviewRuntimeSummary;
  authSessionFoundation: BackendRuntimeSmokeAuthSessionFoundationSummary;
  campaignDatabase: BackendRuntimeSmokeCampaignDatabaseSummary;
  checks: {
    contracts: BackendRuntimeSmokeCheck;
    health: BackendRuntimeSmokeCheck;
  };
  composition: BackendRuntimeSmokeCompositionSummary;
  host: string;
  durableLocalPersistence: BackendRuntimeSmokeDurableLocalPersistenceSummary;
  liveSideEffectsEnabled: boolean;
  analyticsIngestionRuntime: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary;
  contractWriterRuntime: BackendRuntimeSmokeContractWriterRuntimeSummary;
  objectStorageExportRuntime: BackendRuntimeSmokeObjectStorageExportRuntimeSummary;
  observabilityExporterFoundation: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation: BackendRuntimeSmokePersistenceFoundationSummary;
  productionBackendReadiness: BackendRuntimeSmokeProductionBackendReadinessSummary;
  providerClientReadiness: BackendRuntimeSmokeProviderClientReadinessSummary;
  port: number;
  projectOwnerFundingProofReviewBridge: BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary;
  productionDatabaseHandoffReadiness: BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary;
  rewardDistributionHandoffRuntime: BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary;
  futureProduction: string[];
  futureProductionBlockerIds: string[];
  mvpReleaseBlockerIds: string[];
  mvpReleaseReady: boolean;
  productionReady: boolean;
  providerIndexerFoundation: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  resourceCleanup: BackendRuntimeSmokeResourceCleanupSummary;
  requiredBeforeMvpRelease: string[];
  requiredBeforeProduction: string[];
  schedulerRuntimeFoundation: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  shutdownState: "running" | "stopping" | "stopped";
  status: "passed";
  taskTemplateCatalogRuntime: BackendRuntimeSmokeTaskTemplateCatalogRuntimeSummary;
  traceIds: {
    contracts: string;
    health: string;
  };
  url: string;
  workerIdempotencyStoreFoundation: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary;
  workerLeaseStoreFoundation: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary;
  workerSchedulerFoundation: BackendRuntimeSmokeWorkerSchedulerFoundationSummary;
}

export interface BackendRuntimeSmokeCompositionSummary {
  catalogDefaultDisabledCheckPassed: true;
  contractsCheckPassed: true;
  entrypointId: "campaign-os-backend-service";
  healthCheckPassed: true;
  routeCount: number;
}

export interface BackendRuntimeSmokeResourceCleanupSummary {
  activeRequestCount: 0;
  httpConnectionCount: 0;
  httpServerListening: false;
  shutdownState: "stopped";
}

export interface BackendRuntimeSmokeSafeOutput {
  composition: BackendRuntimeSmokeCompositionSummary;
  event: "backend_runtime_smoke.completed";
  providerVerification: {
    defaultEnabled: false;
    liveCallAttempted: false;
    productionProviderApproved: false;
    status: "disabled";
    transportProvided: false;
  };
  resources: BackendRuntimeSmokeResourceCleanupSummary;
  status: "passed";
  traceIds: BackendRuntimeSmokeSummary["traceIds"];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactObjectKeys = (
  record: Record<string, unknown> | undefined,
  expectedKeys: readonly string[],
) => {
  if (!record) {
    return false;
  }

  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return actualKeys.length === sortedExpectedKeys.length
    && actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
};

const readJson = async (response: Response): Promise<SmokePayload> => {
  const parsed = await response.json();

  return isRecord(parsed) ? parsed : {};
};

const readNestedRecord = (
  value: unknown,
  path: string[],
): Record<string, unknown> | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return isRecord(current) ? current : undefined;
};

const readPersistenceFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "persistenceFoundation"]);

const summarizeCampaignDatabase = (
  value: unknown,
): BackendRuntimeSmokeCampaignDatabaseSummary | undefined => {
  const record = readNestedRecord(value, ["campaignDatabase"]);

  if (!record) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    fallbackUsed: getBoolean(record, "fallbackUsed"),
    liveConnectionAttempted: getBoolean(record, "liveConnectionAttempted"),
    liveQueryExecutionEnabled: getBoolean(record, "liveQueryExecutionEnabled"),
    liveStorageExecutionEnabled: getBoolean(record, "liveStorageExecutionEnabled"),
    selectedMode: getString(record, "selectedMode"),
    status: getString(record, "status"),
  };
};

const readAuthSessionFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "authSessionFoundation"])
  ?? readNestedRecord(value, ["backendService", "authSession", "foundation"]);

const readProviderIndexerFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "providerIndexerFoundation"]);

const readProviderClientReadiness = (
  value: unknown,
): Record<string, unknown> | undefined => {
  const candidates = [
    readNestedRecord(value, ["backendService", "providerClientReadiness"]),
    readNestedRecord(value, ["backendService", "backendRuntimeBootstrap", "readiness", "providerClientReadiness"]),
    readNestedRecord(value, ["serverRuntime", "readiness", "providerClientReadiness"]),
  ];

  return candidates.find(hasProviderHttpEndpointRollout) ?? candidates.find((candidate) => candidate);
};

const hasProviderHttpEndpointRollout = (record: Record<string, unknown> | undefined): boolean =>
  readNestedRecord(record, ["providerHttpRuntime", "endpointRollout"]) !== undefined;

const readWorkerSchedulerFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerSchedulerFoundation"]);

const readQueueRuntimeFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "queueRuntimeFoundation"]);

const readSchedulerRuntimeFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "schedulerRuntimeFoundation"]);

const readWorkerLeaseStoreFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerLeaseStoreFoundation"]);

const readWorkerIdempotencyStoreFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerIdempotencyStoreFoundation"]);

const readObservabilityExporterFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "observabilityExporterFoundation"]);

const readObjectStorageExportRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "objectStorageExportRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "objectStorageExportRuntime"]);

const readAnalyticsIngestionRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "analyticsIngestionRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "analyticsIngestionRuntime"]);

const readContractWriterRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "contractWriterRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "contractWriterRuntime"]);

const readRewardDistributionHandoffRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "rewardDistributionHandoffRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "rewardDistributionHandoffRuntime"]);

const readProjectOwnerFundingProofReviewBridge = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "projectOwnerFundingProofReviewBridge"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "projectOwnerFundingProofReviewBridge"]);

const readProductionBackendReadiness = (
  value: unknown,
): Record<string, unknown> | undefined => {
  const readiness = readNestedRecord(value, ["productionBackendReadiness"]);

  if (!readiness) {
    return undefined;
  }

  const databasePackageBinding =
    readNestedRecord(readiness, ["databasePackageBinding"])
    ?? readNestedRecord(value, ["backendService", "databaseAdapterRuntime", "packageBinding"])
    ?? readNestedRecord(value, ["serverRuntime", "readiness", "databaseAdapterRuntime", "packageBinding"]);

  return {
    ...readiness,
    ...(databasePackageBinding ? { databasePackageBinding } : {}),
  };
};

const getNumber = (
  record: Record<string, unknown> | undefined,
  key: string,
): number => typeof record?.[key] === "number" ? record[key] : 0;

const getString = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => typeof record?.[key] === "string" ? record[key] : undefined;

const summarizeProductionBackendReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProductionBackendReadinessSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const deployHandoff = readNestedRecord(record, ["deployHandoff"]);
  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const profile = readNestedRecord(record, ["profile"]);
  const routeCoverage = readNestedRecord(record, ["routeCoverage"]);
  const tracePolicy = readNestedRecord(record, ["tracePolicy"]);
  const databasePackageBinding = summarizeDatabasePackageBinding(
    readNestedRecord(record, ["databasePackageBinding"]),
  );
  const noLiveSideEffectsAllFalse =
    noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).length > 0
    && Object.values(noLiveSideEffects).every((value) => value === false);

  return {
    contractsEndpoint: getString(deployHandoff, "contractsEndpoint"),
    databasePackageBinding,
    healthEndpoint: getString(deployHandoff, "healthEndpoint"),
    missingApiSkillIds: getStringArray(routeCoverage, "missingApiSkillIds"),
    noLiveSideEffectsAllFalse,
    productionReady: false,
    profileId: getString(profile, "id"),
    routeCount: getNumber(routeCoverage, "routeCount"),
    smokeCommand: getString(deployHandoff, "smokeCommand"),
    startCommand: getString(deployHandoff, "startCommand"),
    status: getString(record, "status"),
    traceHeaderName: getString(tracePolicy, "traceHeaderName"),
  };
};

const summarizeDatabasePackageBinding = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeDatabasePackageBindingSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const noLiveFlagsAllFalse =
    noLiveFlags !== undefined
    && Object.values(noLiveFlags).length > 0
    && Object.values(noLiveFlags).every((value) => value === false);
  const liveConnectionAttempted =
    record.liveConnectionAttempted === false || (record.liveConnectionAttempted === undefined
      && noLiveFlags?.liveConnectionAttempted === false);
  const liveContractWritesEnabled =
    record.liveContractWritesEnabled === false || (record.liveContractWritesEnabled === undefined
      && noLiveFlags?.liveContractWritesEnabled === false);
  const liveMigrationExecutionEnabled =
    record.liveMigrationExecutionEnabled === false || (record.liveMigrationExecutionEnabled === undefined
      && noLiveFlags?.liveMigrationExecutionEnabled === false);
  const liveProductionMutationEnabled =
    record.liveProductionMutationEnabled === false || (record.liveProductionMutationEnabled === undefined
      && noLiveFlags?.liveProductionMutationEnabled === false);
  const liveProviderCallsEnabled =
    record.liveProviderCallsEnabled === false || (record.liveProviderCallsEnabled === undefined
      && noLiveFlags?.liveProviderCallsEnabled === false);
  const liveQueryExecutionEnabled =
    record.liveQueryExecutionEnabled === false || (record.liveQueryExecutionEnabled === undefined
      && noLiveFlags?.liveQueryExecutionEnabled === false);
  const liveRewardCustodyEnabled =
    record.liveRewardCustodyEnabled === false || (record.liveRewardCustodyEnabled === undefined
      && noLiveFlags?.liveRewardCustodyEnabled === false);
  const liveRewardDistributionEnabled =
    record.liveRewardDistributionEnabled === false || (record.liveRewardDistributionEnabled === undefined
      && noLiveFlags?.liveRewardDistributionEnabled === false);
  const liveStorageWritesEnabled =
    record.liveStorageWritesEnabled === false || (record.liveStorageWritesEnabled === undefined
      && noLiveFlags?.liveStorageWritesEnabled === false);
  const liveTransactionExecutionEnabled =
    record.liveTransactionExecutionEnabled === false || (record.liveTransactionExecutionEnabled === undefined
      && noLiveFlags?.liveTransactionExecutionEnabled === false);

  if (
    !liveConnectionAttempted
    || !liveContractWritesEnabled
    || !liveMigrationExecutionEnabled
    || !liveProductionMutationEnabled
    || !liveProviderCallsEnabled
    || !liveQueryExecutionEnabled
    || !liveRewardCustodyEnabled
    || !liveRewardDistributionEnabled
    || !liveStorageWritesEnabled
    || !liveTransactionExecutionEnabled
  ) {
    return undefined;
  }

  return {
    bindingId: getString(record, "bindingId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    noLiveFlagsAllFalse,
    packageName: getString(record, "packageName"),
    packageRef: getString(record, "packageRef"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizePersistenceFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokePersistenceFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const migrationDryRun = readNestedRecord(record, ["migrationDryRun"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveConnectionAttempted")
    && isExplicitFalse(record, "liveMigrationExecutionEnabled")
    && isExplicitFalse(record, "liveQueryExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveConnectionAttempted: false,
    liveMigrationExecutionEnabled: false,
    liveQueryExecutionEnabled: false,
    migrationDryRunStatus: getString(migrationDryRun, "status"),
    productionReady: false,
    status: getString(record, "status"),
    storeCoverageCount: getNumber(record, "storeCoverageCount"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeAuthSessionFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeAuthSessionFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveSideEffectsEnabled")
    && isExplicitFalse(record, "liveSigningExecuted")
    && isExplicitFalse(record, "liveVerificationExecuted");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveSideEffectsEnabled: false,
    liveSigningExecuted: false,
    liveVerificationExecuted: false,
    productionReady: false,
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeObjectStorageExportRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeObjectStorageExportRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const safety = readNestedRecord(record, ["safety"]);
  const explicitNoLive =
    safety !== undefined
    && isExplicitFalse(safety, "downloadEnabled")
    && isExplicitFalse(safety, "liveUploadEnabled")
    && isExplicitFalse(safety, "objectKeyCreated")
    && isExplicitFalse(safety, "providerCallAttempted")
    && isExplicitFalse(safety, "signedUrlCreated")
    && safety.localReviewOnly === true
    && safety.manifestOnly === true;

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    downloadEnabled: false,
    localReviewOnly: true,
    manifestOnly: true,
    objectKeyCreated: false,
    productionReady: false,
    providerCallAttempted: false,
    providerStatus: getString(record, "providerStatus"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    signedUrlCreated: false,
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeAnalyticsIngestionRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const summary = readNestedRecord(record, ["summary"]);
  const warehouseHandoff = readNestedRecord(record, ["warehouseHandoff"]);
  const explicitNoLive =
    noLiveSideEffects !== undefined
    && isExplicitFalse(noLiveSideEffects, "liveAnalyticsSdkExecuted")
    && isExplicitFalse(noLiveSideEffects, "liveEventIngestionEnabled")
    && isExplicitFalse(noLiveSideEffects, "liveEventWarehouseWrite")
    && isExplicitFalse(warehouseHandoff, "eventWarehouseWriteAttempted")
    && isExplicitFalse(warehouseHandoff, "liveWarehouseWriteEnabled")
    && isExplicitFalse(warehouseHandoff, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    eventCatalogCount: getNumber(summary, "eventGroupCount"),
    liveAnalyticsSdkExecuted: false,
    liveEventIngestionEnabled: false,
    liveEventWarehouseWrite: false,
    metricLineageCount: getNumber(summary, "metricLineageCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(warehouseHandoff, "requiredConfigKeys"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
    warehouseStatus: getString(warehouseHandoff, "status"),
  };
};

const summarizeContractWriterRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeContractWriterRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const summary = readNestedRecord(record, ["summary"]);
  const configHandoff = readNestedRecord(record, ["configHandoff"]);
  const explicitNoLive =
    noLiveSideEffects !== undefined
    && isExplicitFalse(noLiveSideEffects, "liveContractWrite")
    && isExplicitFalse(noLiveSideEffects, "liveQueuePublishing")
    && isExplicitFalse(noLiveSideEffects, "liveRewardCustody")
    && isExplicitFalse(noLiveSideEffects, "liveRewardDistribution")
    && isExplicitFalse(noLiveSideEffects, "liveSignerExecution")
    && isExplicitFalse(noLiveSideEffects, "liveWalletSignature")
    && isExplicitFalse(configHandoff, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    configStatus: getString(configHandoff, "status"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveContractWrite: false,
    liveQueuePublishing: false,
    liveRewardCustody: false,
    liveRewardDistribution: false,
    liveSignerExecution: false,
    liveWalletSignature: false,
    operationCount: getNumber(summary, "operationCount"),
    operationGroupCount: getNumber(summary, "contractGroupCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(configHandoff, "requiredConfigKeys"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeProviderIndexerFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderIndexerFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const coverage = readNestedRecord(record, ["verificationSourceCoverage"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(noLiveFlags, "liveAiCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveAnalyticsIngestionEnabled")
    && isExplicitFalse(noLiveFlags, "liveContractCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveIndexerCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveObjectStorageEnabled")
    && isExplicitFalse(noLiveFlags, "liveProviderCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveSocialCallsEnabled")
    && isExplicitFalse(noLiveFlags, "workerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveAiCallsEnabled: false,
    liveAnalyticsIngestionEnabled: false,
    liveContractCallsEnabled: false,
    liveIndexerCallsEnabled: false,
    liveObjectStorageEnabled: false,
    liveProviderCallsEnabled: false,
    liveSocialCallsEnabled: false,
    productionReady: false,
    providerGroupCount: getNumber(record, "providerGroupCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
    verificationSourceCoverageCount: getNumber(coverage, "summaryCount"),
    workerExecutionEnabled: false,
  };
};

const summarizeProviderClientReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderClientReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const downstreamLiveFlags = readNestedRecord(record, ["downstreamLiveFlags"]);
  const providerHttpRuntime = summarizeProviderHttpRuntime(
    readNestedRecord(record, ["providerHttpRuntime"]),
  );
  const queueHandoff = readNestedRecord(record, ["queueHandoff"]);
  const registry = readNestedRecord(record, ["registry"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "providerClientsEnabled")
    && isExplicitFalse(record, "providerClientsProvided")
    && isExplicitFalse(record, "liveProviderCallsAttempted")
    && downstreamLiveFlags !== undefined
    && Object.values(downstreamLiveFlags).every((value) => value === false);

  if (!explicitNoLive || !providerHttpRuntime) {
    return undefined;
  }

  const providerGroups = getStringArray(record, "registryProviderGroups")
    .concat(getStringArray(registry, "providerGroups"));

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveProviderCallsAttempted: false,
    productionReady: false,
    providerHttpRuntime,
    providerClientsEnabled: false,
    providerClientsProvided: false,
    queueHandoffStatus: getString(queueHandoff, "consumeReadinessStatus"),
    registryClientCount: getNumber(record, "registryClientCount") || getNumber(registry, "clientCount"),
    registryProviderGroupCount: providerGroups.length,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeProviderHttpRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderHttpRuntimeSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const downstreamLiveFlags = readNestedRecord(record, ["downstreamLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveHttpCallsAttempted")
    && downstreamLiveFlags !== undefined
    && Object.values(downstreamLiveFlags).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    configuredCategories: getStringArray(record, "configuredCategories"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    endpointCount: getNumber(record, "endpointCount"),
    endpointRollout: summarizeEndpointRollout(readNestedRecord(record, ["endpointRollout"])),
    liveHttpCallsAttempted: false,
    productionReady: false,
    runtimeId: getString(record, "runtimeId") ?? getString(record, "id"),
    status: getString(record, "status"),
    transportProvided: getBoolean(record, "transportProvided"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeEndpointRollout = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderHttpRuntimeSummary["endpointRollout"] => ({
  blockedCount: getNumber(record, "blockedCount"),
  configuredCategories: getStringArray(record, "configuredCategories"),
  deferredCount: getNumber(record, "deferredCount"),
  diagnosticCodes: getStringArray(record, "diagnosticCodes"),
  disabledCount: getNumber(record, "disabledCount"),
  enabledCount: getNumber(record, "enabledCount"),
  endpointCount: getNumber(record, "endpointCount"),
  providerFamilies: getStringArray(record, "providerFamilies"),
  requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
  valid: getBoolean(record, "valid"),
});

const summarizeWorkerSchedulerFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerSchedulerFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const jobCatalogCoverage = readNestedRecord(record, ["jobCatalogCoverage"]);
  const schedulePolicyCoverage = readNestedRecord(record, ["schedulePolicyCoverage"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    jobCatalogCount: getNumber(jobCatalogCoverage, "jobCatalogCount"),
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    schedulePolicyCount: getNumber(schedulePolicyCoverage, "schedulePolicyCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeQueueRuntimeFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueRuntimeFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const providerAdapter = summarizeQueueProviderAdapter(
    readNestedRecord(record, ["providerAdapter"]),
  );
  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const liveQueueConsumptionDisabled = record.liveQueueConsumptionEnabled === undefined
    ? providerAdapter?.liveQueueConsumptionEnabled === false
    : isExplicitFalse(record, "liveQueueConsumptionEnabled");
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && liveQueueConsumptionDisabled
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  const liveQueuePublishingReadinessRecord = readNestedRecord(record, ["liveQueuePublishingReadiness"]);
  const liveQueuePublishingReadiness = liveQueuePublishingReadinessRecord
    ? summarizeQueuePublishingReadiness(liveQueuePublishingReadinessRecord)
    : summarizeQueuePublishingReadinessFromProviderAdapter(providerAdapter);
  const liveQueueConsumingReadinessRecord = readNestedRecord(record, ["liveQueueConsumingReadiness"]);
  const liveQueueConsumingReadiness = liveQueueConsumingReadinessRecord
    ? summarizeQueueConsumingReadiness(liveQueueConsumingReadinessRecord)
    : summarizeQueueConsumingReadinessFromProviderAdapter(providerAdapter);

  if (!providerAdapter || !liveQueuePublishingReadiness || !liveQueueConsumingReadiness) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    dryRunEnqueueEnabled: getBoolean(record, "dryRunEnqueueEnabled"),
    id: getString(record, "id"),
    liveCronExecutionEnabled: false,
    liveQueueConsumptionEnabled: false,
    liveQueueConsumingReadiness,
    liveQueuePublishingEnabled: false,
    liveQueuePublishingReadiness,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    providerAdapter,
    queuePlanCount: getNumber(record, "queuePlanCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeQueueConsumingReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "ackAttempted")
    && isExplicitFalse(record, "deadLetterAttempted")
    && isExplicitFalse(record, "liveConsumeAttempted")
    && isExplicitFalse(record, "liveQueueConsumptionEnabled")
    && isExplicitFalse(record, "nackAttempted")
    && isExplicitFalse(record, "retryScheduled")
    && noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    ackAttempted: false,
    blockerCount: getNumber(record, "blockerCount"),
    consumeAttemptPolicy: getString(record, "consumeAttemptPolicy"),
    consumeRequestEvaluated: getBoolean(record, "consumeRequestEvaluated"),
    consumeResultStatus: getString(record, "consumeResultStatus"),
    consumerId: getString(record, "consumerId"),
    consumerProvided: getBoolean(record, "consumerProvided"),
    deadLetterAttempted: false,
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    handlerRegistryProvided: getBoolean(record, "handlerRegistryProvided"),
    liveConsumeAttempted: false,
    liveQueueConsumptionEnabled: false,
    nackAttempted: false,
    noLiveSideEffects: noLiveSideEffects as Record<string, false>,
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    retryScheduled: false,
    status: getString(record, "status"),
  };
};

const summarizeQueueConsumingReadinessFromProviderAdapter = (
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined => {
  if (!providerAdapter) {
    return undefined;
  }

  return {
    activationStatus: providerAdapter.driverConsumingActivationStatus,
    ackAttempted: providerAdapter.driverConsumeAckAttempted,
    blockerCount: providerAdapter.driverConsumingBlockerCount,
    consumeAttemptPolicy: providerAdapter.driverConsumeAttemptPolicy,
    consumeRequestEvaluated: providerAdapter.driverConsumeRequestEvaluated,
    consumeResultStatus: providerAdapter.driverConsumeResultStatus,
    consumerId: providerAdapter.driverConsumingConsumerId,
    consumerProvided: providerAdapter.driverConsumingConsumerProvided,
    deadLetterAttempted: providerAdapter.driverConsumeDeadLetterAttempted,
    diagnosticCodes: providerAdapter.driverConsumeDiagnosticCodes,
    handlerRegistryProvided: providerAdapter.driverConsumingHandlerRegistryProvided,
    liveConsumeAttempted: providerAdapter.driverConsumingLiveConsumeAttempted,
    liveQueueConsumptionEnabled: providerAdapter.driverConsumingLiveQueueConsumptionEnabled,
    nackAttempted: providerAdapter.driverConsumeNackAttempted,
    noLiveSideEffects: providerAdapter.driverConsumingNoLiveSideEffects,
    productionReady: false,
    requiredConfigKeys: providerAdapter.driverConsumingRequiredConfigKeys,
    retryScheduled: providerAdapter.driverConsumeRetryScheduled,
    status: providerAdapter.driverConsumingStatus,
  };
};

const summarizeQueuePublishingReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "livePublishAttempted")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    livePublishAttempted: false,
    liveQueuePublishingEnabled: false,
    noLiveSideEffects: noLiveSideEffects as Record<string, false>,
    productionReady: false,
    publishAttemptPolicy: getString(record, "publishAttemptPolicy"),
    publishRequestEvaluated: getBoolean(record, "publishRequestEvaluated"),
    publishResultStatus: getString(record, "publishResultStatus"),
    publisherId: getString(record, "publisherId"),
    publisherProvided: getBoolean(record, "publisherProvided"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
  };
};

const summarizeQueuePublishingReadinessFromProviderAdapter = (
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined => {
  if (!providerAdapter) {
    return undefined;
  }

  return {
    activationStatus: providerAdapter.driverPublishingActivationStatus,
    blockerCount: providerAdapter.driverPublishingBlockerCount,
    diagnosticCodes: providerAdapter.driverPublishDiagnosticCodes,
    livePublishAttempted: providerAdapter.driverPublishingLivePublishAttempted,
    liveQueuePublishingEnabled: providerAdapter.driverPublishingLiveQueuePublishingEnabled,
    noLiveSideEffects: providerAdapter.driverPublishingNoLiveSideEffects,
    productionReady: false,
    publishAttemptPolicy: providerAdapter.driverPublishAttemptPolicy,
    publishRequestEvaluated: providerAdapter.driverPublishRequestEvaluated,
    publishResultStatus: providerAdapter.driverPublishResultStatus,
    publisherId: providerAdapter.driverPublishingPublisherId,
    publisherProvided: providerAdapter.driverPublishingPublisherProvided,
    requiredConfigKeys: providerAdapter.driverPublishingRequiredConfigKeys,
    status: providerAdapter.driverPublishingStatus,
  };
};

const summarizeQueueProviderAdapter = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueProviderAdapterSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "driverProductionReady")
    && isExplicitFalse(record, "driverLiveQueueConsumptionEnabled")
    && isExplicitFalse(record, "driverLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverConsumeAckAttempted")
    && isExplicitFalse(record, "driverConsumeDeadLetterAttempted")
    && isExplicitFalse(record, "driverConsumeNackAttempted")
    && isExplicitFalse(record, "driverConsumeRetryScheduled")
    && isExplicitFalse(record, "driverConsumingLiveConsumeAttempted")
    && isExplicitFalse(record, "driverConsumingLiveQueueConsumptionEnabled")
    && readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) !== undefined
    && Object.values(readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) ?? {}).every(
      (value) => value === false,
    )
    && isExplicitFalse(record, "driverPublishingLivePublishAttempted")
    && isExplicitFalse(record, "driverPublishingLiveQueuePublishingEnabled")
    && readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) !== undefined
    && Object.values(readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) ?? {}).every(
      (value) => value === false,
    )
    && isExplicitFalse(record, "driverSdkBindingProductionReady")
    && isExplicitFalse(record, "driverSdkBindingSdkClientConstructed")
    && isExplicitFalse(record, "driverSdkBindingLiveProviderCallAttempted")
    && isExplicitFalse(record, "driverSdkBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingBrowserBundleAllowed")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveBrokerConnectionAttempted")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingSdkClientConstructed")
    && isExplicitFalse(record, "liveQueueConsumptionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    driverActivationGateSatisfied: getBoolean(record, "driverActivationGateSatisfied"),
    driverBlockerCount: getNumber(record, "driverBlockerCount"),
    driverDiagnosticCodes: getStringArray(record, "driverDiagnosticCodes"),
    driverDisabledLiveOperationCount: getNumber(record, "driverDisabledLiveOperationCount"),
    driverId: getString(record, "driverId"),
    driverLiveQueueConsumptionEnabled: false,
    driverLiveQueuePublishingEnabled: false,
    driverLiveWorkerExecutionEnabled: false,
    driverMode: getString(record, "driverMode"),
    driverOperationCount: getNumber(record, "driverOperationCount"),
    driverProductionReady: false,
    driverProviderId: getString(record, "driverProviderId"),
    driverConsumeAckAttempted: false,
    driverConsumeAttemptPolicy: getString(record, "driverConsumeAttemptPolicy"),
    driverConsumeDeadLetterAttempted: false,
    driverConsumeDiagnosticCodes: getStringArray(record, "driverConsumeDiagnosticCodes"),
    driverConsumeNackAttempted: false,
    driverConsumeRequestEvaluated: getBoolean(record, "driverConsumeRequestEvaluated"),
    driverConsumeResultStatus: getString(record, "driverConsumeResultStatus"),
    driverConsumeRetryScheduled: false,
    driverConsumingActivationStatus: getString(record, "driverConsumingActivationStatus"),
    driverConsumingBlockerCount: getNumber(record, "driverConsumingBlockerCount"),
    driverConsumingConsumerId: getString(record, "driverConsumingConsumerId"),
    driverConsumingConsumerProvided: getBoolean(record, "driverConsumingConsumerProvided"),
    driverConsumingHandlerRegistryProvided: getBoolean(record, "driverConsumingHandlerRegistryProvided"),
    driverConsumingLiveConsumeAttempted: false,
    driverConsumingLiveQueueConsumptionEnabled: false,
    driverConsumingNoLiveSideEffects: readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) as Record<string, false>,
    driverConsumingProductionReady: false,
    driverConsumingRequiredConfigKeys: getStringArray(record, "driverConsumingRequiredConfigKeys"),
    driverConsumingStatus: getString(record, "driverConsumingStatus"),
    driverPublishAttemptPolicy: getString(record, "driverPublishAttemptPolicy"),
    driverPublishDiagnosticCodes: getStringArray(record, "driverPublishDiagnosticCodes"),
    driverPublishRequestEvaluated: getBoolean(record, "driverPublishRequestEvaluated"),
    driverPublishResultStatus: getString(record, "driverPublishResultStatus"),
    driverPublishingActivationStatus: getString(record, "driverPublishingActivationStatus"),
    driverPublishingBlockerCount: getNumber(record, "driverPublishingBlockerCount"),
    driverPublishingLivePublishAttempted: false,
    driverPublishingLiveQueuePublishingEnabled: false,
    driverPublishingNoLiveSideEffects: readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) as Record<string, false>,
    driverPublishingPublisherId: getString(record, "driverPublishingPublisherId"),
    driverPublishingPublisherProvided: getBoolean(record, "driverPublishingPublisherProvided"),
    driverPublishingRequiredConfigKeys: getStringArray(record, "driverPublishingRequiredConfigKeys"),
    driverPublishingStatus: getString(record, "driverPublishingStatus"),
    driverRequiredConfigKeys: getStringArray(record, "driverRequiredConfigKeys"),
    driverSdkBindingActivationGateSatisfied: getBoolean(record, "driverSdkBindingActivationGateSatisfied"),
    driverSdkBindingBlockerCount: getNumber(record, "driverSdkBindingBlockerCount"),
    driverSdkBindingDiagnosticCodes: getStringArray(record, "driverSdkBindingDiagnosticCodes"),
    driverSdkBindingDisabledLiveOperationCount: getNumber(record, "driverSdkBindingDisabledLiveOperationCount"),
    driverSdkBindingId: getString(record, "driverSdkBindingId"),
    driverSdkBindingLiveProviderCallAttempted: false,
    driverSdkBindingLiveQueuePublishingEnabled: false,
    driverSdkBindingLiveWorkerExecutionEnabled: false,
    driverSdkBindingMode: getString(record, "driverSdkBindingMode"),
    driverSdkBindingOperationCount: getNumber(record, "driverSdkBindingOperationCount"),
    driverSdkBindingPackageBindingBrokerConnectionBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBrokerConnectionBlockerCount"),
    driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes"),
    driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: getString(record, "driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode"),
    driverSdkBindingPackageBindingBrokerConnectionId: getString(record, "driverSdkBindingPackageBindingBrokerConnectionId"),
    driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: getStringArray(record, "driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys"),
    driverSdkBindingPackageBindingBrokerConnectionStatus: getString(record, "driverSdkBindingPackageBindingBrokerConnectionStatus"),
    driverSdkBindingPackageBindingBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBlockerCount"),
    driverSdkBindingPackageBindingBrowserBundleAllowed: false,
    driverSdkBindingPackageBindingBullmqConstructionAttempted: getBoolean(record, "driverSdkBindingPackageBindingBullmqConstructionAttempted"),
    driverSdkBindingPackageBindingBullmqConstructionBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBullmqConstructionBlockerCount"),
    driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes"),
    driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: getBoolean(record, "driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked"),
    driverSdkBindingPackageBindingBullmqConstructionId: getString(record, "driverSdkBindingPackageBindingBullmqConstructionId"),
    driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
    driverSdkBindingPackageBindingBullmqConstructionStatus: getString(record, "driverSdkBindingPackageBindingBullmqConstructionStatus"),
    driverSdkBindingPackageBindingDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingDiagnosticCodes"),
    driverSdkBindingPackageBindingFamily: getString(record, "driverSdkBindingPackageBindingFamily"),
    driverSdkBindingPackageBindingId: getString(record, "driverSdkBindingPackageBindingId"),
    driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
    driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
    driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
    driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    driverSdkBindingPackageBindingPackageName: getString(record, "driverSdkBindingPackageBindingPackageName"),
    driverSdkBindingPackageBindingPackageRef: getString(record, "driverSdkBindingPackageBindingPackageRef"),
    driverSdkBindingPackageBindingQueueClientConstructed: getBoolean(record, "driverSdkBindingPackageBindingQueueClientConstructed"),
    driverSdkBindingPackageBindingQueueEventsConstructed: getBoolean(record, "driverSdkBindingPackageBindingQueueEventsConstructed"),
    driverSdkBindingPackageBindingSdkClientConstructed: false,
    driverSdkBindingPackageBindingStatus: getString(record, "driverSdkBindingPackageBindingStatus"),
    driverSdkBindingPackageBindingWorkerConstructed: getBoolean(record, "driverSdkBindingPackageBindingWorkerConstructed"),
    driverSdkBindingProductionReady: false,
    driverSdkBindingProviderKind: getString(record, "driverSdkBindingProviderKind"),
    driverSdkBindingQueueRouteCount: getNumber(record, "driverSdkBindingQueueRouteCount"),
    driverSdkBindingRequiredConfigKeys: getStringArray(record, "driverSdkBindingRequiredConfigKeys"),
    driverSdkBindingSdkClientConstructed: false,
    driverSdkBindingSdkPackageRef: getString(record, "driverSdkBindingSdkPackageRef"),
    driverSdkBindingStatus: getString(record, "driverSdkBindingStatus"),
    driverSdkBindingValid: getBoolean(record, "driverSdkBindingValid"),
    driverStatus: getString(record, "driverStatus"),
    driverValid: getBoolean(record, "driverValid"),
    liveQueueConsumptionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    providerId: getString(record, "providerId"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeSchedulerRuntimeFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeSchedulerRuntimeFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveCronExecutionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    dryRunTriggerEnabled: getBoolean(record, "dryRunTriggerEnabled"),
    id: getString(record, "id"),
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    registrationCount: getNumber(record, "registrationCount"),
    scheduleIds: getStringArray(record, "scheduleIds"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeWorkerLeaseStoreFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    id: getString(record, "id"),
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    storeId: getString(record, "storeId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeWorkerIdempotencyStoreFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveIdempotencyExecutionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    id: getString(record, "id"),
    keySchemaVersion: getString(record, "keySchemaVersion"),
    liveIdempotencyExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    namespace: getString(record, "namespace"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    storeId: getString(record, "storeId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeObservabilityExporterFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeObservabilityExporterFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveAlertRoutingEnabled")
    && isExplicitFalse(record, "liveLogExportEnabled")
    && isExplicitFalse(record, "liveMetricsExportEnabled")
    && isExplicitFalse(record, "liveTelemetryExportEnabled")
    && isExplicitFalse(record, "liveTraceExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveAlertRoutingEnabled")
    && isExplicitFalse(noLiveFlags, "liveLogExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveMetricsExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveTelemetryExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveTraceExportEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    exporterId: getString(record, "exporterId"),
    id: getString(record, "id"),
    liveAlertRoutingEnabled: false,
    liveLogExportEnabled: false,
    liveMetricsExportEnabled: false,
    liveTelemetryExportEnabled: false,
    liveTraceExportEnabled: false,
    metricNamespace: getString(record, "metricNamespace"),
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    sinkId: getString(record, "sinkId"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeRewardDistributionHandoffRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const summary = readNestedRecord(record, ["summary"]);
  const evidenceHandoff = readNestedRecord(record, ["evidenceHandoff"]);
  const explicitNoLive =
    noLiveSideEffects !== undefined
    && isExplicitFalse(noLiveSideEffects, "liveClaim")
    && isExplicitFalse(noLiveSideEffects, "liveContractWrite")
    && isExplicitFalse(noLiveSideEffects, "livePayout")
    && isExplicitFalse(noLiveSideEffects, "liveProviderCall")
    && isExplicitFalse(noLiveSideEffects, "liveQueuePublishing")
    && isExplicitFalse(noLiveSideEffects, "liveRewardCustody")
    && isExplicitFalse(noLiveSideEffects, "liveRewardDistribution")
    && isExplicitFalse(noLiveSideEffects, "liveSchedulerExecution")
    && isExplicitFalse(noLiveSideEffects, "liveWalletSignature")
    && isExplicitFalse(noLiveSideEffects, "liveWorkerExecution")
    && isExplicitFalse(evidenceHandoff, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    evidenceStatus: getString(evidenceHandoff, "status"),
    itemCount: getNumber(summary, "itemCount"),
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
    missingEvidenceCount: getNumber(summary, "missingEvidenceCount"),
    productionReady: false,
    recipientCount: getNumber(summary, "recipientCount"),
    requiredEvidenceKeys: getStringArray(evidenceHandoff, "requiredEvidenceKeys"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeProjectOwnerFundingProofReviewBridge = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const safety = readNestedRecord(record, ["safety"]);
  const summary = readNestedRecord(record, ["summary"]);
  const proofPackage = readNestedRecord(record, ["proofPackage"]);
  const explicitNoLive =
    safety !== undefined
    && isExplicitFalse(safety, "liveContractWrite")
    && isExplicitFalse(safety, "liveFundingTransfer")
    && isExplicitFalse(safety, "liveObjectStorageWrite")
    && isExplicitFalse(safety, "liveProviderCall")
    && isExplicitFalse(safety, "liveQueuePublishing")
    && isExplicitFalse(safety, "liveRewardCustody")
    && isExplicitFalse(safety, "liveRewardDistribution")
    && isExplicitFalse(safety, "liveSchedulerExecution")
    && isExplicitFalse(safety, "liveWalletSignature")
    && isExplicitFalse(safety, "liveWorkerExecution")
    && isExplicitFalse(proofPackage, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockedItemCount: getNumber(summary, "blockedItemCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
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
    missingEvidenceCount: getStringArray(proofPackage, "missingEvidenceKeys").length,
    productionReady: false,
    proofPackageStatus: getString(proofPackage, "status"),
    readyItemCount: getNumber(summary, "readyItemCount"),
    requiredEvidenceKeys: getStringArray(record, "requiredEvidenceKeys"),
    requiredItemCount: getNumber(summary, "requiredItemCount"),
    reviewRequiredItemCount: getNumber(summary, "reviewRequiredItemCount"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
  };
};

const getRequiredReferenceKeys = (record: Record<string, unknown> | undefined) => {
  const references = Array.isArray(record?.requiredReferences)
    ? record.requiredReferences
    : [];

  return references
    .map((reference) =>
      isRecord(reference) && typeof reference.key === "string" ? reference.key : undefined)
    .filter((key): key is string => Boolean(key));
};

const summarizeProductionDatabaseHandoffReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady") || record.localMvpReady !== true) {
    return undefined;
  }

  const migrationGate = readNestedRecord(record, ["migrationGate"]);
  const packageBinding = readNestedRecord(record, ["packageBinding"]);
  const safety = readNestedRecord(record, ["safety"]);
  const summary = readNestedRecord(record, ["summary"]);
  const requiredReferenceKeys = getRequiredReferenceKeys(record);
  const noLiveFlagsAllFalse =
    safety !== undefined
    && Object.values(safety).length > 0
    && Object.values(safety).every((value) => value === false);
  const explicitNoLive =
    noLiveFlagsAllFalse
    && isExplicitFalse(safety, "dbClientConstructed")
    && isExplicitFalse(safety, "liveConnectionAttempted")
    && isExplicitFalse(safety, "liveContractWritesEnabled")
    && isExplicitFalse(safety, "liveMigrationExecutionEnabled")
    && isExplicitFalse(safety, "liveProductionMutationEnabled")
    && isExplicitFalse(safety, "liveProviderCallsEnabled")
    && isExplicitFalse(safety, "liveQueryExecutionEnabled")
    && isExplicitFalse(safety, "liveRewardCustodyEnabled")
    && isExplicitFalse(safety, "liveRewardDistributionEnabled")
    && isExplicitFalse(safety, "liveStorageWritesEnabled")
    && isExplicitFalse(safety, "liveTransactionExecutionEnabled")
    && isExplicitFalse(migrationGate, "liveExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    dbClientConstructed: false,
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    localMvpReady: true,
    migrationGateLiveExecutionEnabled: false,
    migrationGateStatus: getString(migrationGate, "status"),
    noLiveFlagsAllFalse,
    packageBindingId: getString(packageBinding, "bindingId"),
    packageName: getString(packageBinding, "packageName"),
    packageRef: getString(packageBinding, "packageRef"),
    productionReady: false,
    requiredReferenceCount: getNumber(summary, "requiredReferenceCount"),
    requiredReferenceKeys,
    status: getString(record, "status"),
    storeCoverageCount: getNumber(summary, "storeCoverageCount"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
  };
};

const createSmokeCheck = async ({
  baseUrl,
  endpoint,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  endpoint: BackendRuntimeSmokeCheck["endpoint"];
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<{
  activation?: Record<string, unknown>;
  check: BackendRuntimeSmokeCheck;
}> => {
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    headers: { "x-campaign-os-trace-id": traceId },
  });
  const payload = await readJson(response);
  const activation = endpoint === "/api/health"
    ? readNestedRecord(payload.data, ["backendService", "activation"])
    : readNestedRecord(payload.data, ["activation"]);
  const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);
  const authSessionFoundation = summarizeAuthSessionFoundation(
    readAuthSessionFoundation(payload.data),
  );
  const campaignDatabase = summarizeCampaignDatabase(payload.data);
  const persistenceFoundation = summarizePersistenceFoundation(
    readPersistenceFoundation(payload.data),
  );
  const providerIndexerFoundation = summarizeProviderIndexerFoundation(
    readProviderIndexerFoundation(payload.data),
  );
  const providerClientReadiness = summarizeProviderClientReadiness(
    readProviderClientReadiness(payload.data),
  );
  const workerSchedulerFoundation = summarizeWorkerSchedulerFoundation(
    readWorkerSchedulerFoundation(payload.data),
  );
  const queueRuntimeFoundation = summarizeQueueRuntimeFoundation(
    readQueueRuntimeFoundation(payload.data),
  );
  const schedulerRuntimeFoundation = summarizeSchedulerRuntimeFoundation(
    readSchedulerRuntimeFoundation(payload.data),
  );
  const workerLeaseStoreFoundation = summarizeWorkerLeaseStoreFoundation(
    readWorkerLeaseStoreFoundation(payload.data),
  );
  const workerIdempotencyStoreFoundation = summarizeWorkerIdempotencyStoreFoundation(
    readWorkerIdempotencyStoreFoundation(payload.data),
  );
  const observabilityExporterFoundation = summarizeObservabilityExporterFoundation(
    readObservabilityExporterFoundation(payload.data),
  );
  const objectStorageExportRuntime = summarizeObjectStorageExportRuntime(
    readObjectStorageExportRuntime(payload.data),
  );
  const analyticsIngestionRuntime = summarizeAnalyticsIngestionRuntime(
    readAnalyticsIngestionRuntime(payload.data),
  );
  const contractWriterRuntime = summarizeContractWriterRuntime(
    readContractWriterRuntime(payload.data),
  );
  const rewardDistributionHandoffRuntime = summarizeRewardDistributionHandoffRuntime(
    readRewardDistributionHandoffRuntime(payload.data),
  );
  const projectOwnerFundingProofReviewBridge = summarizeProjectOwnerFundingProofReviewBridge(
    readProjectOwnerFundingProofReviewBridge(payload.data),
  );
  const productionBackendReadiness = summarizeProductionBackendReadiness(
    readProductionBackendReadiness(payload.data),
  );

  return {
    activation,
    check: {
      activationPresent: Boolean(activation),
      analyticsIngestionRuntime,
      authSessionFoundation,
      campaignDatabase,
      contractWriterRuntime,
      deploymentHandoff,
      endpoint,
      ok: payload.ok === true && payload.traceId === traceId,
      objectStorageExportRuntime,
      observabilityExporterFoundation,
      persistenceFoundation,
      productionBackendReadiness,
      providerClientReadiness,
      providerIndexerFoundation,
      projectOwnerFundingProofReviewBridge,
      queueRuntimeFoundation,
      rewardDistributionHandoffRuntime,
      schedulerRuntimeFoundation,
      status: response.status,
      traceId: payload.traceId ?? "",
      workerIdempotencyStoreFoundation,
      workerLeaseStoreFoundation,
      workerSchedulerFoundation,
    },
  };
};

const createAnalyticsIngestionRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/analytics/ingestion-readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeAnalyticsIngestionRuntime(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const createContractWriterRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeContractWriterRuntimeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/contract-writer/readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeContractWriterRuntime(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const createRewardDistributionHandoffRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/reward-distribution/handoff-readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeRewardDistributionHandoffRuntime(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const createProjectOwnerFundingProofReviewBridgeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/reward-distribution/funding-proof-review`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeProjectOwnerFundingProofReviewBridge(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const productionDatabaseHandoffUnsafePattern =
  /postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|bearer\s+\S+|token=|password=|private[-_\s]?key|seed phrase|signed[-_\s]?url|object[-_\s]?key|\/Users\/|\/private\/|campaign-os-kitty|kitty-specs|\.kittify|stack trace/i;

const createProductionDatabaseHandoffReadinessSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/backend/production-database/handoff-readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeProductionDatabaseHandoffReadiness(readiness);
  const serializedPayload = JSON.stringify(payload);

  if (
    response.status !== 200
    || payload.ok !== true
    || payload.traceId !== traceId
    || !summary
    || productionDatabaseHandoffUnsafePattern.test(serializedPayload)
  ) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const disabledAdminReviewSmokeTraceId = "campaign-os-smoke-admin-review-disabled";
const disabledAdminReviewUnsafePattern =
  /postgres(?:ql)?:\/\/|bearer\s+\S+|password|private[-_\s]?key|seed phrase|token=|\/Users\/|\/private\/|campaign-os-kitty|kitty-specs|\.kittify|stack trace/i;

const createDisabledAdminReviewRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
}): Promise<BackendRuntimeSmokeAdminReviewRuntimeSummary | undefined> => {
  const endpoint = "/api/admin/campaigns" as const;
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    headers: { "x-campaign-os-trace-id": disabledAdminReviewSmokeTraceId },
  });
  const payload = await readJson(response);
  const error = isRecord(payload.error) ? payload.error : undefined;
  const message = getString(error, "message");
  const responseDataPresent = Object.prototype.hasOwnProperty.call(payload, "data");
  const safeEnvelope = hasExactObjectKeys(payload, ["error", "ok", "traceId"])
    && hasExactObjectKeys(error, ["code", "message"])
    && message !== undefined
    && message.length <= 256
    && !disabledAdminReviewUnsafePattern.test(JSON.stringify(payload));

  if (
    response.status !== 404
    || payload.ok !== false
    || payload.traceId !== disabledAdminReviewSmokeTraceId
    || response.headers.get("x-campaign-os-trace-id") !== disabledAdminReviewSmokeTraceId
    || !response.headers.get("content-type")?.startsWith("application/json")
    || getString(error, "code") !== "ROUTE_NOT_FOUND"
    || responseDataPresent
    || !safeEnvelope
  ) {
    return undefined;
  }

  return {
    coverage: "default_disabled_route",
    enabled: false,
    endpoint,
    errorCode: "ROUTE_NOT_FOUND",
    httpStatus: 404,
    responseDataPresent: false,
    routeExposed: false,
    safeEnvelope: true,
    status: "disabled",
    traceId: disabledAdminReviewSmokeTraceId,
  };
};

const taskTemplateCatalogSmokeTraceIds = Object.freeze({
  catalog: "campaign-os-smoke-task-template-catalog-disabled",
  shellHealth: "campaign-os-smoke-task-template-catalog-shell-health",
});
const taskTemplateCatalogSmokeOrigin = "http://127.0.0.1:5193";
const taskTemplateCatalogSmokeUnsafePattern =
  /postgres(?:ql)?:\/\/|bearer\s+\S+|password|private[-_\s]?key|seed phrase|token=|\/Users\/|\/private\/|campaign-os-kitty|kitty-specs|\.kittify|stack trace/i;

const createDisabledTaskTemplateCatalogRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
}): Promise<BackendRuntimeSmokeTaskTemplateCatalogRuntimeSummary | undefined> => {
  const endpoint = "/api/task-templates" as const;
  const catalogResponse = await fetchImpl(`${baseUrl}${endpoint}`, {
    headers: {
      cookie: "campaign_os_smoke_boundary=unissued",
      origin: taskTemplateCatalogSmokeOrigin,
      "x-campaign-os-trace-id": taskTemplateCatalogSmokeTraceIds.catalog,
    },
  });
  const catalogPayload = await readJson(catalogResponse);
  const catalogError = isRecord(catalogPayload.error) ? catalogPayload.error : undefined;
  const responseDataPresent = Object.prototype.hasOwnProperty.call(catalogPayload, "data");
  const safeEnvelope = hasExactObjectKeys(catalogPayload, ["error", "ok", "traceId"])
    && hasExactObjectKeys(catalogError, ["code", "field", "operation", "retryable"])
    && getString(catalogError, "field") === "runtime"
    && getString(catalogError, "operation") === "list"
    && catalogError?.retryable === true
    && !taskTemplateCatalogSmokeUnsafePattern.test(JSON.stringify(catalogPayload));

  const healthResponse = await fetchImpl(`${baseUrl}/api/health`, {
    headers: { "x-campaign-os-trace-id": taskTemplateCatalogSmokeTraceIds.shellHealth },
  });
  const healthPayload = await readJson(healthResponse);
  const shellHealthAvailable = healthResponse.status === 200
    && healthPayload.ok === true
    && healthPayload.traceId === taskTemplateCatalogSmokeTraceIds.shellHealth;

  if (
    catalogResponse.status !== 503
    || catalogPayload.ok !== false
    || catalogPayload.traceId !== taskTemplateCatalogSmokeTraceIds.catalog
    || catalogResponse.headers.get("x-trace-id") !== taskTemplateCatalogSmokeTraceIds.catalog
    || !catalogResponse.headers.get("content-type")?.startsWith("application/json")
    || getString(catalogError, "code") !== "TASK_TEMPLATE_CATALOG_UNAVAILABLE"
    || responseDataPresent
    || !safeEnvelope
    || !shellHealthAvailable
  ) {
    return undefined;
  }

  return {
    coverage: "default_disabled_fail_closed",
    enabled: false,
    endpoint,
    errorCode: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
    httpStatus: 503,
    responseDataPresent: false,
    routeExposed: true,
    safeEnvelope: true,
    shellHealthAvailable: true,
    status: "disabled",
    traceIds: taskTemplateCatalogSmokeTraceIds,
  };
};

const getBoolean = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === true;

const isExplicitFalse = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === false;

const getStringArray = (
  record: Record<string, unknown> | undefined,
  key: string,
): string[] => Array.isArray(record?.[key])
  ? record[key].filter((item): item is string => typeof item === "string")
  : [];

const liveWalletAuthenticationSmokeTraceIds = Object.freeze({
  challenge: "campaign-os-smoke-wallet-auth-challenge",
  currentSession: "campaign-os-smoke-wallet-auth-current",
  logout: "campaign-os-smoke-wallet-auth-logout",
  postLogoutSession: "campaign-os-smoke-wallet-auth-post-logout-session",
  session: "campaign-os-smoke-wallet-auth-session",
  verification: "campaign-os-smoke-wallet-auth-verification",
});

const liveWalletAuthenticationChallengeFields = Object.freeze([
  "adapterId",
  "challengeId",
  "chainId",
  "expiresAt",
  "message",
  "network",
  "version",
  "walletAddress",
]);

const liveWalletAuthenticationSessionFields = Object.freeze([
  "absoluteExpiresAt",
  "accountType",
  "capabilities",
  "chainId",
  "idleExpiresAt",
  "issuedAt",
  "network",
  "roles",
  "sessionId",
  "status",
  "walletAddress",
  "walletSource",
]);

const safeLiveWalletAuthenticationSmokeId = (value: unknown, maximum = 160): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const safeLiveWalletAuthenticationAudience = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 256
  && /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value);

const liveWalletAuthenticationSmokeBaseUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.username === ""
      && parsed.password === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      ? parsed.origin
      : undefined;
  } catch {
    return undefined;
  }
};

const liveWalletAuthenticationSmokeOrigin = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.username === ""
      && parsed.password === ""
      && parsed.origin === value
      ? value
      : undefined;
  } catch {
    return undefined;
  }
};

interface ParsedLiveWalletAuthenticationChallenge {
  readonly expiresAt: Date;
  readonly issuedAt: Date;
  readonly nonce: string;
}

const canonicalIsoInstant = (value: string): Date | undefined => {
  const parsed = new Date(value);

  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value
    ? parsed
    : undefined;
};

const readCanonicalChallengeLine = (
  lines: readonly string[],
  index: number,
  label: string,
): string | undefined => {
  const prefix = `${label}: `;
  const line = lines[index];

  return line?.startsWith(prefix) && line.length > prefix.length
    ? line.slice(prefix.length)
    : undefined;
};

const parseLiveWalletAuthenticationChallenge = ({
  adapterId,
  audience,
  caHash,
  chainId,
  expiresAt,
  message,
  network,
  now,
  origin,
  walletAddress,
}: Readonly<{
  adapterId: string;
  audience: string;
  caHash?: string;
  chainId: string;
  expiresAt: string;
  message: string;
  network: string;
  now: Date;
  origin: string;
  walletAddress: string;
}>): ParsedLiveWalletAuthenticationChallenge | undefined => {
  if (
    message.includes("\r")
    || Buffer.byteLength(message, "utf8") > WALLET_AUTHENTICATION_MESSAGE_MAX_BYTES
    || !Number.isFinite(now.getTime())
  ) {
    return undefined;
  }
  const lines = message.split("\n");
  if (lines.length !== 14 || lines[0] !== "aelf Campaign OS Wallet Authentication") {
    return undefined;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return undefined;
  }
  const version = readCanonicalChallengeLine(lines, 1, "Version");
  const domain = readCanonicalChallengeLine(lines, 2, "Domain");
  const uri = readCanonicalChallengeLine(lines, 3, "URI");
  const parsedAudience = readCanonicalChallengeLine(lines, 4, "Audience");
  const parsedWalletAddress = readCanonicalChallengeLine(lines, 5, "Wallet Address");
  const parsedAdapterId = readCanonicalChallengeLine(lines, 6, "Adapter");
  const parsedChainId = readCanonicalChallengeLine(lines, 7, "Chain ID");
  const parsedNetwork = readCanonicalChallengeLine(lines, 8, "Network");
  const parsedCaHash = readCanonicalChallengeLine(lines, 9, "CA Hash");
  const nonce = readCanonicalChallengeLine(lines, 10, "Nonce");
  const issuedAtText = readCanonicalChallengeLine(lines, 11, "Issued At");
  const expiresAtText = readCanonicalChallengeLine(lines, 12, "Expires At");
  const requestId = readCanonicalChallengeLine(lines, 13, "Request ID");
  const issuedAt = issuedAtText ? canonicalIsoInstant(issuedAtText) : undefined;
  const parsedExpiresAt = expiresAtText ? canonicalIsoInstant(expiresAtText) : undefined;

  if (
    version !== WALLET_AUTHENTICATION_PROTOCOL_VERSION
    || domain !== parsedOrigin.host
    || uri !== parsedOrigin.href
    || parsedAudience !== audience
    || parsedWalletAddress !== walletAddress
    || parsedAdapterId !== adapterId
    || parsedChainId !== chainId
    || parsedNetwork !== network
    || parsedCaHash !== (caHash ?? "-")
    || !nonce
    || !/^[A-Za-z0-9_-]{43}$/.test(nonce)
    || !requestId
    || !/^war_[A-Za-z0-9_-]{43}$/.test(requestId)
    || !issuedAt
    || !parsedExpiresAt
    || expiresAtText !== expiresAt
  ) {
    return undefined;
  }

  const ttlMs = parsedExpiresAt.getTime() - issuedAt.getTime();
  if (
    issuedAt.getTime() > now.getTime()
    || parsedExpiresAt.getTime() <= now.getTime()
    || ttlMs < WALLET_AUTH_CHALLENGE_TTL_SECONDS_MIN * 1_000
    || ttlMs > WALLET_AUTH_CHALLENGE_TTL_SECONDS_MAX * 1_000
  ) {
    return undefined;
  }

  return Object.freeze({ expiresAt: parsedExpiresAt, issuedAt, nonce });
};

interface ParsedSetCookie {
  readonly attributes: ReadonlyMap<string, string | true>;
  readonly name: string;
  readonly value: string;
}

const parseSetCookie = (value: string | null): ParsedSetCookie | undefined => {
  if (!value || value.length > 8_192 || /[\r\n\0]/.test(value)) {
    return undefined;
  }
  const segments = value.split(";");
  const cookiePair = segments.shift()?.trim();
  const separator = cookiePair?.indexOf("=") ?? -1;
  if (!cookiePair || separator <= 0) {
    return undefined;
  }
  const name = cookiePair.slice(0, separator);
  const cookieValue = cookiePair.slice(separator + 1);
  if (
    !/^[A-Za-z0-9_-]+$/.test(name)
    || !/^[A-Za-z0-9._~-]*$/.test(cookieValue)
    || cookiePair.length > 4_096
  ) {
    return undefined;
  }

  const attributes = new Map<string, string | true>();
  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) {
      return undefined;
    }
    const attributeSeparator = segment.indexOf("=");
    const rawName = attributeSeparator === -1
      ? segment
      : segment.slice(0, attributeSeparator).trim();
    const rawValue = attributeSeparator === -1
      ? true
      : segment.slice(attributeSeparator + 1).trim();
    const attributeName = rawName.toLowerCase();
    if (
      !/^[A-Za-z][A-Za-z0-9-]*$/.test(rawName)
      || attributes.has(attributeName)
      || (typeof rawValue === "string" && rawValue.length === 0)
    ) {
      return undefined;
    }
    attributes.set(attributeName, rawValue);
  }

  return Object.freeze({ attributes, name, value: cookieValue });
};

const requestCookieFromSetCookie = (
  value: string | null,
): Readonly<{ cookie: string; setCookie: ParsedSetCookie }> | undefined => {
  const parsed = parseSetCookie(value);

  return parsed && parsed.value.length > 0
    ? Object.freeze({ cookie: `${parsed.name}=${parsed.value}`, setCookie: parsed })
    : undefined;
};

const equivalentCookieScope = (
  issued: ReadonlyMap<string, string | true>,
  cleared: ReadonlyMap<string, string | true>,
): boolean => {
  const ignored = new Set(["expires", "max-age"]);
  const issuedScope = [...issued].filter(([key]) => !ignored.has(key));
  const clearedScope = [...cleared].filter(([key]) => !ignored.has(key));

  return issuedScope.length === clearedScope.length
    && issuedScope.every(([key, value]) => {
      const candidate = cleared.get(key);
      return key === "samesite"
        ? typeof value === "string"
          && typeof candidate === "string"
          && candidate.toLowerCase() === value.toLowerCase()
        : candidate === value;
    });
};

const validSessionClearCookie = (
  value: string | null,
  issued: ParsedSetCookie,
  now: Date,
): boolean => {
  const cleared = parseSetCookie(value);
  const expires = cleared?.attributes.get("expires");
  const expiresAt = typeof expires === "string" ? new Date(expires) : undefined;

  return Boolean(
    cleared
    && cleared.name === issued.name
    && cleared.value === ""
    && cleared.attributes.get("max-age") === "0"
    && expiresAt
    && Number.isFinite(expiresAt.getTime())
    && expiresAt.getTime() <= now.getTime()
    && equivalentCookieScope(issued.attributes, cleared.attributes),
  );
};

const liveWalletAuthenticationSubject = (
  session: Record<string, unknown>,
): Readonly<{
  accountType: string;
  chainId: string;
  network: string;
  walletAddress: string;
  walletSource: string;
}> | undefined => {
  const accountType = getString(session, "accountType");
  const chainId = getString(session, "chainId");
  const network = getString(session, "network");
  const walletAddress = getString(session, "walletAddress");
  const walletSource = getString(session, "walletSource");

  if (
    (accountType !== "AA" && accountType !== "EOA")
    || !safeLiveWalletAuthenticationSmokeId(chainId, 32)
    || (network !== "mainnet" && network !== "testnet")
    || !safeLiveWalletAuthenticationSmokeId(walletAddress, 256)
    || !safeLiveWalletAuthenticationSmokeId(walletSource, 64)
  ) {
    return undefined;
  }

  return Object.freeze({ accountType, chainId, network, walletAddress, walletSource });
};

const liveWalletAuthenticationSubjectDigest = (
  subject: NonNullable<ReturnType<typeof liveWalletAuthenticationSubject>>,
): string => createHash("sha256")
  .update(JSON.stringify([
    subject.accountType,
    subject.chainId,
    subject.network,
    subject.walletAddress,
    subject.walletSource,
  ]))
  .digest("hex");

const readLiveWalletAuthenticationSuccess = async (
  response: Response,
  expectedStatus: number,
  expectedTraceId: string,
): Promise<Record<string, unknown> | undefined> => {
  const payload = await readJson(response);

  return response.status === expectedStatus
    && payload.ok === true
    && payload.traceId === expectedTraceId
    && isRecord(payload.data)
    ? payload.data
    : undefined;
};

const readLiveWalletAuthenticationUnauthorized = async (
  response: Response,
  expectedTraceId: string,
): Promise<boolean> => {
  const payload = await readJson(response);
  const error = readNestedRecord(payload, ["error"]);

  return response.status === 401
    && response.headers.get("x-campaign-os-trace-id") === expectedTraceId
    && hasExactObjectKeys(payload, ["error", "ok", "traceId"])
    && payload.ok === false
    && payload.traceId === expectedTraceId
    && getString(error, "code") === "AUTH_SESSION_INVALID";
};

/**
 * Requires an API server already composed with the WP05 auth runtime/controller,
 * a ready M243 verification runtime, and a Campaign/task owned by the connected subject.
 */
export const runBackendRuntimeWalletAuthenticationSmoke = async ({
  adapterId,
  audience,
  baseUrl,
  campaignId,
  clock = { now: () => new Date() },
  fetchImpl = fetch,
  origin,
  taskId,
  walletClient,
}: BackendRuntimeWalletAuthenticationSmokeOptions): Promise<
  BackendRuntimeWalletAuthenticationSmokeSummary
> => {
  const resolvedBaseUrl = liveWalletAuthenticationSmokeBaseUrl(baseUrl);
  const resolvedOrigin = liveWalletAuthenticationSmokeOrigin(origin);
  if (
    !resolvedBaseUrl
    || !resolvedOrigin
    || !safeLiveWalletAuthenticationSmokeId(adapterId, 64)
    || !safeLiveWalletAuthenticationAudience(audience)
    || !safeLiveWalletAuthenticationSmokeId(campaignId)
    || !safeLiveWalletAuthenticationSmokeId(taskId)
    || typeof fetchImpl !== "function"
    || !walletClient
    || typeof walletClient.connect !== "function"
    || typeof walletClient.signMessage !== "function"
    || typeof walletClient.disconnect !== "function"
    || typeof walletClient.close !== "function"
    || !clock
    || typeof clock.now !== "function"
  ) {
    throw new BackendRuntimeWalletAuthenticationSmokeError("input");
  }

  let phase: BackendRuntimeWalletAuthenticationSmokePhase = "connect";
  let failure: BackendRuntimeWalletAuthenticationSmokeError | undefined;
  let summary: BackendRuntimeWalletAuthenticationSmokeSummary | undefined;

  try {
    const connection = await walletClient.connect(adapterId);
    if (
      connection.adapterId !== adapterId
      || !safeLiveWalletAuthenticationSmokeId(connection.walletAddressHint, 256)
      || !safeLiveWalletAuthenticationSmokeId(connection.chainId, 32)
      || (connection.network !== "mainnet" && connection.network !== "testnet")
      || (connection.caHashHint !== undefined
        && !/^[a-f0-9]{64}$/.test(connection.caHashHint))
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("connect");
    }

    phase = "challenge";
    const challengeResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/wallet/auth/challenges`,
      {
        body: JSON.stringify({
          adapterId: connection.adapterId,
          ...(connection.caHashHint === undefined ? {} : { caHash: connection.caHashHint }),
          chainId: connection.chainId,
          network: connection.network,
          walletAddress: connection.walletAddressHint,
        }),
        headers: {
          "content-type": "application/json",
          origin: resolvedOrigin,
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.challenge,
        },
        method: "POST",
      },
    );
    const challenge = await readLiveWalletAuthenticationSuccess(
      challengeResponse,
      201,
      liveWalletAuthenticationSmokeTraceIds.challenge,
    );
    const challengeId = getString(challenge, "challengeId");
    const message = getString(challenge, "message");
    const challengeExpiresAt = getString(challenge, "expiresAt");
    let challengeNow: Date;
    try {
      challengeNow = clock.now();
    } catch {
      throw new BackendRuntimeWalletAuthenticationSmokeError("challenge");
    }
    if (
      !hasExactObjectKeys(challenge, liveWalletAuthenticationChallengeFields)
      || getString(challenge, "adapterId") !== connection.adapterId
      || getString(challenge, "chainId") !== connection.chainId
      || getString(challenge, "network") !== connection.network
      || getString(challenge, "walletAddress") !== connection.walletAddressHint
      || getString(challenge, "version") !== WALLET_AUTHENTICATION_PROTOCOL_VERSION
      || !challengeId
      || !/^wac_[A-Za-z0-9_-]{43}$/.test(challengeId)
      || typeof challengeExpiresAt !== "string"
      || typeof message !== "string"
      || message.length === 0
      || !(challengeNow instanceof Date)
      || !Number.isFinite(challengeNow.getTime())
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("challenge");
    }
    const canonicalChallenge = parseLiveWalletAuthenticationChallenge({
      adapterId: connection.adapterId,
      audience,
      ...(connection.caHashHint === undefined ? {} : { caHash: connection.caHashHint }),
      chainId: connection.chainId,
      expiresAt: challengeExpiresAt,
      message,
      network: connection.network,
      now: challengeNow,
      origin: resolvedOrigin,
      walletAddress: connection.walletAddressHint,
    });
    if (!canonicalChallenge) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("challenge");
    }
    const { nonce } = canonicalChallenge;

    phase = "proof";
    const proof = await walletClient.signMessage({
      exactMessageBytes: Uint8Array.from(Buffer.from(message, "utf8")),
    });
    if (
      !(proof.signature instanceof Uint8Array)
      || proof.signature.byteLength === 0
      || (proof.publicKey !== undefined
        && (!(proof.publicKey instanceof Uint8Array) || proof.publicKey.byteLength === 0))
      || (proof.adapterProof !== undefined && !isRecord(proof.adapterProof))
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("proof");
    }

    phase = "session";
    const sessionResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/wallet/auth/sessions`,
      {
        body: JSON.stringify({
          ...(proof.adapterProof === undefined
            ? {}
            : { adapterProof: proof.adapterProof }),
          challengeId,
          message,
          nonce,
          ...(proof.publicKey === undefined
            ? {}
            : { publicKey: Buffer.from(proof.publicKey).toString("hex") }),
          signature: Buffer.from(proof.signature).toString("hex"),
        }),
        headers: {
          "content-type": "application/json",
          origin: resolvedOrigin,
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.session,
        },
        method: "POST",
      },
    );
    const sessionData = await readLiveWalletAuthenticationSuccess(
      sessionResponse,
      201,
      liveWalletAuthenticationSmokeTraceIds.session,
    );
    const session = readNestedRecord(sessionData, ["session"]);
    const csrfToken = getString(sessionData, "csrfToken");
    const issuedCookie = requestCookieFromSetCookie(sessionResponse.headers.get("set-cookie"));
    const subject = session ? liveWalletAuthenticationSubject(session) : undefined;
    const roles = getStringArray(session, "roles");
    const capabilities = getStringArray(session, "capabilities");
    const sessionId = getString(session, "sessionId");
    if (
      !hasExactObjectKeys(sessionData, ["csrfToken", "session"])
      || !hasExactObjectKeys(session, liveWalletAuthenticationSessionFields)
      || !csrfToken
      || csrfToken.length < 32
      || csrfToken.length > 512
      || !issuedCookie
      || !subject
      || subject.chainId !== connection.chainId
      || subject.network !== connection.network
      || subject.walletAddress !== connection.walletAddressHint
      || !roles.includes("participant")
      || !capabilities.includes("task:verify")
      || !safeLiveWalletAuthenticationSmokeId(sessionId)
      || session?.status !== "active"
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("session");
    }
    const { cookie } = issuedCookie;
    const subjectDigest = liveWalletAuthenticationSubjectDigest(subject);
    const protectedHeaders = {
      cookie,
      origin: resolvedOrigin,
      "x-campaign-os-csrf": csrfToken,
    };

    phase = "task_verification";
    const verificationResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/tasks/${encodeURIComponent(taskId)}/verify`,
      {
        body: JSON.stringify({ campaignId }),
        headers: {
          ...protectedHeaders,
          "content-type": "application/json",
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.verification,
        },
        method: "POST",
      },
    );
    const verificationData = await readLiveWalletAuthenticationSuccess(
      verificationResponse,
      200,
      liveWalletAuthenticationSmokeTraceIds.verification,
    );
    const verification = readNestedRecord(verificationData, ["payload"]);
    if (
      !verification
      || getString(verification, "outcome") !== "completed"
      || getString(verification, "status") !== "completed"
      || !safeLiveWalletAuthenticationSmokeId(
        getString(verification, "verificationAttemptId"),
      )
      || typeof verification.pointsAwarded !== "number"
      || !Number.isFinite(verification.pointsAwarded)
      || verification.pointsAwarded < 0
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("task_verification");
    }

    phase = "current_session";
    const currentResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/wallet/auth/session`,
      {
        headers: {
          cookie,
          origin: resolvedOrigin,
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.currentSession,
        },
        method: "GET",
      },
    );
    const currentData = await readLiveWalletAuthenticationSuccess(
      currentResponse,
      200,
      liveWalletAuthenticationSmokeTraceIds.currentSession,
    );
    const currentSession = readNestedRecord(currentData, ["session"]);
    const currentSubject = currentSession
      ? liveWalletAuthenticationSubject(currentSession)
      : undefined;
    if (
      !hasExactObjectKeys(currentData, ["csrfToken", "session"])
      || !hasExactObjectKeys(currentSession, liveWalletAuthenticationSessionFields)
      || !currentSubject
      || liveWalletAuthenticationSubjectDigest(currentSubject) !== subjectDigest
      || getString(currentSession, "sessionId") !== sessionId
      || getString(currentData, "csrfToken") !== csrfToken
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("current_session");
    }

    phase = "logout";
    const logoutResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/wallet/auth/logout`,
      {
        headers: {
          ...protectedHeaders,
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.logout,
        },
        method: "POST",
      },
    );
    const logoutData = await readLiveWalletAuthenticationSuccess(
      logoutResponse,
      200,
      liveWalletAuthenticationSmokeTraceIds.logout,
    );
    let logoutNow: Date;
    try {
      logoutNow = clock.now();
    } catch {
      throw new BackendRuntimeWalletAuthenticationSmokeError("logout");
    }
    if (
      !hasExactObjectKeys(logoutData, ["revoked"])
      || logoutData?.revoked !== true
      || !(logoutNow instanceof Date)
      || !Number.isFinite(logoutNow.getTime())
      || !validSessionClearCookie(
        logoutResponse.headers.get("set-cookie"),
        issuedCookie.setCookie,
        logoutNow,
      )
    ) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("logout");
    }

    phase = "post_logout_session";
    const postLogoutResponse = await fetchImpl(
      `${resolvedBaseUrl}/api/wallet/auth/session`,
      {
        headers: {
          cookie,
          origin: resolvedOrigin,
          "x-campaign-os-trace-id": liveWalletAuthenticationSmokeTraceIds.postLogoutSession,
        },
        method: "GET",
      },
    );
    if (!await readLiveWalletAuthenticationUnauthorized(
      postLogoutResponse,
      liveWalletAuthenticationSmokeTraceIds.postLogoutSession,
    )) {
      throw new BackendRuntimeWalletAuthenticationSmokeError("post_logout_session");
    }

    phase = "cleanup";
    await walletClient.disconnect();
    summary = Object.freeze({
      canonicalSubjectContinuity: true as const,
      credentialAuthority: "durable_cookie" as const,
      proofPort: "wallet_client" as const,
      status: "passed" as const,
      subjectDigest,
      traceIds: liveWalletAuthenticationSmokeTraceIds,
      verificationBodyFields: Object.freeze(["campaignId"] as const),
    });
  } catch (error) {
    failure = error instanceof BackendRuntimeWalletAuthenticationSmokeError
      ? error
      : new BackendRuntimeWalletAuthenticationSmokeError(phase);
  }

  try {
    await walletClient.close();
  } catch {
    failure ??= new BackendRuntimeWalletAuthenticationSmokeError("cleanup");
  }

  if (failure) {
    throw failure;
  }
  if (!summary) {
    throw new BackendRuntimeWalletAuthenticationSmokeError("cleanup");
  }

  return summary;
};

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

const rewardReleaseScopeBlockerIds = ["reward-custody", "reward-distribution"];

const includesAllRewardReleaseScopeBlockers = (ids: readonly string[]) =>
  rewardReleaseScopeBlockerIds.every((id) => ids.includes(id));

const excludesRewardReleaseScopeBlockers = (ids: readonly string[]) =>
  rewardReleaseScopeBlockerIds.every((id) => !ids.includes(id));

const isReleaseScopeSmokeReady = (
  activation: Record<string, unknown> | undefined,
  deploymentHandoff: Record<string, unknown> | undefined,
): boolean => {
  const mvpReleaseBlockerIds = getStringArray(activation, "mvpReleaseBlockerIds");
  const futureProductionBlockerIds = getStringArray(activation, "futureProductionBlockerIds");
  const requiredBeforeMvpRelease = getStringArray(deploymentHandoff, "requiredBeforeMvpRelease");
  const futureProduction = getStringArray(deploymentHandoff, "futureProduction");

  return getBoolean(activation, "mvpReleaseReady")
    && excludesRewardReleaseScopeBlockers(mvpReleaseBlockerIds)
    && excludesRewardReleaseScopeBlockers(requiredBeforeMvpRelease)
    && includesAllRewardReleaseScopeBlockers(futureProductionBlockerIds)
    && includesAllRewardReleaseScopeBlockers(futureProduction);
};

const durableLocalSmokeTraceIds = {
  campaignDraft: "campaign-os-smoke-durable-campaign-draft",
  exportPreview: "campaign-os-smoke-durable-export-preview",
  firstHealth: "campaign-os-smoke-durable-health-first",
  restartedHealth: "campaign-os-smoke-durable-health-restarted",
  taskDraft: "campaign-os-smoke-durable-task-draft",
  verification: "campaign-os-smoke-durable-verification",
  walletSession: "campaign-os-smoke-durable-wallet-session",
} as const;
const durableLocalSmokeCampaignId = "campaign-db-draft-0001";
const durableLocalPreviewAuthority = createDeprecatedNonLivePreviewAuthorityOption();

interface DurableLocalParticipantSession {
  accountType: string;
  headers: Record<string, string>;
  recordKind: string;
  walletAddress: string;
  walletSource: string;
}

interface DurableLocalSmokeWriteResult {
  data: Record<string, unknown>;
  kind: string;
}

const withDurableLocalPersistenceEnv = async (
  env: Record<string, string | undefined> | undefined,
): Promise<{
  cleanupDir?: string;
  env: Record<string, string | undefined>;
}> => {
  if (env?.CAMPAIGN_OS_PERSISTENCE_DIR) {
    return {
      env: {
        ...env,
        CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: durableLocalSmokeCampaignId,
        CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
      },
    };
  }

  const cleanupDir = await mkdtemp(join(tmpdir(), "campaign-os-smoke-local-json-"));

  return {
    cleanupDir,
    env: {
      ...env,
      CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS: durableLocalSmokeCampaignId,
      CAMPAIGN_OS_PERSISTENCE_DIR: cleanupDir,
      CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
    },
  };
};

const removeGeneratedPersistenceDir = async (cleanupDir: string | undefined): Promise<void> => {
  if (cleanupDir) {
    await rm(cleanupDir, { force: true, recursive: true });
  }
};

const getBackendRuntimeConnectionCount = (
  server: CampaignOsApiServerHandle,
): Promise<number> =>
  new Promise((resolve, reject) => {
    server.server.getConnections((error, count) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(count);
    });
  });

const stopAndAssertBackendRuntimeResourcesReleased = async (
  server: CampaignOsApiServerHandle,
): Promise<BackendRuntimeSmokeResourceCleanupSummary> => {
  await server.stop();

  const httpConnectionCount = await getBackendRuntimeConnectionCount(server);
  const shutdownState = server.getReadiness().shutdownState;

  if (
    server.server.listening
    || httpConnectionCount !== 0
    || shutdownState.activeRequestCount !== 0
    || shutdownState.state !== "stopped"
  ) {
    throw new BackendRuntimeSmokeCleanupError(1);
  }

  return {
    activeRequestCount: 0,
    httpConnectionCount: 0,
    httpServerListening: false,
    shutdownState: "stopped",
  };
};

const readPersistenceHealth = (payload: SmokePayload): Record<string, unknown> | undefined =>
  readNestedRecord(payload.data, ["persistence"]);

const requirePersistenceHealth = (
  payload: SmokePayload,
  traceId: string,
): Record<string, unknown> => {
  if (payload.ok !== true || payload.traceId !== traceId) {
    throw new Error("Campaign OS durable local persistence smoke check failed.");
  }

  const persistence = readPersistenceHealth(payload);

  if (!persistence) {
    throw new Error("Campaign OS durable local persistence health metadata is missing.");
  }

  return persistence;
};

const issueDurableLocalParticipantSession = async ({
  baseUrl,
  fetchImpl,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
}): Promise<DurableLocalParticipantSession> => {
  const response = await fetchImpl(`${baseUrl}/api/wallet/session`, {
    body: JSON.stringify({
      adapterName: "PortkeyAAWallet",
      fixtureId: "sess-aa-001",
      nonce: "campaign-os-smoke-durable-participant",
      proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
      proofIssuedAt: "2026-07-07T03:59:00.000Z",
    }),
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": durableLocalSmokeTraceIds.walletSession,
    },
    method: "POST",
  });
  const payload = await readJson(response);
  const persistence = readNestedRecord(payload.data, ["persistence"]);
  const session = readNestedRecord(payload.data, ["payload"]);
  const issuer = readNestedRecord(session, ["issuer"]);
  const proof = readNestedRecord(session, ["proof"]);
  const accountType = getString(session, "accountType");
  const recordKind = getString(persistence, "kind");
  const sessionId = getString(session, "sessionId");
  const walletAddress = getString(session, "address");
  const walletSource = getString(session, "walletSource");
  const capabilities = Array.isArray(session?.capabilities)
    ? session.capabilities.filter((capability): capability is string => typeof capability === "string")
    : [];

  if (
    response.status !== 200
    || payload.ok !== true
    || payload.traceId !== durableLocalSmokeTraceIds.walletSession
    || !accountType
    || !recordKind
    || !sessionId
    || !walletAddress
    || !walletSource
    || proof?.status !== "verified"
    || issuer?.valid !== true
    || walletSource === "AGENT_SKILL"
    || capabilities.includes("INTERNAL_AUTOMATION")
  ) {
    throw new Error("Campaign OS durable local Participant session smoke check failed.");
  }

  return {
    accountType,
    headers: {
      "x-campaign-os-account-type": accountType,
      "x-campaign-os-credential-boundary": "ordinary_user_wallet",
      "x-campaign-os-proof-status": "verified",
      "x-campaign-os-roles": "participant",
      "x-campaign-os-session-id": sessionId,
      "x-campaign-os-wallet-address": walletAddress,
      "x-campaign-os-wallet-source": walletSource,
    },
    recordKind,
    walletAddress,
    walletSource,
  };
};

const postDurableLocalSmokeRecord = async ({
  baseUrl,
  body,
  fetchImpl,
  path,
  traceId,
  trustedHeaders,
}: {
  baseUrl: string;
  body: Record<string, unknown>;
  fetchImpl: typeof fetch;
  path: string;
  traceId: string;
  trustedHeaders?: Record<string, string>;
}): Promise<DurableLocalSmokeWriteResult> => {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...trustedHeaders,
      "x-campaign-os-trace-id": traceId,
    },
    method: "POST",
  });
  const payload = await readJson(response);
  const data = isRecord(payload.data) ? payload.data : undefined;
  const persistence = readNestedRecord(payload.data, ["persistence"]);
  const kind = getString(persistence, "kind");

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !data || !kind) {
    throw new Error("Campaign OS durable local persistence write smoke check failed.");
  }

  return { data, kind };
};

const assertDeprecatedDurableLocalVerificationAuthorityRejected = async ({
  baseUrl,
  body,
  fetchImpl,
  path,
  traceId,
  trustedHeaders,
}: {
  baseUrl: string;
  body: Record<string, unknown>;
  fetchImpl: typeof fetch;
  path: string;
  traceId: string;
  trustedHeaders: Record<string, string>;
}): Promise<void> => {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...trustedHeaders,
      "x-campaign-os-trace-id": traceId,
    },
    method: "POST",
  });
  const payload = await readJson(response);
  const error = isRecord(payload.error) ? payload.error : undefined;
  const details = readNestedRecord(error, ["details"]);

  if (
    response.status !== 400
    || payload.ok !== false
    || payload.traceId !== traceId
    || getString(error, "code") !== "INVALID_REQUEST"
    || getString(details, "diagnosticCode") !== "INVALID_REQUEST"
    || getString(details, "field") !== "headers"
  ) {
    throw new Error("Campaign OS deprecated verification authority smoke check failed.");
  }
};

const readDurableHealth = async (
  baseUrl: string,
  fetchImpl: typeof fetch,
  traceId: string,
): Promise<Record<string, unknown>> => {
  const response = await fetchImpl(`${baseUrl}/api/health`, {
    headers: { "x-campaign-os-trace-id": traceId },
  });
  const payload = await readJson(response);

  if (response.status !== 200) {
    throw new Error("Campaign OS durable local persistence health smoke check failed.");
  }

  return requirePersistenceHealth(payload, traceId);
};

const latestRecordKinds = (
  persistence: Record<string, unknown>,
): string[] => Array.isArray(persistence.latestRecords)
  ? persistence.latestRecords
    .filter(isRecord)
    .map((record) => getString(record, "kind"))
    .filter((kind): kind is string => typeof kind === "string")
  : [];

const countsByKind = (
  persistence: Record<string, unknown>,
): Record<string, number> => {
  const counts = readNestedRecord(persistence, ["countsByKind"]) ?? {};

  return Object.fromEntries(
    Object.entries(counts)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
};

const assertDurableLocalPersistenceHealth = (
  persistence: Record<string, unknown>,
  expectedRecordCount: number,
) => {
  const expectedKinds = [
    "wallet_session",
    "campaign_draft",
    "task_draft",
    "export_preview",
  ];

  if (
    getString(persistence, "mode") !== "local_json"
    || persistence.durable !== true
    || persistence.localOnly !== true
    || persistence.noMigrationRunner !== true
    || persistence.noProductionDatabase !== true
    || persistence.noSecretHandling !== true
    || getNumber(persistence, "recordCount") < expectedRecordCount
  ) {
    throw new Error("Campaign OS durable local persistence health smoke check failed.");
  }

  const currentCounts = countsByKind(persistence);
  const currentLatestKinds = latestRecordKinds(persistence);
  const hasExpectedKinds = expectedKinds.every(
    (kind) => (currentCounts[kind] ?? 0) >= 1 && currentLatestKinds.includes(kind),
  );

  if (!hasExpectedKinds) {
    throw new Error("Campaign OS durable local persistence restart records are incomplete.");
  }
};

const runDurableLocalPersistenceSmoke = async ({
  env,
  fetchImpl,
  host,
  server,
  shutdownTimeoutMs,
}: {
  env: Record<string, string | undefined>;
  fetchImpl: typeof fetch;
  host: string;
  server: CampaignOsApiServerHandle;
  shutdownTimeoutMs?: number;
}): Promise<BackendRuntimeSmokeDurableLocalPersistenceSummary> => {
  const participantSession = await issueDurableLocalParticipantSession({
    baseUrl: server.url,
    fetchImpl,
  });
  const projectOwnerHeaders = {
    ...participantSession.headers,
    "x-campaign-os-roles": "project_owner",
  };
  const campaignDraft = await postDurableLocalSmokeRecord({
    baseUrl: server.url,
    body: {
      duration: "2026-07-01/2026-07-14",
      endTime: "2026-07-14T23:59:59Z",
      goal: "Exercise the durable Participant Campaign journey",
      ownerAddress: participantSession.walletAddress,
      projectId: "campaign-os-smoke-durable-project",
      rewardDescription: "Durable smoke rewards remain local-review only.",
      startTime: "2026-07-01T00:00:00Z",
    },
    fetchImpl,
    path: "/api/campaigns",
    traceId: durableLocalSmokeTraceIds.campaignDraft,
    trustedHeaders: projectOwnerHeaders,
  });
  const campaignId = getString(readNestedRecord(campaignDraft.data, ["payload"]), "id");

  if (campaignId !== durableLocalSmokeCampaignId) {
    throw new Error("Campaign OS durable local Campaign smoke check failed.");
  }

  const taskDraft = await postDurableLocalSmokeRecord({
    baseUrl: server.url,
    body: {
      evidenceRule: { minAmount: 1, source: "AELFSCAN" },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    },
    fetchImpl,
    path: `/api/campaigns/${campaignId}/tasks`,
    traceId: durableLocalSmokeTraceIds.taskDraft,
    trustedHeaders: projectOwnerHeaders,
  });
  const taskId = getString(readNestedRecord(taskDraft.data, ["campaignDbTask"]), "taskId");

  if (!taskId) {
    throw new Error("Campaign OS durable local Task smoke check failed.");
  }

  await assertDeprecatedDurableLocalVerificationAuthorityRejected({
    baseUrl: server.url,
    body: { campaignId },
    fetchImpl,
    path: `/api/tasks/${taskId}/verify`,
    traceId: durableLocalSmokeTraceIds.verification,
    trustedHeaders: participantSession.headers,
  });
  const exportPreview = await postDurableLocalSmokeRecord({
    baseUrl: server.url,
    body: {
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    },
    fetchImpl,
    path: `/api/campaigns/${campaignId}/export`,
    traceId: durableLocalSmokeTraceIds.exportPreview,
  });
  const wroteRecordKinds = [
    participantSession.recordKind,
    campaignDraft.kind,
    taskDraft.kind,
    exportPreview.kind,
  ];
  const firstPersistence = await readDurableHealth(
    server.url,
    fetchImpl,
    durableLocalSmokeTraceIds.firstHealth,
  );

  assertDurableLocalPersistenceHealth(firstPersistence, 4);
  await stopAndAssertBackendRuntimeResourcesReleased(server);

  const restartedServer = await startCampaignOsApiServer({
    deprecatedNonLivePreviewAuthority: durableLocalPreviewAuthority,
    env,
    host,
    logger: false,
    port: 0,
    shutdownTimeoutMs,
  });

  try {
    const restartedPersistence = await readDurableHealth(
      restartedServer.url,
      fetchImpl,
      durableLocalSmokeTraceIds.restartedHealth,
    );

    assertDurableLocalPersistenceHealth(restartedPersistence, getNumber(firstPersistence, "recordCount"));

    return {
      adapterLabel: getString(restartedPersistence, "adapterLabel"),
      countsByKind: countsByKind(restartedPersistence),
      durable: true,
      latestRecordKinds: latestRecordKinds(restartedPersistence),
      localOnly: true,
      mode: "local_json",
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
      recordCount: getNumber(firstPersistence, "recordCount"),
      restartedRecordCount: getNumber(restartedPersistence, "recordCount"),
      status: "passed",
      traceIds: durableLocalSmokeTraceIds,
      wroteRecordKinds,
    };
  } finally {
    await stopAndAssertBackendRuntimeResourcesReleased(restartedServer);
  }
};

const isPersistenceFoundationSmokeReady = (
  summary: BackendRuntimeSmokePersistenceFoundationSummary | undefined,
): summary is BackendRuntimeSmokePersistenceFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveConnectionAttempted === false
    && summary.liveMigrationExecutionEnabled === false
    && summary.liveQueryExecutionEnabled === false
    && summary.storeCoverageCount >= 6
    && summary.blockerCount > 0
    && summary.diagnosticCodes.length > 0;
};

const isAuthSessionFoundationSmokeReady = (
  summary: BackendRuntimeSmokeAuthSessionFoundationSummary | undefined,
): summary is BackendRuntimeSmokeAuthSessionFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveSideEffectsEnabled === false
    && summary.liveSigningExecuted === false
    && summary.liveVerificationExecuted === false
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isObjectStorageExportRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeObjectStorageExportRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeObjectStorageExportRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.downloadEnabled === false
    && summary.objectKeyCreated === false
    && summary.providerCallAttempted === false
    && summary.signedUrlCreated === false
    && summary.localReviewOnly === true
    && summary.manifestOnly === true
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF")
    && summary.diagnosticCodes.includes("OBJECT_STORAGE_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.valid === true;
};

const isAnalyticsIngestionRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveAnalyticsSdkExecuted === false
    && summary.liveEventIngestionEnabled === false
    && summary.liveEventWarehouseWrite === false
    && summary.eventCatalogCount >= 9
    && summary.metricLineageCount >= 9
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_ANALYTICS_APPROVAL_REF")
    && summary.diagnosticCodes.includes("ANALYTICS_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.valid === true
    && summary.warehouseStatus === "missing";
};

const isContractWriterRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeContractWriterRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeContractWriterRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveSignerExecution === false
    && summary.liveWalletSignature === false
    && summary.liveContractWrite === false
    && summary.liveQueuePublishing === false
    && summary.liveRewardCustody === false
    && summary.liveRewardDistribution === false
    && summary.operationGroupCount >= 4
    && summary.operationCount >= 20
    && contractWriterRequiredConfigKeys.every((key) => summary.requiredConfigKeys.includes(key))
    && summary.diagnosticCodes.includes("CONTRACT_WRITER_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.configStatus === "missing"
    && summary.valid === true;
};

const isRewardDistributionHandoffRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeRewardDistributionHandoffRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveClaim === false
    && summary.liveContractWrite === false
    && summary.livePayout === false
    && summary.liveProviderCall === false
    && summary.liveQueuePublishing === false
    && summary.liveRewardCustody === false
    && summary.liveRewardDistribution === false
    && summary.liveSchedulerExecution === false
    && summary.liveWalletSignature === false
    && summary.liveWorkerExecution === false
    && summary.itemCount >= 11
    && summary.recipientCount >= 1
    && rewardDistributionHandoffRequiredEvidenceKeys.every((key) => summary.requiredEvidenceKeys.includes(key))
    && summary.diagnosticCodes.includes("REWARD_DISTRIBUTION_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.evidenceStatus === "missing"
    && summary.valid === true;
};

const isProjectOwnerFundingProofReviewBridgeSmokeReady = (
  summary: BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary | undefined,
): summary is BackendRuntimeSmokeProjectOwnerFundingProofReviewBridgeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveContractWrite === false
    && summary.liveFundingTransfer === false
    && summary.liveObjectStorageWrite === false
    && summary.liveProviderCall === false
    && summary.liveQueuePublishing === false
    && summary.liveRewardCustody === false
    && summary.liveRewardDistribution === false
    && summary.liveSchedulerExecution === false
    && summary.liveWalletSignature === false
    && summary.liveWorkerExecution === false
    && summary.requiredItemCount >= 8
    && summary.blockedItemCount >= 1
    && summary.readyItemCount === 0
    && summary.reviewRequiredItemCount === 0
    && summary.missingEvidenceCount === projectOwnerFundingProofRequiredEvidenceKeys.length
    && projectOwnerFundingProofRequiredEvidenceKeys.every((key) => summary.requiredEvidenceKeys.includes(key))
    && summary.diagnosticCodes.includes("PROJECT_OWNER_FUNDING_PROOF_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.proofPackageStatus === "missing"
    && summary.valid === true;
};

const isProductionDatabaseHandoffReadinessSmokeReady = (
  summary: BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary | undefined,
): summary is BackendRuntimeSmokeProductionDatabaseHandoffReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.localMvpReady === true
    && summary.dbClientConstructed === false
    && summary.liveConnectionAttempted === false
    && summary.liveContractWritesEnabled === false
    && summary.liveMigrationExecutionEnabled === false
    && summary.liveProductionMutationEnabled === false
    && summary.liveProviderCallsEnabled === false
    && summary.liveQueryExecutionEnabled === false
    && summary.liveRewardCustodyEnabled === false
    && summary.liveRewardDistributionEnabled === false
    && summary.liveStorageWritesEnabled === false
    && summary.liveTransactionExecutionEnabled === false
    && summary.migrationGateLiveExecutionEnabled === false
    && summary.noLiveFlagsAllFalse === true
    && summary.requiredReferenceCount >= productionDatabaseRequiredReferenceKeys.length
    && productionDatabaseRequiredReferenceKeys.every((key) => summary.requiredReferenceKeys.includes(key))
    && summary.storeCoverageCount > 0
    && summary.packageName === "pg"
    && summary.packageRef === "npm:pg"
    && summary.status !== "production_ready"
    && (summary.status === "blocked" || summary.status === "review_required" || summary.status === "local_ready")
    && summary.migrationGateStatus !== "production_ready"
    && summary.valid === true;
};

const isProviderIndexerFoundationSmokeReady = (
  summary: BackendRuntimeSmokeProviderIndexerFoundationSummary | undefined,
): summary is BackendRuntimeSmokeProviderIndexerFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveProviderCallsEnabled === false
    && summary.liveIndexerCallsEnabled === false
    && summary.liveSocialCallsEnabled === false
    && summary.liveAiCallsEnabled === false
    && summary.liveAnalyticsIngestionEnabled === false
    && summary.liveObjectStorageEnabled === false
    && summary.liveContractCallsEnabled === false
    && summary.workerExecutionEnabled === false
    && summary.providerGroupCount >= 10
    && summary.verificationSourceCoverageCount >= 5
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isProviderClientReadinessSmokeReady = (
  summary: BackendRuntimeSmokeProviderClientReadinessSummary | undefined,
): summary is BackendRuntimeSmokeProviderClientReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveProviderCallsAttempted === false
    && summary.providerClientsEnabled === false
    && summary.providerClientsProvided === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.providerHttpRuntime.productionReady === false
    && summary.providerHttpRuntime.liveHttpCallsAttempted === false
    && summary.providerHttpRuntime.status === "disabled"
    && summary.providerHttpRuntime.activationStatus === "disabled"
    && summary.providerHttpRuntime.endpointCount >= 13
    && summary.providerHttpRuntime.endpointRollout.enabledCount >= 11
    && summary.providerHttpRuntime.endpointRollout.deferredCount >= 2
    && summary.providerHttpRuntime.endpointRollout.providerFamilies.includes("aefinder")
    && summary.providerHttpRuntime.endpointRollout.providerFamilies.includes("aelfscan")
    && summary.providerHttpRuntime.endpointRollout.requiredConfigKeys.some((key) =>
      key.startsWith("CAMPAIGN_OS_PROVIDER_HTTP_AEFINDER")
    )
    && summary.providerHttpRuntime.transportProvided === false
    && summary.providerHttpRuntime.valid === true
    && summary.queueHandoffStatus === "disabled"
    && summary.registryClientCount === 0
    && summary.registryProviderGroupCount >= 5
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_REGISTRY_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_ENDPOINT_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CLIENT_SEAM")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_REDACTION_POLICY")
    && summary.status === "disabled"
    && summary.valid === true;
};

const isWorkerSchedulerFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerSchedulerFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerSchedulerFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.jobCatalogCount > 0
    && summary.schedulePolicyCount > 0
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isWorkerLeaseStoreFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.storeId === "local-dry-run"
    && summary.adapterId === "local-dry-run-worker-lease-store-adapter"
    && summary.mode === "dry_run"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_WORKER_LEASE_STORE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_WORKER_LEASE_STORE_URL")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isWorkerIdempotencyStoreFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveIdempotencyExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.storeId === "local-dry-run"
    && summary.adapterId === "local-dry-run-worker-idempotency-store-adapter"
    && summary.mode === "dry_run"
    && summary.namespace === "campaign-os-workers"
    && summary.keySchemaVersion === "v1"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isQueueRuntimeFoundationSmokeReady = (
  summary: BackendRuntimeSmokeQueueRuntimeFoundationSummary | undefined,
): summary is BackendRuntimeSmokeQueueRuntimeFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueueConsumptionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.queuePlanCount >= 9
    && summary.dryRunEnqueueEnabled === true
    && isQueueConsumingSmokeReady(summary.liveQueueConsumingReadiness)
    && isQueuePublishingSmokeReady(summary.liveQueuePublishingReadiness)
    && isQueueProviderAdapterSmokeReady(summary.providerAdapter)
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isQueueConsumingSmokeReady = (
  summary: BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined,
): summary is BackendRuntimeSmokeQueueConsumingReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.ackAttempted === false
    && summary.deadLetterAttempted === false
    && summary.liveConsumeAttempted === false
    && summary.liveQueueConsumptionEnabled === false
    && summary.nackAttempted === false
    && summary.retryScheduled === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.consumeAttemptPolicy === "disabled_no_live"
    && summary.consumeRequestEvaluated === false
    && summary.consumeResultStatus === "not_requested"
    && summary.consumerId === "not_configured"
    && summary.consumerProvided === false
    && summary.handlerRegistryProvided === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUMER")
    && summary.status === "disabled"
    && Object.values(summary.noLiveSideEffects).every((value) => value === false);
};

const isQueuePublishingSmokeReady = (
  summary: BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined,
): summary is BackendRuntimeSmokeQueuePublishingReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.livePublishAttempted === false
    && summary.liveQueuePublishingEnabled === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.publishAttemptPolicy === "disabled_no_live"
    && summary.publishRequestEvaluated === false
    && summary.publishResultStatus === "not_requested"
    && summary.publisherId === "not_configured"
    && summary.publisherProvided === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER")
    && summary.status === "disabled"
    && Object.values(summary.noLiveSideEffects).every((value) => value === false);
};

const isQueueProviderAdapterSmokeReady = (
  summary: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): summary is BackendRuntimeSmokeQueueProviderAdapterSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.providerId === "local-dry-run"
    && summary.adapterId === "local-dry-run-queue-provider-adapter"
    && summary.mode === "dry_run"
    && summary.driverProviderId === "local-fake"
    && summary.driverId === "local-fake-queue-provider-driver"
    && summary.driverMode === "dry_run"
    && summary.driverStatus === "local_ready"
    && summary.driverValid === true
    && summary.driverActivationGateSatisfied === false
    && summary.driverProductionReady === false
    && summary.driverLiveQueueConsumptionEnabled === false
    && summary.driverLiveQueuePublishingEnabled === false
    && summary.driverLiveWorkerExecutionEnabled === false
    && summary.driverConsumingActivationStatus === "disabled"
    && summary.driverConsumingBlockerCount === 0
    && summary.driverConsumingLiveConsumeAttempted === false
    && summary.driverConsumingLiveQueueConsumptionEnabled === false
    && summary.driverConsumeAckAttempted === false
    && summary.driverConsumeDeadLetterAttempted === false
    && summary.driverConsumeNackAttempted === false
    && summary.driverConsumeRetryScheduled === false
    && summary.driverConsumeAttemptPolicy === "disabled_no_live"
    && summary.driverConsumeResultStatus === "not_requested"
    && summary.driverConsumingConsumerId === "not_configured"
    && summary.driverConsumingConsumerProvided === false
    && summary.driverConsumingHandlerRegistryProvided === false
    && summary.driverConsumingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT")
    && summary.driverConsumingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUMER")
    && summary.driverConsumingStatus === "disabled"
    && Object.values(summary.driverConsumingNoLiveSideEffects).every((value) => value === false)
    && summary.driverPublishingActivationStatus === "disabled"
    && summary.driverPublishingBlockerCount === 0
    && summary.driverPublishingLivePublishAttempted === false
    && summary.driverPublishingLiveQueuePublishingEnabled === false
    && summary.driverPublishAttemptPolicy === "disabled_no_live"
    && summary.driverPublishResultStatus === "not_requested"
    && summary.driverPublishingPublisherId === "not_configured"
    && summary.driverPublishingPublisherProvided === false
    && summary.driverPublishingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT")
    && summary.driverPublishingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER")
    && summary.driverPublishingStatus === "disabled"
    && Object.values(summary.driverPublishingNoLiveSideEffects).every((value) => value === false)
    && summary.driverOperationCount >= 8
    && summary.driverDisabledLiveOperationCount === summary.driverOperationCount
    && summary.driverBlockerCount === 0
    && summary.driverDiagnosticCodes.length === 0
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER")
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT")
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT")
    && summary.driverSdkBindingId === "local-stub-queue-provider-sdk-binding"
    && summary.driverSdkBindingProviderKind === "local-stub"
    && summary.driverSdkBindingSdkPackageRef === "local-stub-sdk-package"
    && summary.driverSdkBindingMode === "dry_run"
    && summary.driverSdkBindingStatus === "local_ready"
    && summary.driverSdkBindingValid === true
    && summary.driverSdkBindingActivationGateSatisfied === false
    && summary.driverSdkBindingProductionReady === false
    && summary.driverSdkBindingSdkClientConstructed === false
    && summary.driverSdkBindingLiveProviderCallAttempted === false
    && summary.driverSdkBindingLiveQueuePublishingEnabled === false
    && summary.driverSdkBindingLiveWorkerExecutionEnabled === false
    && summary.driverSdkBindingOperationCount >= 8
    && summary.driverSdkBindingDisabledLiveOperationCount === summary.driverSdkBindingOperationCount
    && summary.driverSdkBindingBlockerCount === 0
    && summary.driverSdkBindingDiagnosticCodes.length === 0
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE")
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_BINDING")
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT")
    && summary.driverSdkBindingPackageBindingId === "bullmq-redis-package-binding-local"
    && summary.driverSdkBindingPackageBindingFamily === "bullmq-redis-compatible"
    && summary.driverSdkBindingPackageBindingPackageName === "bullmq"
    && summary.driverSdkBindingPackageBindingPackageRef === "npm:bullmq"
    && summary.driverSdkBindingPackageBindingStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBrokerConnectionId === "redis-broker-connection-local"
    && summary.driverSdkBindingPackageBindingBrokerConnectionStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode === "disabled"
    && summary.driverSdkBindingPackageBindingBrokerConnectionBlockerCount === 0
    && summary.driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes.length === 0
    && summary.driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys.includes("CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT")
    && summary.driverSdkBindingPackageBindingBrowserBundleAllowed === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionId === "bullmq-construction-local"
    && summary.driverSdkBindingPackageBindingBullmqConstructionStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBullmqConstructionAttempted === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionProductionReady === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionBlockerCount === 0
    && summary.driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes.length === 0
    && summary.driverSdkBindingPackageBindingLiveBrokerConnectionAttempted === false
    && summary.driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted === false
    && summary.driverSdkBindingPackageBindingLiveQueuePublishingEnabled === false
    && summary.driverSdkBindingPackageBindingLiveWorkerExecutionEnabled === false
    && summary.driverSdkBindingPackageBindingQueueClientConstructed === false
    && summary.driverSdkBindingPackageBindingQueueEventsConstructed === false
    && summary.driverSdkBindingPackageBindingSdkClientConstructed === false
    && summary.driverSdkBindingPackageBindingWorkerConstructed === false
    && summary.driverSdkBindingPackageBindingBlockerCount === 0
    && summary.driverSdkBindingPackageBindingDiagnosticCodes.length === 0
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isSchedulerRuntimeFoundationSmokeReady = (
  summary: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary | undefined,
): summary is BackendRuntimeSmokeSchedulerRuntimeFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.registrationCount >= 9
    && summary.scheduleIds.length >= 9
    && summary.dryRunTriggerEnabled === true
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isObservabilityExporterFoundationSmokeReady = (
  summary: BackendRuntimeSmokeObservabilityExporterFoundationSummary | undefined,
): summary is BackendRuntimeSmokeObservabilityExporterFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveAlertRoutingEnabled === false
    && summary.liveLogExportEnabled === false
    && summary.liveMetricsExportEnabled === false
    && summary.liveTelemetryExportEnabled === false
    && summary.liveTraceExportEnabled === false
    && summary.exporterId === "local-dry-run"
    && summary.sinkId === "local-metrics-sink"
    && summary.adapterId === "local-dry-run-observability-exporter-adapter"
    && summary.mode === "dry_run"
    && summary.metricNamespace === "campaign-os-runtime"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_EXPORTER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_SINK")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isProductionBackendReadinessSmokeReady = (
  summary: BackendRuntimeSmokeProductionBackendReadinessSummary | undefined,
): summary is BackendRuntimeSmokeProductionBackendReadinessSummary =>
  summary !== undefined
  && summary.contractsEndpoint === "/api/contracts"
  && isDatabasePackageBindingSmokeReady(summary.databasePackageBinding)
  && summary.healthEndpoint === "/api/health"
  && summary.missingApiSkillIds.length === 0
  && summary.noLiveSideEffectsAllFalse === true
  && summary.productionReady === false
  && summary.routeCount > 0
  && summary.smokeCommand === "npm run server:smoke"
  && summary.startCommand === "npm run server:start"
  && summary.traceHeaderName === "x-campaign-os-trace-id";

const isDatabasePackageBindingSmokeReady = (
  summary: BackendRuntimeSmokeDatabasePackageBindingSummary | undefined,
): summary is BackendRuntimeSmokeDatabasePackageBindingSummary => {
  if (!summary) {
    return false;
  }

  return summary.bindingId === "campaign-os-postgresql-package-binding-local"
    && Number.isFinite(summary.blockerCount)
    && summary.liveConnectionAttempted === false
    && summary.liveContractWritesEnabled === false
    && summary.liveMigrationExecutionEnabled === false
    && summary.liveProductionMutationEnabled === false
    && summary.liveProviderCallsEnabled === false
    && summary.liveQueryExecutionEnabled === false
    && summary.liveRewardCustodyEnabled === false
    && summary.liveRewardDistributionEnabled === false
    && summary.liveStorageWritesEnabled === false
    && summary.liveTransactionExecutionEnabled === false
    && summary.noLiveFlagsAllFalse === true
    && summary.packageName === "pg"
    && summary.packageRef === "npm:pg"
    && summary.productionReady === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PACKAGE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PACKAGE_BINDING")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PROVIDER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_SECRET_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_POOL_POLICY")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_RUNBOOK_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT")
    && (summary.status === "local_ready" || summary.status === "blocked");
};

const isDefaultCampaignDatabaseSmokeReady = (
  summary: BackendRuntimeSmokeCampaignDatabaseSummary | undefined,
): summary is BackendRuntimeSmokeCampaignDatabaseSummary => {
  if (!summary) {
    return false;
  }

  return summary.adapterId === "campaign-db-deterministic-adapter"
    && summary.fallbackUsed === false
    && summary.liveConnectionAttempted === false
    && summary.liveQueryExecutionEnabled === false
    && summary.liveStorageExecutionEnabled === false
    && summary.selectedMode === "deterministic_test"
    && summary.status === "ready";
};

export const runBackendRuntimeSmoke = async ({
  env,
  fetchImpl = fetch,
  host = "127.0.0.1",
  logger = false,
  port = 0,
  serverFactory = startCampaignOsApiServer,
  shutdownTimeoutMs,
}: BackendRuntimeSmokeOptions = {}): Promise<BackendRuntimeSmokeSummary> => {
  const durableEnv = await withDurableLocalPersistenceEnv(env);
  let server: CampaignOsApiServerHandle;

  try {
    server = await serverFactory({
      allowedCorsOrigins: [taskTemplateCatalogSmokeOrigin],
      deprecatedNonLivePreviewAuthority: durableLocalPreviewAuthority,
      env: durableEnv.env,
      host,
      logger: false,
      port,
      shutdownTimeoutMs,
    });
  } catch (error) {
    try {
      await removeGeneratedPersistenceDir(durableEnv.cleanupDir);
    } catch {
      throw new BackendRuntimeSmokeCleanupError(1);
    }

    throw error;
  }

  const backendEntrypointId = server.getReadiness().readiness.backend.entrypointId;

  let resourceCleanup: BackendRuntimeSmokeResourceCleanupSummary | undefined;
  let summaryDraft: Omit<
    BackendRuntimeSmokeSummary,
    "resourceCleanup" | "shutdownState"
  > | undefined;

  try {
    const health = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/health",
      fetchImpl,
      traceId: "campaign-os-smoke-health",
    });
    const contracts = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/contracts",
      fetchImpl,
      traceId: "campaign-os-smoke-contracts",
    });
    const activation = contracts.activation ?? health.activation;
    const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);
    const authSessionFoundation = contracts.check.authSessionFoundation;
    const campaignDatabase = contracts.check.campaignDatabase;
    const persistenceFoundation = contracts.check.persistenceFoundation;
    const providerIndexerFoundation = contracts.check.providerIndexerFoundation;
    const providerClientReadiness = contracts.check.providerClientReadiness;
    const queueRuntimeFoundation = contracts.check.queueRuntimeFoundation;
    const schedulerRuntimeFoundation = contracts.check.schedulerRuntimeFoundation;
    const workerIdempotencyStoreFoundation = contracts.check.workerIdempotencyStoreFoundation;
    const workerLeaseStoreFoundation = contracts.check.workerLeaseStoreFoundation;
    const workerSchedulerFoundation = contracts.check.workerSchedulerFoundation;
    const observabilityExporterFoundation = contracts.check.observabilityExporterFoundation;
    const objectStorageExportRuntime = contracts.check.objectStorageExportRuntime;
    const analyticsIngestionRuntime = contracts.check.analyticsIngestionRuntime;
    const contractWriterRuntime = contracts.check.contractWriterRuntime;
    const rewardDistributionHandoffRuntime = contracts.check.rewardDistributionHandoffRuntime;
    const projectOwnerFundingProofReviewBridge = contracts.check.projectOwnerFundingProofReviewBridge;
    const productionBackendReadiness = contracts.check.productionBackendReadiness;
    const analyticsIngestionRuntimeSample = await createAnalyticsIngestionRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-analytics-ingestion-readiness",
    });
    const contractWriterRuntimeSample = await createContractWriterRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-contract-writer-readiness",
    });
    const rewardDistributionHandoffRuntimeSample = await createRewardDistributionHandoffRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-reward-distribution-handoff-readiness",
    });
    const projectOwnerFundingProofReviewBridgeSample = await createProjectOwnerFundingProofReviewBridgeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-funding-proof-review",
    });
    const productionDatabaseHandoffReadinessSample = await createProductionDatabaseHandoffReadinessSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-production-database-handoff-readiness",
    });
    const adminReviewRuntime = await createDisabledAdminReviewRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
    });
    const taskTemplateCatalogRuntime = await createDisabledTaskTemplateCatalogRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
    });

    if (
      health.check.status !== 200
      || contracts.check.status !== 200
      || !health.check.ok
      || !contracts.check.ok
      || !health.check.activationPresent
      || !contracts.check.activationPresent
      || backendEntrypointId !== "campaign-os-backend-service"
      || !isExplicitFalse(activation, "productionReady")
      || !isExplicitFalse(activation, "liveSideEffectsEnabled")
      || !isReleaseScopeSmokeReady(activation, deploymentHandoff)
      || !isAuthSessionFoundationSmokeReady(health.check.authSessionFoundation)
      || !isAuthSessionFoundationSmokeReady(authSessionFoundation)
      || !isDefaultCampaignDatabaseSmokeReady(health.check.campaignDatabase)
      || !isDefaultCampaignDatabaseSmokeReady(campaignDatabase)
      || !isPersistenceFoundationSmokeReady(health.check.persistenceFoundation)
      || !isPersistenceFoundationSmokeReady(persistenceFoundation)
      || !isProviderIndexerFoundationSmokeReady(health.check.providerIndexerFoundation)
      || !isProviderIndexerFoundationSmokeReady(providerIndexerFoundation)
      || !isProviderClientReadinessSmokeReady(health.check.providerClientReadiness)
      || !isProviderClientReadinessSmokeReady(providerClientReadiness)
      || !isQueueRuntimeFoundationSmokeReady(health.check.queueRuntimeFoundation)
      || !isQueueRuntimeFoundationSmokeReady(queueRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(health.check.schedulerRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(schedulerRuntimeFoundation)
      || !isObservabilityExporterFoundationSmokeReady(health.check.observabilityExporterFoundation)
      || !isObservabilityExporterFoundationSmokeReady(observabilityExporterFoundation)
      || !isObjectStorageExportRuntimeSmokeReady(health.check.objectStorageExportRuntime)
      || !isObjectStorageExportRuntimeSmokeReady(objectStorageExportRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(health.check.analyticsIngestionRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(analyticsIngestionRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(analyticsIngestionRuntimeSample)
      || !isContractWriterRuntimeSmokeReady(health.check.contractWriterRuntime)
      || !isContractWriterRuntimeSmokeReady(contractWriterRuntime)
      || !isContractWriterRuntimeSmokeReady(contractWriterRuntimeSample)
      || !isRewardDistributionHandoffRuntimeSmokeReady(health.check.rewardDistributionHandoffRuntime)
      || !isRewardDistributionHandoffRuntimeSmokeReady(rewardDistributionHandoffRuntime)
      || !isRewardDistributionHandoffRuntimeSmokeReady(rewardDistributionHandoffRuntimeSample)
      || !isProjectOwnerFundingProofReviewBridgeSmokeReady(health.check.projectOwnerFundingProofReviewBridge)
      || !isProjectOwnerFundingProofReviewBridgeSmokeReady(projectOwnerFundingProofReviewBridge)
      || !isProjectOwnerFundingProofReviewBridgeSmokeReady(projectOwnerFundingProofReviewBridgeSample)
      || !isProductionDatabaseHandoffReadinessSmokeReady(productionDatabaseHandoffReadinessSample)
      || !adminReviewRuntime
      || !taskTemplateCatalogRuntime
      || !isProductionBackendReadinessSmokeReady(health.check.productionBackendReadiness)
      || !isProductionBackendReadinessSmokeReady(productionBackendReadiness)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(health.check.workerIdempotencyStoreFoundation)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(workerIdempotencyStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(health.check.workerLeaseStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(workerLeaseStoreFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(health.check.workerSchedulerFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(workerSchedulerFoundation)
    ) {
      throw new Error("Campaign OS backend runtime smoke check failed.");
    }

    const durableLocalPersistence = await runDurableLocalPersistenceSmoke({
      env: durableEnv.env,
      fetchImpl,
      host,
      server,
      shutdownTimeoutMs,
    });

    summaryDraft = {
      activationId: typeof activation?.id === "string" ? activation.id : undefined,
      adminReviewRuntime,
      authSessionFoundation,
      campaignDatabase,
      checks: {
        contracts: contracts.check,
        health: health.check,
      },
      composition: {
        catalogDefaultDisabledCheckPassed: true,
        contractsCheckPassed: true,
        entrypointId: "campaign-os-backend-service",
        healthCheckPassed: true,
        routeCount: productionBackendReadiness.routeCount,
      },
      durableLocalPersistence,
      host,
      liveSideEffectsEnabled: getBoolean(activation, "liveSideEffectsEnabled"),
      analyticsIngestionRuntime: analyticsIngestionRuntimeSample,
      contractWriterRuntime: contractWriterRuntimeSample,
      objectStorageExportRuntime,
      observabilityExporterFoundation,
      persistenceFoundation,
      productionBackendReadiness,
      providerClientReadiness,
      port: new URL(server.url).port ? Number(new URL(server.url).port) : 0,
      projectOwnerFundingProofReviewBridge: projectOwnerFundingProofReviewBridgeSample,
      productionDatabaseHandoffReadiness: productionDatabaseHandoffReadinessSample,
      rewardDistributionHandoffRuntime: rewardDistributionHandoffRuntimeSample,
      futureProduction: getStringArray(deploymentHandoff, "futureProduction"),
      futureProductionBlockerIds: getStringArray(activation, "futureProductionBlockerIds"),
      mvpReleaseBlockerIds: getStringArray(activation, "mvpReleaseBlockerIds"),
      mvpReleaseReady: getBoolean(activation, "mvpReleaseReady"),
      productionReady: getBoolean(activation, "productionReady"),
      providerIndexerFoundation,
      queueRuntimeFoundation,
      requiredBeforeMvpRelease: getStringArray(deploymentHandoff, "requiredBeforeMvpRelease"),
      requiredBeforeProduction: getStringArray(deploymentHandoff, "requiredBeforeProduction"),
      schedulerRuntimeFoundation,
      status: "passed",
      taskTemplateCatalogRuntime,
      traceIds: {
        contracts: contracts.check.traceId,
        health: health.check.traceId,
      },
      url: server.url,
      workerIdempotencyStoreFoundation,
      workerLeaseStoreFoundation,
      workerSchedulerFoundation,
    };
  } finally {
    let stopError: unknown;
    let cleanupError: unknown;

    try {
      resourceCleanup = await stopAndAssertBackendRuntimeResourcesReleased(server);
    } catch (error) {
      stopError = error;
    }

    try {
      await removeGeneratedPersistenceDir(durableEnv.cleanupDir);
    } catch (error) {
      cleanupError = error;
    }

    if (stopError && cleanupError) {
      throw new BackendRuntimeSmokeCleanupError(2);
    }

    if (stopError) {
      throw stopError;
    }

    if (cleanupError) {
      throw new BackendRuntimeSmokeCleanupError(1);
    }
  }

  if (!summaryDraft) {
    throw new Error("Campaign OS backend runtime smoke check did not produce a summary.");
  }

  if (!resourceCleanup) {
    throw new BackendRuntimeSmokeCleanupError(1);
  }

  const summary: BackendRuntimeSmokeSummary = {
    ...summaryDraft,
    resourceCleanup,
    shutdownState: resourceCleanup.shutdownState,
  };

  if (logger) {
    logger.log(JSON.stringify(createBackendRuntimeSmokeSafeOutput(summary)));
  }

  return summary;
};

const createBackendRuntimeSmokeSafeOutput = (
  summary: BackendRuntimeSmokeSummary,
): BackendRuntimeSmokeSafeOutput => ({
  composition: summary.composition,
  event: "backend_runtime_smoke.completed",
  providerVerification: {
    defaultEnabled: false,
    liveCallAttempted: summary.providerClientReadiness.liveProviderCallsAttempted,
    productionProviderApproved: summary.providerClientReadiness.productionReady,
    status: "disabled",
    transportProvided: false,
  },
  resources: summary.resourceCleanup,
  status: summary.status,
  traceIds: summary.traceIds,
});

export const runBackendRuntimeSmokeCli = async ({
  logger = console,
  smokeOptions,
  smokeRunner = runBackendRuntimeSmoke,
}: BackendRuntimeSmokeCliOptions = {}): Promise<0 | 1> => {
  try {
    const summary = await smokeRunner({
      ...(smokeOptions ?? {}),
      logger: false,
    });
    logger.log(JSON.stringify(createBackendRuntimeSmokeSafeOutput(summary)));
    return 0;
  } catch {
    logger.error(JSON.stringify({
      errorCode: "BACKEND_RUNTIME_SMOKE_FAILED",
      event: "backend_runtime_smoke.failed",
      status: "failed",
      traceId: randomUUID(),
    }));
    return 1;
  }
};

if (process.argv.includes("--run")) {
  void runBackendRuntimeSmokeCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
