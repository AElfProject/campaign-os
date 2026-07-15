import type { BackendRuntimeProfileId } from "./backendProfiles";

export type ProviderHttpRuntimeProfileId = BackendRuntimeProfileId;
export type ProviderHttpRuntimeStatus = "disabled" | "blocked" | "failed" | "activated";
export type ProviderHttpActivationStatus =
  | "disabled"
  | "metadata_only"
  | "activation_required"
  | "explicitly_enabled";
export type ProviderHttpEndpointCategory = "indexer" | "dapp_api" | "social_api" | "ai_provider";
export type ProviderHttpProviderFamily =
  | "aefinder"
  | "aelfscan"
  | "ai-provider"
  | "awaken"
  | "daipp"
  | "ebridge"
  | "forecast"
  | "forest-schrodinger"
  | "pay"
  | "portfolio"
  | "social-api"
  | "tmrwdao";
export type ProviderEndpointRolloutStatus = "blocked" | "deferred" | "disabled" | "enabled";
export type ProviderHttpMethod = "GET" | "POST";
export type ProviderHttpVerificationType =
  | "WALLET"
  | "ON_CHAIN"
  | "DAPP_API"
  | "SOCIAL"
  | "MANUAL";
export type ProviderHttpBindingCompatibilityStatus =
  | "compatible"
  | "disabled"
  | "incompatible";
export type ProviderHttpBindingCompatibilityDiagnosticCode =
  | "PROVIDER_HTTP_BINDING_DISABLED"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_BLOCKED"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_DEFERRED"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_DISABLED"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_DUPLICATED"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_NOT_FOUND"
  | "PROVIDER_HTTP_BINDING_ENDPOINT_CATEGORY_MISMATCH"
  | "PROVIDER_HTTP_BINDING_FAMILY_MISMATCH"
  | "PROVIDER_HTTP_BINDING_GROUP_MISMATCH"
  | "PROVIDER_HTTP_BINDING_INVALID_SHAPE"
  | "PROVIDER_HTTP_BINDING_MAPPING_PAIR_MISMATCH"
  | "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_MISMATCH"
  | "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_UNSUPPORTED"
  | "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_MISMATCH"
  | "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_UNSUPPORTED"
  | "PROVIDER_HTTP_BINDING_TYPE_MAPPING_MISMATCH"
  | "PROVIDER_HTTP_BINDING_VERIFICATION_TYPE_MISMATCH";
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
  | "PROVIDER_HTTP_UNSAFE_CONFIG"
  | "PROVIDER_HTTP_ENDPOINT_BLOCKED"
  | "PROVIDER_HTTP_ENDPOINT_DISABLED"
  | "PROVIDER_HTTP_ENDPOINT_DEFERRED"
  | "PROVIDER_HTTP_ENDPOINT_REQUIRED_CONFIG_MISSING"
  | "PROVIDER_HTTP_ENDPOINT_UNSAFE_CONFIG"
  | "PROVIDER_HTTP_ENDPOINT_UNSUPPORTED_CATEGORY";
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
  providerFamily: ProviderHttpProviderFamily;
  providerGroupId: string;
  requiredConfigKeys: string[];
  requestMappingId: string;
  responseMappingId: string;
  retryPolicyRef: string;
  rolloutStatus: ProviderEndpointRolloutStatus;
  supportedVerificationTypes: ProviderHttpVerificationType[];
  timeoutPolicyRef: string;
  urlTemplateRef: string;
}

export interface ProviderHttpVerificationBinding {
  readonly id: string;
  readonly verificationType: Extract<ProviderHttpVerificationType, "ON_CHAIN" | "DAPP_API">;
}

export interface ProviderHttpVerificationEndpointBinding {
  readonly endpointId: string;
  readonly providerFamily: ProviderHttpProviderFamily;
  readonly providerGroupId: string;
  readonly requestMappingId: string;
  readonly responseMappingId: string;
}

export interface ProviderHttpBindingCompatibilityInput {
  readonly binding: ProviderHttpVerificationBinding;
  readonly enabled: boolean;
  readonly endpoint: ProviderHttpVerificationEndpointBinding;
}

export interface ProviderHttpBindingCompatibilitySummary {
  readonly bindingId: string;
  readonly diagnosticCodes: readonly ProviderHttpBindingCompatibilityDiagnosticCode[];
  readonly diagnosticCount: number;
  readonly endpointId: string;
  readonly providerFamily: string;
  readonly providerGroupId: string;
  readonly requestMappingId: string;
  readonly responseMappingId: string;
  readonly status: ProviderHttpBindingCompatibilityStatus;
  readonly verificationType: string;
}

export interface ProviderEndpointRolloutDiagnostic {
  code:
    | "PROVIDER_HTTP_ENDPOINT_BLOCKED"
    | "PROVIDER_HTTP_ENDPOINT_DISABLED"
    | "PROVIDER_HTTP_ENDPOINT_DEFERRED"
    | "PROVIDER_HTTP_ENDPOINT_REQUIRED_CONFIG_MISSING"
    | "PROVIDER_HTTP_ENDPOINT_UNSAFE_CONFIG"
    | "PROVIDER_HTTP_ENDPOINT_UNSUPPORTED_CATEGORY";
  endpointId?: string;
  field: string;
  message: string;
  redactedFields: string[];
  severity: ProviderHttpDiagnosticSeverity;
}

export interface ProviderEndpointRolloutSummary {
  blockedCount: number;
  configuredCategories: ProviderHttpEndpointCategory[];
  deferredCount: number;
  diagnosticCodes: ProviderEndpointRolloutDiagnostic["code"][];
  diagnostics: ProviderEndpointRolloutDiagnostic[];
  disabledCount: number;
  enabledCount: number;
  endpointCount: number;
  providerFamilies: ProviderHttpProviderFamily[];
  requiredConfigKeys: string[];
  valid: boolean;
}

export interface ProviderHttpRuntimeSummary {
  activationStatus: ProviderHttpActivationStatus;
  blockerCount: number;
  configuredCategories: ProviderHttpEndpointCategory[];
  diagnosticCodes: ProviderHttpDiagnosticCode[];
  diagnostics: ProviderHttpDiagnostic[];
  downstreamLiveFlags: ProviderHttpDownstreamLiveFlags;
  endpointCount: number;
  endpointRollout: ProviderEndpointRolloutSummary;
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
