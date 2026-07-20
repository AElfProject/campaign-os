import type {
  ApiSkillApiGroup,
  ApiSkillContractReadiness,
  ApiSkillId,
  LocalizedText,
  RiskLevel,
} from "../domain/types";

export type ApiRuntimeMethod = "GET" | "POST";
export type ApiRuntimeSupportMode = "local_seeded" | "postgres_live" | "provider_live";
export type ApiRuntimeServiceGroupId =
  | "runtime"
  | "service_registry"
  | "wallet_session"
  | "campaign"
  | "task"
  | "verification"
  | "eligibility"
  | "analytics"
  | "i18n"
  | "export";

export type ApiRuntimeCapabilityId =
  | "local_api_runtime"
  | "local_persistence_adapter"
  | "production_database"
  | "migration_runner"
  | "auth_session"
  | "provider_adapters"
  | "worker_queue"
  | "scheduler"
  | "contract_writer"
  | "object_storage_export"
  | "reward_custody"
  | "reward_distribution"
  | "sensitive_material_boundary";

export type ApiRuntimeCapabilityCategory =
  | "local_adapter"
  | "production_dependency"
  | "safety_boundary";
export type ApiRuntimeCapabilityStatus = "ready" | "local_only" | "deferred" | "disabled" | "blocked";

export interface ApiRuntimeServiceGroup {
  deferredDependencies: ApiRuntimeCapabilityId[];
  id: ApiRuntimeServiceGroupId;
  label: LocalizedText;
  readiness: ApiSkillContractReadiness;
  summary: LocalizedText;
  supportMode: ApiRuntimeSupportMode;
}

export interface ApiRuntimeCapability {
  category: ApiRuntimeCapabilityCategory;
  id: ApiRuntimeCapabilityId;
  requiredForProduction: boolean;
  riskLevel: RiskLevel;
  status: ApiRuntimeCapabilityStatus;
  summary: LocalizedText;
}

export interface ApiRuntimeCapabilitySummary {
  blockedCount: number;
  deferredCount: number;
  disabledCount: number;
  localOnlyCount: number;
  readyCount: number;
  totalCapabilities: number;
}

export interface ApiRuntimeCapabilityCatalog {
  items: ApiRuntimeCapability[];
  summary: ApiRuntimeCapabilitySummary;
}

export interface ApiRuntimeRouteContract {
  apiGroup: ApiSkillApiGroup | "runtime" | "service_registry";
  apiSkillId?: ApiSkillId;
  boundary: LocalizedText;
  id: string;
  method: ApiRuntimeMethod;
  path: string;
  productionDependencies: ApiRuntimeCapabilityId[];
  readiness: ApiSkillContractReadiness;
  riskLevel: RiskLevel;
  serviceGroup: ApiRuntimeServiceGroupId;
  summary: LocalizedText;
  supportMode: ApiRuntimeSupportMode;
}

export interface ApiRuntimeContractCoverage {
  coveredSkillIds: ApiSkillId[];
  deferredSkillIds: ApiSkillId[];
  routeCount: number;
  routeIds: string[];
}
