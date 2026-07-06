import type { BackendServiceReadinessReport } from "./backendService";
import type { ApiRuntimeEnvelope } from "./envelope";
import type {
  ApiServerRuntimeContract,
  ServerRuntimeAttachPoint,
} from "./serverRuntime";

export type ServerRuntimeState = "live" | "ready" | "blocked" | "shutting_down" | "stopped";
export type ServerShutdownStateId = "running" | "stopping" | "stopped";

export interface ServerShutdownState {
  activeRequestCount: number;
  closedAt?: string;
  state: ServerShutdownStateId;
  stopStartedAt?: string;
}

export interface ServerRuntimeReadiness {
  corsPolicy: {
    allowedOriginCount: number;
    enabled: boolean;
    preflightHandledBeforeRuntime: true;
  };
  deferredAttachPoints: Array<{
    id: ServerRuntimeAttachPoint["id"];
    requiredBeforeProduction: boolean;
    status: ServerRuntimeAttachPoint["status"];
  }>;
  liveness: {
    live: boolean;
    startedAt: string;
    uptimeMs: number;
  };
  profileId: string;
  readiness: {
    authSession: {
      status: BackendServiceReadinessReport["authSession"]["status"];
      valid: boolean;
      verificationMode: BackendServiceReadinessReport["authSession"]["proofBoundary"]["verificationMode"];
    };
    backend: {
      diagnosticCodes: string[];
      entrypointId: string;
      supportMode: string;
      valid: boolean;
    };
    database: {
      adapterStatus: string;
      migrationPlanStatus: string;
      valid: boolean;
    };
  };
  requestGuard: {
    guardedFailureEnvelope: true;
    maxBodyBytes: number;
    traceHeaderName: "x-campaign-os-trace-id";
  };
  shutdownState: ServerShutdownState & {
    shutdownTimeoutMs: number;
  };
  startedAt: string;
  status: ServerRuntimeState;
  supportMode: string;
  uptimeMs: number;
}

export interface CreateServerRuntimeReadinessOptions {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  now?: Date;
  shutdownState?: ServerShutdownState;
}

const defaultShutdownState = (): ServerShutdownState => ({
  activeRequestCount: 0,
  state: "running",
});

const resolveStatus = ({
  backendReadiness,
  contract,
  shutdownState,
}: {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  shutdownState: ServerShutdownState;
}): ServerRuntimeState => {
  if (shutdownState.state === "stopped") {
    return "stopped";
  }

  if (shutdownState.state === "stopping") {
    return "shutting_down";
  }

  if (!contract.valid || !backendReadiness.validation.valid) {
    return "blocked";
  }

  return "ready";
};

export const createServerRuntimeReadiness = ({
  backendReadiness,
  contract,
  now = new Date(),
  shutdownState = defaultShutdownState(),
}: CreateServerRuntimeReadinessOptions): ServerRuntimeReadiness => {
  const uptimeMs = Math.max(0, now.getTime() - Date.parse(contract.startedAt));

  return {
    corsPolicy: {
      allowedOriginCount: contract.corsPolicy.allowedOrigins.length,
      enabled: contract.corsPolicy.enabled,
      preflightHandledBeforeRuntime: true,
    },
    deferredAttachPoints: contract.attachMap.map((attachPoint) => ({
      id: attachPoint.id,
      requiredBeforeProduction: attachPoint.requiredBeforeProduction,
      status: attachPoint.status,
    })),
    liveness: {
      live: shutdownState.state !== "stopped",
      startedAt: contract.startedAt,
      uptimeMs,
    },
    profileId: contract.profileId,
    readiness: {
      authSession: {
        status: backendReadiness.authSession.status,
        valid: backendReadiness.authSession.validation.valid,
        verificationMode: backendReadiness.authSession.proofBoundary.verificationMode,
      },
      backend: {
        diagnosticCodes: backendReadiness.validation.issues.map((issue) => issue.code),
        entrypointId: backendReadiness.entrypoint.id,
        supportMode: backendReadiness.entrypoint.supportMode,
        valid: backendReadiness.validation.valid,
      },
      database: {
        adapterStatus: backendReadiness.databaseReadiness.adapter.status,
        migrationPlanStatus: backendReadiness.databaseReadiness.migrationPlan.status,
        valid: backendReadiness.databaseReadiness.validation.valid,
      },
    },
    requestGuard: {
      guardedFailureEnvelope: true,
      maxBodyBytes: contract.requestGuard.maxBodyBytes,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    shutdownState: {
      ...shutdownState,
      shutdownTimeoutMs: contract.shutdown.shutdownTimeoutMs,
    },
    startedAt: contract.startedAt,
    status: resolveStatus({ backendReadiness, contract, shutdownState }),
    supportMode: contract.supportMode,
    uptimeMs,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const withServerRuntimeReadiness = <TPayload>(
  envelope: ApiRuntimeEnvelope<TPayload>,
  serverRuntime: ServerRuntimeReadiness,
): ApiRuntimeEnvelope<unknown> => {
  if (!envelope.ok || !isRecord(envelope.data)) {
    return envelope;
  }

  return {
    ...envelope,
    data: {
      ...envelope.data,
      serverRuntime,
    },
  };
};

