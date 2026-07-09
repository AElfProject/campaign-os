import { requiredApiSkillIds } from "../domain/apiSkillContracts";
import type { ApiSkillId } from "../domain/types";
import {
  backendRuntimeProfileById,
  productionBackendRequiredConfigKeys,
  type BackendRuntimeProfile,
} from "./backendProfiles";
import {
  backendRuntimeTracePolicy,
  createBackendRuntimeActivationContract,
  productionRuntimeDependencyBlockers,
  type BackendRuntimeActivationContract,
  type ProductionRuntimeDependencyArea,
  type ProductionRuntimeDependencyStatus,
} from "./backendRuntimeActivation";
import type { ApiRuntimeContractCoverage, ApiRuntimeRouteContract } from "./contracts";
import { apiRuntimeRoutes, createApiRuntimeContractCoverage } from "./routes";
import { resolveApiServerRuntimeContract, type ApiServerRuntimeContract } from "./serverRuntime";

export type ProductionBackendReadinessStatus = "blocked" | "ready" | "scaffold";
export type ProductionBackendReadinessDiagnosticSeverity = "error" | "info" | "warning";
export type ProductionBackendReadinessDiagnosticCode =
  | "PRODUCTION_BACKEND_MISSING_CONFIG"
  | "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS"
  | "PRODUCTION_BACKEND_PROFILE_BLOCKED"
  | "PRODUCTION_BACKEND_ROUTE_COVERAGE_BLOCKED"
  | "PRODUCTION_BACKEND_STAGING_SCAFFOLD";

export interface ProductionBackendReadinessDiagnostic {
  code: ProductionBackendReadinessDiagnosticCode;
  message: string;
  safeDetails?: Record<string, boolean | number | string>;
  severity: ProductionBackendReadinessDiagnosticSeverity;
}

export interface ProductionBackendReadinessProfile {
  configuredRequiredConfigKeys: string[];
  externalNetworkAllowed: boolean;
  id: BackendRuntimeProfile["id"];
  label: string;
  missingRequiredConfigKeys: string[];
  requiredConfigKeys: string[];
  requiresSecrets: boolean;
  secretValuesExposed: false;
  status: BackendRuntimeProfile["status"];
  supportMode: BackendRuntimeProfile["supportMode"];
}

export interface ProductionBackendRouteCoverage {
  blockedCount: number;
  coveredApiSkillCount: number;
  localOnlyCount: number;
  missingApiSkillIds: ApiSkillId[];
  readyCount: number;
  requiredApiSkillCount: number;
  reviewRequiredCount: number;
  routeCount: number;
  routeIds: string[];
  runtimeRouteCount: number;
}

export interface ProductionBackendDeployHandoff {
  contractsEndpoint: "/api/contracts";
  healthEndpoint: "/api/health";
  runtimeTarget: "api_service";
  shutdownTimeoutMs: number;
  smokeCommand: "npm run server:smoke";
  startCommand: "npm run server:start";
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface ProductionBackendTracePolicy {
  failureEnvelopeTraceId: true;
  startupLogIncludesTracePolicy: true;
  successEnvelopeTraceId: true;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface ProductionDependencyBlockerSummary {
  area: ProductionRuntimeDependencyArea;
  attachPoint: string;
  blockedBy: string[];
  id: string;
  requiredBeforeProduction: true;
  status: ProductionRuntimeDependencyStatus;
}

export interface NoLiveSideEffectBoundary {
  analyticsWarehouseWriteExecuted: false;
  authProviderConnected: false;
  contractWriteExecuted: false;
  objectStorageWriteExecuted: false;
  productionDatabaseConnected: false;
  providerNetworkExecuted: false;
  queueWorkerExecuted: false;
  rewardCustodyExecuted: false;
  rewardDistributionExecuted: false;
  schedulerExecuted: false;
  walletSdkExecuted: false;
}

export interface ProductionBackendReadinessSummary {
  deployHandoff: ProductionBackendDeployHandoff;
  diagnostics: ProductionBackendReadinessDiagnostic[];
  generatedAt: string;
  id: "production-backend-runtime-readiness";
  noLiveSideEffects: NoLiveSideEffectBoundary;
  productionDependencyBlockers: ProductionDependencyBlockerSummary[];
  productionReady: false;
  profile: ProductionBackendReadinessProfile;
  routeCoverage: ProductionBackendRouteCoverage;
  status: ProductionBackendReadinessStatus;
  tracePolicy: ProductionBackendTracePolicy;
}

export interface CreateProductionBackendReadinessSummaryOptions {
  activation?: BackendRuntimeActivationContract;
  env?: Record<string, string | undefined>;
  generatedAt?: Date | string;
  routeCoverage?: ApiRuntimeContractCoverage;
  routes?: readonly ApiRuntimeRouteContract[];
  runtime?: ApiServerRuntimeContract;
}

export const noLiveSideEffectBoundary: NoLiveSideEffectBoundary = {
  analyticsWarehouseWriteExecuted: false,
  authProviderConnected: false,
  contractWriteExecuted: false,
  objectStorageWriteExecuted: false,
  productionDatabaseConnected: false,
  providerNetworkExecuted: false,
  queueWorkerExecuted: false,
  rewardCustodyExecuted: false,
  rewardDistributionExecuted: false,
  schedulerExecuted: false,
  walletSdkExecuted: false,
};

const cloneNoLiveSideEffectBoundary = (): NoLiveSideEffectBoundary => ({
  ...noLiveSideEffectBoundary,
});

const configuredKeys = (
  env: Record<string, string | undefined>,
  requiredKeys: readonly string[],
): string[] =>
  requiredKeys.filter((key) => {
    const value = env[key];

    return typeof value === "string" && value.trim().length > 0;
  });

const missingKeys = (
  env: Record<string, string | undefined>,
  requiredKeys: readonly string[],
): string[] => {
  const configured = new Set(configuredKeys(env, requiredKeys));

  return requiredKeys.filter((key) => !configured.has(key));
};

export const createProductionBackendReadinessProfile = (
  profile: BackendRuntimeProfile,
  env: Record<string, string | undefined> = {},
): ProductionBackendReadinessProfile => {
  const requiredConfigKeys = [...profile.requiredConfigKeys];

  return {
    configuredRequiredConfigKeys: configuredKeys(env, requiredConfigKeys),
    externalNetworkAllowed: profile.externalNetworkAllowed,
    id: profile.id,
    label: profile.label,
    missingRequiredConfigKeys: missingKeys(env, requiredConfigKeys),
    requiredConfigKeys,
    requiresSecrets: profile.requiresSecrets,
    secretValuesExposed: false,
    status: profile.status,
    supportMode: profile.supportMode,
  };
};

export const createProductionBackendRouteCoverage = (
  routes: readonly ApiRuntimeRouteContract[] = apiRuntimeRoutes,
  coverage: ApiRuntimeContractCoverage = createApiRuntimeContractCoverage(),
): ProductionBackendRouteCoverage => {
  const countByReadiness = routes.reduce(
    (counts, route) => {
      counts[route.readiness] += 1;

      return counts;
    },
    {
      blocked: 0,
      local_only: 0,
      ready: 0,
      review_required: 0,
    },
  );

  return {
    blockedCount: countByReadiness.blocked,
    coveredApiSkillCount: coverage.coveredSkillIds.length,
    localOnlyCount: countByReadiness.local_only,
    missingApiSkillIds: [...coverage.deferredSkillIds],
    readyCount: countByReadiness.ready,
    requiredApiSkillCount: requiredApiSkillIds.length,
    reviewRequiredCount: countByReadiness.review_required,
    routeCount: routes.length,
    routeIds: routes.map((route) => route.id),
    runtimeRouteCount: routes.filter((route) => route.serviceGroup === "runtime").length,
  };
};

export const createProductionBackendDeployHandoff = (
  activation: BackendRuntimeActivationContract,
): ProductionBackendDeployHandoff => ({
  contractsEndpoint: activation.deploymentHandoff.contractsEndpoint,
  healthEndpoint: activation.deploymentHandoff.healthEndpoint,
  runtimeTarget: activation.deploymentHandoff.runtimeTarget,
  shutdownTimeoutMs: activation.deploymentHandoff.shutdown.shutdownTimeoutMs,
  smokeCommand: activation.deploymentHandoff.smokeCommand,
  startCommand: activation.deploymentHandoff.startCommand,
  traceHeaderName: activation.deploymentHandoff.tracePolicy.traceHeaderName,
});

export const createProductionDependencyBlockerSummaries = (): ProductionDependencyBlockerSummary[] =>
  productionRuntimeDependencyBlockers.map((blocker) => ({
    area: blocker.area,
    attachPoint: blocker.attachPoint,
    blockedBy: [...blocker.blockedBy],
    id: blocker.id,
    requiredBeforeProduction: blocker.requiredBeforeProduction,
    status: blocker.status,
  }));

const readinessDiagnostic = (
  diagnostic: ProductionBackendReadinessDiagnostic,
): ProductionBackendReadinessDiagnostic => diagnostic;

const createDiagnostics = (
  profile: ProductionBackendReadinessProfile,
  routeCoverage: ProductionBackendRouteCoverage,
): ProductionBackendReadinessDiagnostic[] => {
  const diagnostics: ProductionBackendReadinessDiagnostic[] = [
    readinessDiagnostic({
      code: "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS",
      message: "Production backend readiness is review-only; no live side effects are enabled.",
      severity: "info",
    }),
  ];

  if (profile.id === "staging-scaffold") {
    diagnostics.push(
      readinessDiagnostic({
        code: "PRODUCTION_BACKEND_STAGING_SCAFFOLD",
        message: "Staging scaffold is review-safe and does not require secrets in this mission.",
        severity: "info",
      }),
    );
  }

  if (profile.id === "production-required") {
    diagnostics.push(
      readinessDiagnostic({
        code: "PRODUCTION_BACKEND_PROFILE_BLOCKED",
        message: "Production-required profile is blocked until production dependencies and approvals exist.",
        safeDetails: {
          missingRequiredConfigKeyCount: profile.missingRequiredConfigKeys.length,
          requiredConfigKeyCount: profile.requiredConfigKeys.length,
        },
        severity: "error",
      }),
    );
  }

  if (profile.missingRequiredConfigKeys.length > 0) {
    diagnostics.push(
      readinessDiagnostic({
        code: "PRODUCTION_BACKEND_MISSING_CONFIG",
        message: "Required production config keys are missing; only key names are reported.",
        safeDetails: {
          missingRequiredConfigKeys: profile.missingRequiredConfigKeys.join(", "),
        },
        severity: "error",
      }),
    );
  }

  if (routeCoverage.missingApiSkillIds.length > 0) {
    diagnostics.push(
      readinessDiagnostic({
        code: "PRODUCTION_BACKEND_ROUTE_COVERAGE_BLOCKED",
        message: "Runtime routes do not cover all required API skill ids.",
        safeDetails: {
          missingApiSkillIds: routeCoverage.missingApiSkillIds.join(", "),
        },
        severity: "error",
      }),
    );
  }

  return diagnostics;
};

const resolveStatus = (
  profile: ProductionBackendReadinessProfile,
  routeCoverage: ProductionBackendRouteCoverage,
): ProductionBackendReadinessStatus => {
  if (
    profile.status === "blocked"
    || profile.missingRequiredConfigKeys.length > 0
    || routeCoverage.missingApiSkillIds.length > 0
  ) {
    return "blocked";
  }

  if (profile.status === "scaffold" || profile.id === "staging-scaffold") {
    return "scaffold";
  }

  return "ready";
};

const normalizeGeneratedAt = (generatedAt: Date | string | undefined): string => {
  if (typeof generatedAt === "string") {
    return generatedAt;
  }

  return (generatedAt ?? new Date()).toISOString();
};

export const createProductionBackendReadinessSummary = ({
  activation,
  env = {},
  generatedAt,
  routeCoverage,
  routes = apiRuntimeRoutes,
  runtime,
}: CreateProductionBackendReadinessSummaryOptions = {}): ProductionBackendReadinessSummary => {
  const resolvedRuntime = runtime ?? resolveApiServerRuntimeContract({ env });
  const resolvedActivation = activation ?? createBackendRuntimeActivationContract({ runtime: resolvedRuntime });
  const profile = createProductionBackendReadinessProfile(resolvedRuntime.profile, env);
  const coverage = createProductionBackendRouteCoverage(routes, routeCoverage ?? createApiRuntimeContractCoverage());

  return {
    deployHandoff: createProductionBackendDeployHandoff(resolvedActivation),
    diagnostics: createDiagnostics(profile, coverage),
    generatedAt: normalizeGeneratedAt(generatedAt),
    id: "production-backend-runtime-readiness",
    noLiveSideEffects: cloneNoLiveSideEffectBoundary(),
    productionDependencyBlockers: createProductionDependencyBlockerSummaries(),
    productionReady: false,
    profile,
    routeCoverage: coverage,
    status: resolveStatus(profile, coverage),
    tracePolicy: { ...backendRuntimeTracePolicy },
  };
};

export const seededProductionBackendReadinessSummary = (): ProductionBackendReadinessSummary =>
  createProductionBackendReadinessSummary({
    env: {},
    generatedAt: "2026-07-09T18:53:49.000Z",
    runtime: resolveApiServerRuntimeContract({
      env: {},
      profileId: backendRuntimeProfileById["local-review"].id,
      startedAt: "2026-07-09T18:53:49.000Z",
    }),
  });

export const productionBackendReadinessRequiredConfigKeys = [...productionBackendRequiredConfigKeys];
