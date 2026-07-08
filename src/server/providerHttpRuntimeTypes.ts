import type { BackendRuntimeProfileId } from "./backendProfiles";

export type ProviderHttpRuntimeProfileId = BackendRuntimeProfileId;
export type ProviderHttpRuntimeStatus = "disabled" | "blocked" | "failed" | "activated";
export type ProviderHttpActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type ProviderHttpEndpointCategory = "indexer" | "dapp_api" | "social_api" | "ai_provider";
export type ProviderHttpMethod = "GET" | "POST";
export type ProviderHttpVerificationType =
  | "WALLET"
  | "ON_CHAIN"
  | "DAPP_API"
  | "SOCIAL"
  | "MANUAL";
export type ProviderHttpOutcome =
  | "blocked"
  | "completed"
  | "disable_provider_task_templates"
  | "failed"
  | "manual_review"
  | "pending";
export type ProviderHttpDiagnosticSeverity = "blocker" | "error" | "info" | "warning";
export type ProviderHttpDiagnosticCode =
  | "UNKNOWN_PROVIDER_HTTP_PROFILE"
  | "PROVIDER_HTTP_RUNTIME_ACTIVATION_MISSING"
  | "PROVIDER_HTTP_ENDPOINT_REGISTRY_MISSING"
  | "PROVIDER_HTTP_ENDPOINT_REFERENCE_MISSING"
  | "PROVIDER_HTTP_CREDENTIAL_REFERENCE_MISSING"
  | "PROVIDER_HTTP_HEADER_REFERENCE_MISSING"
  | "PROVIDER_HTTP_TRANSPORT_SEAM_MISSING"
  | "PROVIDER_HTTP_TIMEOUT_POLICY_MISSING"
  | "PROVIDER_HTTP_RESPONSE_MAPPING_POLICY_MISSING"
  | "PROVIDER_HTTP_REDACTION_POLICY_MISSING"
  | "PROVIDER_HTTP_QUEUE_WORKER_HANDOFF_MISSING"
  | "PROVIDER_HTTP_IDEMPOTENCY_REFERENCE_MISSING"
  | "PROVIDER_HTTP_LEASE_REFERENCE_MISSING"
  | "PROVIDER_HTTP_RUNBOOK_MISSING"
  | "PROVIDER_HTTP_UNSAFE_CONFIG";
export type ProviderHttpPreconditionArea =
  | "activation"
  | "credential"
  | "endpoint"
  | "header"
  | "idempotency"
  | "lease"
  | "redaction"
  | "registry"
  | "response_mapping"
  | "runbook"
  | "timeout"
  | "transport"
  | "worker_queue";

export interface ProviderHttpDownstreamLiveFlags {
  alternateQueuePublishing: false;
  analyticsIngestion: false;
  contractCalls: false;
  liveTelemetryExport: false;
  objectStorageWrites: false;
  renderedUiBehavior: false;
  rewardDistribution: false;
  schedulerExecution: false;
}

export interface ProviderHttpDiagnostic {
  code: ProviderHttpDiagnosticCode;
  field: string;
  message: string;
  nextAction?: string;
  redactedFields: string[];
  severity: ProviderHttpDiagnosticSeverity;
}

export interface ProviderHttpProductionPrecondition {
  area: ProviderHttpPreconditionArea;
  diagnosticCode: ProviderHttpDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked";
}

export interface ProviderHttpEndpointEntry {
  category: ProviderHttpEndpointCategory;
  credentialRef: string;
  endpointId: string;
  headerRefs: string[];
  label: string;
  method: ProviderHttpMethod;
  providerGroupId: string;
  requestMappingId: string;
  responseMappingId: string;
  retryPolicyRef: string;
  supportedVerificationTypes: ProviderHttpVerificationType[];
  timeoutPolicyRef: string;
  urlTemplateRef: string;
}

export interface ProviderHttpRuntimeSummary {
  activationStatus: ProviderHttpActivationStatus;
  blockerCount: number;
  configuredCategories: ProviderHttpEndpointCategory[];
  diagnosticCodes: ProviderHttpDiagnosticCode[];
  diagnostics: ProviderHttpDiagnostic[];
  downstreamLiveFlags: ProviderHttpDownstreamLiveFlags;
  endpointCount: number;
  endpointRegistry: ProviderHttpEndpointEntry[];
  id: "campaign-os-provider-http-client-runtime";
  liveHttpCallsAttempted: boolean;
  preconditions: ProviderHttpProductionPrecondition[];
  productionReady: false;
  profileId: ProviderHttpRuntimeProfileId;
  requiredConfigKeys: string[];
  status: ProviderHttpRuntimeStatus;
  transportProvided: boolean;
  valid: boolean;
}

export interface CreateProviderHttpRuntimeSummaryOptions {
  endpointRegistry?: ProviderHttpEndpointEntry[];
  env?: Record<string, unknown>;
  profileId?: string;
  transportProvided?: boolean;
}
