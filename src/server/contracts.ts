import type {
  ApiSkillApiGroup,
  ApiSkillContractReadiness,
  ApiSkillId,
  LocalizedText,
  RiskLevel,
} from "../domain/types";

export type ApiRuntimeMethod = "GET" | "POST";
export type ApiRuntimeSupportMode = "local_seeded";

export interface ApiRuntimeRouteContract {
  apiGroup: ApiSkillApiGroup | "runtime" | "service_registry";
  apiSkillId?: ApiSkillId;
  boundary: LocalizedText;
  id: string;
  method: ApiRuntimeMethod;
  path: string;
  readiness: ApiSkillContractReadiness;
  riskLevel: RiskLevel;
  summary: LocalizedText;
  supportMode: ApiRuntimeSupportMode;
}

export interface ApiRuntimeContractCoverage {
  coveredSkillIds: ApiSkillId[];
  deferredSkillIds: ApiSkillId[];
  routeCount: number;
  routeIds: string[];
}
