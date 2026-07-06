import type { ApiRuntimeCapabilityId, ApiRuntimeSupportMode } from "./contracts";

export type BackendRuntimeProfileId = "local-review" | "staging-scaffold" | "production-required";
export type BackendRuntimeProfileStatus = "ready" | "scaffold" | "blocked" | "deferred";
export type BackendProfileDiagnosticSeverity = "error" | "warning" | "info";
export type BackendProfileDiagnosticCode = "UNKNOWN_BACKEND_PROFILE";

export interface BackendProfileDiagnostic {
  code: BackendProfileDiagnosticCode;
  field: string;
  message: string;
  severity: BackendProfileDiagnosticSeverity;
}

export interface BackendRuntimeProfile {
  allowedCapabilities: ApiRuntimeCapabilityId[];
  deferredCapabilities: ApiRuntimeCapabilityId[];
  externalNetworkAllowed: boolean;
  id: BackendRuntimeProfileId;
  label: string;
  requiredConfigKeys: string[];
  requiresSecrets: boolean;
  status: BackendRuntimeProfileStatus;
  supportMode: ApiRuntimeSupportMode;
}

export interface BackendRuntimeProfileResolution {
  diagnostics: BackendProfileDiagnostic[];
  profile: BackendRuntimeProfile;
  requestedProfileId: string;
  valid: boolean;
}

const localBackendCapabilities: ApiRuntimeCapabilityId[] = [
  "local_api_runtime",
  "local_persistence_adapter",
  "sensitive_material_boundary",
];

export const deferredProductionBackendCapabilities: ApiRuntimeCapabilityId[] = [
  "production_database",
  "migration_runner",
  "auth_session",
  "provider_adapters",
  "worker_queue",
  "scheduler",
  "contract_writer",
  "object_storage_export",
  "reward_custody",
  "reward_distribution",
];

export const productionBackendRequiredConfigKeys = [
  "CAMPAIGN_OS_DATABASE_URL",
  "CAMPAIGN_OS_AUTH_SECRET",
  "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
  "CAMPAIGN_OS_WORKER_QUEUE_URL",
  "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
] as const;

const profile = (runtimeProfile: BackendRuntimeProfile): BackendRuntimeProfile => runtimeProfile;

export const backendRuntimeProfiles = [
  profile({
    allowedCapabilities: localBackendCapabilities,
    deferredCapabilities: deferredProductionBackendCapabilities,
    externalNetworkAllowed: false,
    id: "local-review",
    label: "Local review backend scaffold",
    requiredConfigKeys: [],
    requiresSecrets: false,
    status: "ready",
    supportMode: "local_seeded",
  }),
  profile({
    allowedCapabilities: localBackendCapabilities,
    deferredCapabilities: deferredProductionBackendCapabilities,
    externalNetworkAllowed: false,
    id: "staging-scaffold",
    label: "Staging scaffold backend profile",
    requiredConfigKeys: [],
    requiresSecrets: false,
    status: "scaffold",
    supportMode: "local_seeded",
  }),
  profile({
    allowedCapabilities: localBackendCapabilities,
    deferredCapabilities: deferredProductionBackendCapabilities,
    externalNetworkAllowed: true,
    id: "production-required",
    label: "Production-required backend profile",
    requiredConfigKeys: [...productionBackendRequiredConfigKeys],
    requiresSecrets: true,
    status: "blocked",
    supportMode: "local_seeded",
  }),
] as const satisfies readonly BackendRuntimeProfile[];

export const backendRuntimeProfileById = Object.fromEntries(
  backendRuntimeProfiles.map((runtimeProfile) => [runtimeProfile.id, runtimeProfile]),
) as Record<BackendRuntimeProfileId, BackendRuntimeProfile>;

export const DEFAULT_BACKEND_RUNTIME_PROFILE_ID: BackendRuntimeProfileId = "local-review";

export const isBackendRuntimeProfileId = (
  value: string | undefined,
): value is BackendRuntimeProfileId =>
  value === "local-review" || value === "staging-scaffold" || value === "production-required";

const unknownProfileDiagnostic = (requestedProfileId: string): BackendProfileDiagnostic => ({
  code: "UNKNOWN_BACKEND_PROFILE",
  field: "profileId",
  message: `Unsupported Campaign OS backend runtime profile: ${requestedProfileId}`,
  severity: "error",
});

export const resolveBackendRuntimeProfile = (
  requestedProfileId: string = DEFAULT_BACKEND_RUNTIME_PROFILE_ID,
): BackendRuntimeProfileResolution => {
  if (isBackendRuntimeProfileId(requestedProfileId)) {
    return {
      diagnostics: [],
      profile: backendRuntimeProfileById[requestedProfileId],
      requestedProfileId,
      valid: true,
    };
  }

  return {
    diagnostics: [unknownProfileDiagnostic(requestedProfileId)],
    profile: backendRuntimeProfileById["production-required"],
    requestedProfileId,
    valid: false,
  };
};
