import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createProviderIndexerClientReadiness,
  providerClientProductionPreconditions,
  type ProviderClientDiagnosticCode,
  type ProviderClientReadinessStatus,
  type ProviderVerificationType,
} from "./providerIndexerClientReadiness";

export type ProviderIndexerProfileId = BackendRuntimeProfileId;
export type ProviderGroupCategory =
  | "wallet_auth"
  | "indexer"
  | "dapp_api"
  | "social_api"
  | "manual_review"
  | "ai_provider"
  | "analytics"
  | "storage"
  | "contract_reader"
  | "contract_writer";
export type ProviderGroupStatus = "local_stub" | "deferred" | "blocked" | "disabled";
export type ProviderFailureMode =
  | "deterministic_local_stub"
  | "manual_handoff"
  | "live_adapter_deferred"
  | "fail_closed_until_configured";
export type ProviderIndexerFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type ProviderIndexerDiagnosticSeverity = "error" | "warning" | "info";
export type ProviderIndexerDiagnosticCode =
  | "UNKNOWN_PROVIDER_INDEXER_PROFILE"
  | "PROVIDER_REGISTRY_ENDPOINT_MISSING"
  | "INDEXER_ENDPOINT_MISSING"
  | "PROVIDER_CREDENTIALS_MISSING"
  | "DEGRADATION_POLICY_MISSING"
  | "WORKER_HANDOFF_MISSING";

export interface ProviderIndexerNoLiveFlags {
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveIndexerCallsEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveSocialCallsEnabled: false;
  workerExecutionEnabled: false;
}

export interface ProviderClientReadinessMetadata {
  capabilityLabels: string[];
  circuitBreakerPolicyRef: string;
  clientId: string;
  credentialRef: string;
  degradationPolicyRef: string;
  endpointRef: string;
  providerClientRequired: boolean;
  readinessId: "campaign-os-provider-indexer-client-readiness";
  retryPolicyRef: string;
  supportedVerificationTypes: ProviderVerificationType[];
  timeoutPolicyRef: string;
}

export interface ProviderIndexerAdapterGroup {
  capabilities: string[];
  category: ProviderGroupCategory;
  clientReadiness: ProviderClientReadinessMetadata;
  failureMode: ProviderFailureMode;
  forbiddenInLocalReview: boolean;
  id: string;
  label: string;
  liveCallEnabled: false;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  serviceIds: string[];
  status: ProviderGroupStatus;
}

export interface ProviderClientRegistryProjectionEntry extends ProviderClientReadinessMetadata {
  adapterGroupCategory: ProviderGroupCategory;
  adapterGroupId: string;
  adapterGroupStatus: ProviderGroupStatus;
  liveProviderCallsAttempted: false;
  productionReady: false;
  readinessStatus: ProviderClientReadinessStatus;
}

export interface ProviderClientRegistryProjection {
  adapterFoundationId: "campaign-os-provider-indexer-foundation";
  blockerCount: number;
  clientReadinessId: "campaign-os-provider-indexer-client-readiness";
  diagnosticCodes: ProviderClientDiagnosticCode[];
  entries: ProviderClientRegistryProjectionEntry[];
  executionBoundary: "metadata_only_no_sdk_no_live_calls";
  liveProviderCallsAttempted: false;
  missingPreconditionRefs: string[];
  productionReady: false;
  providerClientsEnabled: boolean;
  registryPresent: true;
  source: "provider-indexer-client-readiness";
  status: ProviderClientReadinessStatus;
}

export interface ProviderIndexerDiagnostic {
  code: ProviderIndexerDiagnosticCode;
  field: string;
  message: string;
  severity: ProviderIndexerDiagnosticSeverity;
}

export interface VerificationSourceCoverageSummary {
  categories: string[];
  summaryCount: number;
}

export interface ProviderIndexerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: ProviderIndexerDiagnosticCode[];
  diagnostics: ProviderIndexerDiagnostic[];
  id: "campaign-os-provider-indexer-foundation";
  noLiveFlags: ProviderIndexerNoLiveFlags;
  productionReady: false;
  profileId: ProviderIndexerProfileId;
  providerClientRegistry: ProviderClientRegistryProjection;
  providerGroupCount: number;
  providerGroups: ProviderIndexerAdapterGroup[];
  status: ProviderIndexerFoundationStatus;
  valid: boolean;
  verificationSourceCoverage: VerificationSourceCoverageSummary;
}

export interface CreateProviderIndexerFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
}

type ProductionPrecondition = {
  code: ProviderIndexerDiagnosticCode;
  field: string;
  message: string;
  requiredKeys: string[];
};

const REDACTED_VALUE = "[redacted]";
const rawPayloadValue = "[redacted-provider-payload]";
const providerClientReadinessId = "campaign-os-provider-indexer-client-readiness" as const;
const providerClientReferencePolicy = {
  circuitBreakerPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY",
  credentialRef: "secret-ref:CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
  degradationPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY",
  endpointRef: "config-ref:CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
  retryPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_RETRY_POLICY",
  timeoutPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
} as const;

export const SUPPORTED_PROVIDER_INDEXER_PROFILES: ProviderIndexerProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const providerIndexerNoLiveFlags: ProviderIndexerNoLiveFlags = {
  liveAiCallsEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveContractCallsEnabled: false,
  liveIndexerCallsEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveSocialCallsEnabled: false,
  workerExecutionEnabled: false,
};

type ProviderIndexerAdapterGroupInput = Omit<ProviderIndexerAdapterGroup, "clientReadiness"> & {
  clientReadiness?: ProviderClientReadinessMetadata;
};

const providerClientReadinessMetadata = (
  groupId: string,
  supportedVerificationTypes: ProviderVerificationType[],
  providerClientRequired: boolean,
): ProviderClientReadinessMetadata => ({
  capabilityLabels: [
    "provider-client:verification_evaluation",
    "provider-client:redacted_diagnostics",
  ],
  circuitBreakerPolicyRef: providerClientReferencePolicy.circuitBreakerPolicyRef,
  clientId: `provider-client:${groupId}`,
  credentialRef: providerClientReferencePolicy.credentialRef,
  degradationPolicyRef: providerClientReferencePolicy.degradationPolicyRef,
  endpointRef: providerClientReferencePolicy.endpointRef,
  providerClientRequired,
  readinessId: providerClientReadinessId,
  retryPolicyRef: providerClientReferencePolicy.retryPolicyRef,
  supportedVerificationTypes,
  timeoutPolicyRef: providerClientReferencePolicy.timeoutPolicyRef,
});

const providerGroup = (group: ProviderIndexerAdapterGroupInput): ProviderIndexerAdapterGroup => ({
  ...group,
  clientReadiness: group.clientReadiness ?? providerClientReadinessMetadata(group.id, [], false),
});

export const providerIndexerAdapterGroups: ProviderIndexerAdapterGroup[] = [
  providerGroup({
    capabilities: ["session_identity", "wallet_proof_handoff", "auth_session_reference"],
    category: "wallet_auth",
    clientReadiness: providerClientReadinessMetadata("wallet-auth-session", ["WALLET"], false),
    failureMode: "deterministic_local_stub",
    forbiddenInLocalReview: false,
    id: "wallet-auth-session",
    label: "Wallet/auth session handoff",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_AUTH_SECRET"],
    serviceIds: ["wallet-auth", "session-issuer"],
    status: "local_stub",
  }),
  providerGroup({
    capabilities: ["campaign_event_lookup", "quest_completion_lookup", "chain_activity_lookup"],
    category: "indexer",
    clientReadiness: providerClientReadinessMetadata("aefinder-aelfscan-indexers", ["ON_CHAIN"], true),
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "aefinder-aelfscan-indexers",
    label: "AeFinder/AelfScan indexer adapters",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_INDEXER_ENDPOINT"],
    serviceIds: ["aefinder", "aelfscan"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["partner_campaign_status", "quest_validation_status"],
    category: "dapp_api",
    clientReadiness: providerClientReadinessMetadata("dapp-api-adapters", ["DAPP_API"], true),
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "dapp-api-adapters",
    label: "dApp API adapter placeholders",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_DAPP_API_BASE_URL", "CAMPAIGN_OS_PROVIDER_CREDENTIALS"],
    serviceIds: ["campaign-dapp-api", "partner-dapp-api"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["social_follow_lookup", "social_share_lookup", "social_identity_match"],
    category: "social_api",
    clientReadiness: providerClientReadinessMetadata("social-api-adapters", ["SOCIAL"], true),
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "social-api-adapters",
    label: "Social API adapter placeholders",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_SOCIAL_API_BASE_URL", "CAMPAIGN_OS_SOCIAL_API_TOKEN"],
    serviceIds: ["x-api", "telegram-api", "discord-api"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["manual_decision_capture", "operator_review_queue"],
    category: "manual_review",
    clientReadiness: providerClientReadinessMetadata("manual-review", ["MANUAL"], false),
    failureMode: "manual_handoff",
    forbiddenInLocalReview: false,
    id: "manual-review",
    label: "Manual review fallback",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_DEGRADATION_POLICY"],
    serviceIds: ["manual-review-queue"],
    status: "local_stub",
  }),
  providerGroup({
    capabilities: ["ai_assisted_review", "risk_signal_summary"],
    category: "ai_provider",
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "ai-provider-adapters",
    label: "AI provider adapter placeholders",
    liveCallEnabled: false,
    requiredBeforeProduction: false,
    requiredConfigKeys: ["CAMPAIGN_OS_AI_PROVIDER_ENDPOINT", "CAMPAIGN_OS_AI_PROVIDER_TOKEN"],
    serviceIds: ["ai-review-provider"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["event_ingestion_handoff", "metric_projection_handoff"],
    category: "analytics",
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "analytics-warehouse-adapter",
    label: "Analytics warehouse adapter placeholder",
    liveCallEnabled: false,
    requiredBeforeProduction: false,
    requiredConfigKeys: ["CAMPAIGN_OS_ANALYTICS_WAREHOUSE_URL"],
    serviceIds: ["analytics-warehouse"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["export_object_reference", "evidence_attachment_reference"],
    category: "storage",
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "object-storage-adapter",
    label: "Object storage adapter placeholder",
    liveCallEnabled: false,
    requiredBeforeProduction: false,
    requiredConfigKeys: ["CAMPAIGN_OS_OBJECT_STORAGE_BUCKET"],
    serviceIds: ["object-storage"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["contract_state_lookup", "reward_pool_lookup"],
    category: "contract_reader",
    failureMode: "live_adapter_deferred",
    forbiddenInLocalReview: true,
    id: "contract-reader-adapter",
    label: "Contract reader adapter placeholder",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_CONTRACT_READER_ENDPOINT"],
    serviceIds: ["aelf-contract-reader"],
    status: "deferred",
  }),
  providerGroup({
    capabilities: ["reward_distribution_handoff", "settlement_transaction_handoff"],
    category: "contract_writer",
    failureMode: "fail_closed_until_configured",
    forbiddenInLocalReview: true,
    id: "contract-writer-adapter",
    label: "Contract writer adapter placeholder",
    liveCallEnabled: false,
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT"],
    serviceIds: ["aelf-contract-writer"],
    status: "blocked",
  }),
];

const productionPreconditions: ProductionPrecondition[] = [
  {
    code: "PROVIDER_REGISTRY_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
    message: "Provider registry endpoint is required before production provider routing.",
    requiredKeys: ["CAMPAIGN_OS_PROVIDER_REGISTRY_URL"],
  },
  {
    code: "INDEXER_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_INDEXER_ENDPOINT",
    message: "Indexer endpoint is required before AeFinder/AelfScan verification handoff.",
    requiredKeys: ["CAMPAIGN_OS_INDEXER_ENDPOINT"],
  },
  {
    code: "PROVIDER_CREDENTIALS_MISSING",
    field: "CAMPAIGN_OS_PROVIDER_CREDENTIALS",
    message: "Provider credentials must be configured through a secret boundary before production.",
    requiredKeys: [
      "CAMPAIGN_OS_PROVIDER_CREDENTIALS",
      "CAMPAIGN_OS_SOCIAL_API_TOKEN",
      "CAMPAIGN_OS_AI_PROVIDER_TOKEN",
    ],
  },
  {
    code: "DEGRADATION_POLICY_MISSING",
    field: "CAMPAIGN_OS_DEGRADATION_POLICY",
    message: "Provider degradation policy is required before live provider failures can be handled.",
    requiredKeys: ["CAMPAIGN_OS_DEGRADATION_POLICY"],
  },
  {
    code: "WORKER_HANDOFF_MISSING",
    field: "CAMPAIGN_OS_WORKER_QUEUE_URL",
    message: "Worker handoff must be configured before provider/indexer jobs can execute.",
    requiredKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
  },
];

const verificationSourceCoverage: VerificationSourceCoverageSummary = {
  categories: ["wallet_auth", "indexer", "dapp_api", "social_api", "manual_review"],
  summaryCount: 5,
};

const isProviderIndexerProfileId = (value: string): value is ProviderIndexerProfileId =>
  SUPPORTED_PROVIDER_INDEXER_PROFILES.includes(value as ProviderIndexerProfileId);

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.some((key) => {
    const value = env[key];
    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const createDiagnostic = (
  code: ProviderIndexerDiagnosticCode,
  field: string,
  message: string,
  severity: ProviderIndexerDiagnosticSeverity = "error",
): ProviderIndexerDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: ProviderIndexerDiagnostic[]; profileId: ProviderIndexerProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isProviderIndexerProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      createDiagnostic(
        "UNKNOWN_PROVIDER_INDEXER_PROFILE",
        "profileId",
        `Unsupported provider/indexer profile: ${redactProviderIndexerValue(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const createProductionDiagnostics = (env: Record<string, unknown>): ProviderIndexerDiagnostic[] =>
  productionPreconditions
    .filter((precondition) => !hasConfiguredValue(env, precondition.requiredKeys))
    .map((precondition) =>
      createDiagnostic(precondition.code, precondition.field, precondition.message),
    );

const createProviderClientRegistryProjection = (
  env: Record<string, unknown>,
  profileId: ProviderIndexerProfileId,
): ProviderClientRegistryProjection => {
  const readiness = createProviderIndexerClientReadiness({ env, profileId });
  const missingPreconditionRefs = providerClientProductionPreconditions
    .filter((precondition) => readiness.diagnosticCodes.includes(precondition.diagnosticCode))
    .map((precondition) => precondition.id);

  return {
    adapterFoundationId: "campaign-os-provider-indexer-foundation",
    blockerCount: readiness.blockerCount,
    clientReadinessId: readiness.id,
    diagnosticCodes: readiness.diagnosticCodes,
    entries: providerIndexerAdapterGroups.map((group) => ({
      ...group.clientReadiness,
      adapterGroupCategory: group.category,
      adapterGroupId: group.id,
      adapterGroupStatus: group.status,
      liveProviderCallsAttempted: false,
      productionReady: false,
      readinessStatus: readiness.status,
    })),
    executionBoundary: "metadata_only_no_sdk_no_live_calls",
    liveProviderCallsAttempted: false,
    missingPreconditionRefs,
    productionReady: false,
    providerClientsEnabled: readiness.providerClientsEnabled,
    registryPresent: true,
    source: "provider-indexer-client-readiness",
    status: readiness.status,
  };
};

export const redactProviderIndexerValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactProviderIndexerValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveProviderKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactProviderIndexerValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawProviderPayload(value)) {
    return rawPayloadValue;
  }

  if (isCredentialedUrl(value) || isSensitiveProviderString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

export const createProviderIndexerFoundation = (
  options: CreateProviderIndexerFoundationOptions = {},
): ProviderIndexerFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [...profileResolution.diagnostics, ...productionDiagnostics];
  const blockerCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);

  return {
    blockerCount,
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    diagnostics,
    id: "campaign-os-provider-indexer-foundation",
    noLiveFlags: providerIndexerNoLiveFlags,
    productionReady: false,
    profileId: profileResolution.profileId,
    providerClientRegistry: createProviderClientRegistryProjection(env, profileResolution.profileId),
    providerGroupCount: providerIndexerAdapterGroups.length,
    providerGroups: providerIndexerAdapterGroups,
    status,
    valid: profileResolution.valid && blockerCount === 0,
    verificationSourceCoverage,
  };
};

const resolveStatus = (
  profileId: ProviderIndexerProfileId,
  blockerCount: number,
): ProviderIndexerFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "staging-scaffold" ? "scaffolded" : "local_ready";
};

const isSensitiveProviderKey = (key: string): boolean =>
  /api[-_]?key|bearer|token|secret|object[-_]?key|signed[-_]?url|webhook[-_]?secret|social[-_]?token|credential|payload/i.test(
    key,
  );

const isSensitiveProviderString = (value: string): boolean =>
  /(api[-_]?key|bearer\s+|token=|secret|x-amz-signature=|webhook|social-token|plain-secret|object-key)/i.test(
    value,
  );

const isCredentialedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return Boolean(url.username || url.password || url.searchParams.size > 0);
  } catch {
    return false;
  }
};

const isRawProviderPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|payload|score|provider|wallet|raw/i.test(trimmed);
};
