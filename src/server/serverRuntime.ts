import {
  DEFAULT_BACKEND_RUNTIME_PROFILE_ID,
  productionBackendRequiredConfigKeys,
  resolveBackendRuntimeProfile,
  type BackendRuntimeProfile,
  type BackendRuntimeProfileId,
} from "./backendProfiles";
import {
  runtimeActivationConfigKeys,
  type RuntimeActivationConfigKey,
} from "./backendRuntimeActivation";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";

export type ServerRuntimeDiagnosticSeverity = "error" | "warning" | "info";
export type ServerRuntimeAttachPointStatus = "deferred" | "blocked";
export type ServerRuntimeAttachPointId =
  | "framework-decision"
  | "deployment-config"
  | "production-database-driver"
  | "auth-middleware"
  | "provider-adapters"
  | "worker-ingress"
  | "scheduler"
  | "contract-writer"
  | "observability-exporter"
  | "object-storage-export";
export type ServerRuntimeDiagnosticCode =
  | "SERVER_RUNTIME_INVALID_PORT"
  | "SERVER_RUNTIME_INVALID_BODY_LIMIT"
  | "SERVER_RUNTIME_INVALID_SHUTDOWN_TIMEOUT"
  | "SERVER_RUNTIME_UNKNOWN_PROFILE"
  | "SERVER_RUNTIME_PRODUCTION_BLOCKED";

export interface ServerRuntimeDiagnostic {
  code: ServerRuntimeDiagnosticCode;
  field: string;
  message: string;
  severity: ServerRuntimeDiagnosticSeverity;
}

export interface ServerRequestGuardPolicy {
  allowedMethods: string[];
  guardedFailureEnvelope: true;
  jsonContentTypes: string[];
  maxBodyBytes: number;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface ServerCorsPolicy {
  allowedHeaders: string[];
  allowedMethods: string[];
  allowedOrigins: string[];
  enabled: boolean;
  maxAgeSeconds: number;
  preflightHandledBeforeRuntime: true;
}

export interface GracefulShutdownPolicy {
  shutdownTimeoutMs: number;
}

export interface ServerRuntimeAttachPoint {
  blockedBy: string[];
  id: ServerRuntimeAttachPointId;
  note: string;
  requiredBeforeProduction: boolean;
  status: ServerRuntimeAttachPointStatus;
}

export interface ApiServerRuntimeContract {
  attachMap: ServerRuntimeAttachPoint[];
  corsPolicy: ServerCorsPolicy;
  diagnostics: ServerRuntimeDiagnostic[];
  environmentKeys: RuntimeActivationConfigKey[];
  host: string;
  port: number;
  profile: BackendRuntimeProfile;
  profileId: BackendRuntimeProfileId;
  requestGuard: ServerRequestGuardPolicy;
  runtimeVersion: string;
  shutdown: GracefulShutdownPolicy;
  startedAt: string;
  supportMode: BackendRuntimeProfile["supportMode"];
  valid: boolean;
}

export interface ResolveApiServerRuntimeContractOptions {
  allowedCorsOrigins?: string[];
  env?: Record<string, string | undefined>;
  host?: string;
  maxBodyBytes?: number;
  port?: number;
  profileId?: string;
  shutdownTimeoutMs?: number;
  startedAt?: string;
  version?: string;
}

export interface ServerStartupDiagnostics {
  attachPointCount: number;
  blockedAttachPointCount: number;
  corsEnabled: boolean;
  deferredAttachPointIds: ServerRuntimeAttachPointId[];
  diagnosticCodes: ServerRuntimeDiagnosticCode[];
  host: string;
  maxBodyBytes: number;
  port: number;
  profileId: BackendRuntimeProfileId;
  runtimeVersion: string;
  shutdownTimeoutMs: number;
  startedAt: string;
  supportMode: BackendRuntimeProfile["supportMode"];
  valid: boolean;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5174;
const DEFAULT_VERSION = "0.2.0-local";
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;
const DEFAULT_CORS_MAX_AGE_SECONDS = 600;
const DEFAULT_VITE_DEV_PORTS = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5184] as const;
const DEFAULT_CORS_ORIGINS = DEFAULT_VITE_DEV_PORTS.flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);
const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "OPTIONS"] as const;
const DEFAULT_ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-campaign-os-account-type",
  "x-campaign-os-credential-boundary",
  "x-campaign-os-proof-status",
  "x-campaign-os-roles",
  "x-campaign-os-session-id",
  "x-campaign-os-trace-id",
  "x-campaign-os-wallet-address",
  "x-campaign-os-wallet-source",
] as const;
const DEFAULT_JSON_CONTENT_TYPES = ["application/json"] as const;

export const serverRuntimeAttachMap: ServerRuntimeAttachPoint[] = [
  {
    blockedBy: ["deployment target decision", "framework adapter comparison"],
    id: "framework-decision",
    note: "Mission 171 keeps Node http; framework selection is deferred.",
    requiredBeforeProduction: false,
    status: "deferred",
  },
  {
    blockedBy: ["container image", "reverse proxy", "runtime environment config"],
    id: "deployment-config",
    note: "No container, TLS termination, or cloud deployment manifest is active.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["production DB adapter", "live migration runner"],
    id: "production-database-driver",
    note: "Production persistence remains readiness metadata only.",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    blockedBy: ["wallet signature verifier", "session issuer", "RBAC enforcement"],
    id: "auth-middleware",
    note: "Auth/session readiness exists, but live enforcement is deferred.",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    blockedBy: ["provider registry", "degradation policy", "service credentials"],
    id: "provider-adapters",
    note: "AeFinder, AelfScan, social, AI, and wallet provider calls are not active.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["queue provider selection", "worker runtime mission"],
    id: "worker-ingress",
    note: "No background worker or queue ingress runs in Mission 171.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["scheduler runtime", "retry and backoff policy"],
    id: "scheduler",
    note: "No cron, delayed job, or campaign scheduler runs in Mission 171.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: [...contractWriterRequiredConfigKeys],
    id: "contract-writer",
    note: "Contract mutations remain disabled until endpoint, signer policy, approvals, ABI, idempotency, queue, observability, runbook, and live enablement refs exist.",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    blockedBy: ["metrics exporter", "structured log sink", "trace collector"],
    id: "observability-exporter",
    note: "Mission 171 exposes local metadata only; external observability export is deferred.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["object storage adapter", "signed URL safety review"],
    id: "object-storage-export",
    note: "Export fulfillment remains local preview only.",
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const diagnostic = (
  code: ServerRuntimeDiagnosticCode,
  field: string,
  message: string,
  severity: ServerRuntimeDiagnosticSeverity = "error",
): ServerRuntimeDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const parsePositiveInteger = (
  explicitValue: number | undefined,
  envValue: string | undefined,
  defaultValue: number,
  field: string,
  code: ServerRuntimeDiagnosticCode,
): {
  diagnostics: ServerRuntimeDiagnostic[];
  value: number;
} => {
  if (explicitValue !== undefined) {
    if (Number.isInteger(explicitValue) && explicitValue >= 0) {
      return { diagnostics: [], value: explicitValue };
    }

    return {
      diagnostics: [
        diagnostic(code, field, `Invalid Campaign OS server runtime ${field}.`),
      ],
      value: defaultValue,
    };
  }

  if (envValue === undefined || envValue.trim() === "") {
    return { diagnostics: [], value: defaultValue };
  }

  const parsed = Number.parseInt(envValue, 10);

  if (Number.isInteger(parsed) && parsed > 0 && String(parsed) === envValue.trim()) {
    return { diagnostics: [], value: parsed };
  }

  return {
    diagnostics: [
      diagnostic(code, field, `Invalid Campaign OS server runtime ${field}.`),
    ],
    value: defaultValue,
  };
};

const parsePositiveNonZeroInteger = (
  explicitValue: number | undefined,
  envValue: string | undefined,
  defaultValue: number,
  field: string,
  code: ServerRuntimeDiagnosticCode,
): {
  diagnostics: ServerRuntimeDiagnostic[];
  value: number;
} => {
  const parsed = parsePositiveInteger(explicitValue, envValue, defaultValue, field, code);

  if (parsed.diagnostics.length > 0) {
    return parsed;
  }

  if (parsed.value > 0) {
    return parsed;
  }

  return {
    diagnostics: [
      diagnostic(code, field, `Invalid Campaign OS server runtime ${field}.`),
    ],
    value: defaultValue,
  };
};

const splitCsv = (value: string | undefined): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const resolveApiServerRuntimeContract = ({
  allowedCorsOrigins,
  env = typeof process === "undefined" ? {} : process.env,
  host,
  maxBodyBytes,
  port,
  profileId,
  shutdownTimeoutMs,
  startedAt = new Date().toISOString(),
  version,
}: ResolveApiServerRuntimeContractOptions = {}): ApiServerRuntimeContract => {
  const requestedProfileId =
    profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE ?? DEFAULT_BACKEND_RUNTIME_PROFILE_ID;
  const profileResolution = resolveBackendRuntimeProfile(requestedProfileId);
  const portResolution = parsePositiveInteger(
    port,
    env.CAMPAIGN_OS_API_PORT,
    DEFAULT_PORT,
    "port",
    "SERVER_RUNTIME_INVALID_PORT",
  );
  const bodyLimitResolution = parsePositiveNonZeroInteger(
    maxBodyBytes,
    env.CAMPAIGN_OS_API_MAX_BODY_BYTES,
    DEFAULT_MAX_BODY_BYTES,
    "maxBodyBytes",
    "SERVER_RUNTIME_INVALID_BODY_LIMIT",
  );
  const shutdownResolution = parsePositiveNonZeroInteger(
    shutdownTimeoutMs,
    env.CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
    "shutdownTimeoutMs",
    "SERVER_RUNTIME_INVALID_SHUTDOWN_TIMEOUT",
  );
  const profileDiagnostics = profileResolution.diagnostics.map((item) =>
    diagnostic("SERVER_RUNTIME_UNKNOWN_PROFILE", item.field, item.message, item.severity),
  );
  const productionBlockedDiagnostics =
    profileResolution.profile.id === "production-required"
      ? [
        diagnostic(
          "SERVER_RUNTIME_PRODUCTION_BLOCKED",
          "profileId",
          `Production-required API server runtime is blocked until ${productionBackendRequiredConfigKeys.length} production config keys and live attach points are implemented.`,
        ),
      ]
      : [];
  const diagnostics = [
    ...profileDiagnostics,
    ...portResolution.diagnostics,
    ...bodyLimitResolution.diagnostics,
    ...shutdownResolution.diagnostics,
    ...productionBlockedDiagnostics,
  ];
  const blockingIssueCount = diagnostics.filter((item) => item.severity === "error").length;

  return {
    attachMap: serverRuntimeAttachMap,
    corsPolicy: {
      allowedHeaders: [...DEFAULT_ALLOWED_HEADERS],
      allowedMethods: [...DEFAULT_ALLOWED_METHODS],
      allowedOrigins:
        allowedCorsOrigins
        ?? splitCsv(env.CAMPAIGN_OS_API_CORS_ORIGINS)
        ?? [...DEFAULT_CORS_ORIGINS],
      enabled: env.CAMPAIGN_OS_API_CORS_ENABLED?.toLowerCase() !== "false",
      maxAgeSeconds: DEFAULT_CORS_MAX_AGE_SECONDS,
      preflightHandledBeforeRuntime: true,
    },
    diagnostics,
    environmentKeys: runtimeActivationConfigKeys.map((item) => ({ ...item })),
    host: host ?? env.CAMPAIGN_OS_API_HOST ?? DEFAULT_HOST,
    port: portResolution.value,
    profile: profileResolution.profile,
    profileId: profileResolution.profile.id,
    requestGuard: {
      allowedMethods: [...DEFAULT_ALLOWED_METHODS],
      guardedFailureEnvelope: true,
      jsonContentTypes: [...DEFAULT_JSON_CONTENT_TYPES],
      maxBodyBytes: bodyLimitResolution.value,
      traceHeaderName: "x-campaign-os-trace-id",
    },
    runtimeVersion: version ?? env.CAMPAIGN_OS_API_VERSION ?? DEFAULT_VERSION,
    shutdown: {
      shutdownTimeoutMs: shutdownResolution.value,
    },
    startedAt,
    supportMode: profileResolution.profile.supportMode,
    valid: blockingIssueCount === 0 && profileResolution.valid,
  };
};

export const createServerStartupDiagnostics = (
  contract: ApiServerRuntimeContract,
): ServerStartupDiagnostics => ({
  attachPointCount: contract.attachMap.length,
  blockedAttachPointCount: contract.attachMap.filter((item) => item.status === "blocked").length,
  corsEnabled: contract.corsPolicy.enabled,
  deferredAttachPointIds: contract.attachMap.map((item) => item.id),
  diagnosticCodes: contract.diagnostics.map((item) => item.code),
  host: contract.host,
  maxBodyBytes: contract.requestGuard.maxBodyBytes,
  port: contract.port,
  profileId: contract.profileId,
  runtimeVersion: contract.runtimeVersion,
  shutdownTimeoutMs: contract.shutdown.shutdownTimeoutMs,
  startedAt: contract.startedAt,
  supportMode: contract.supportMode,
  valid: contract.valid,
});

export const formatServerStartupLog = (
  contract: ApiServerRuntimeContract,
): string => {
  const diagnostics = createServerStartupDiagnostics(contract);

  return [
    "[campaign-os-api-runtime] server-runtime",
    `host=${diagnostics.host}`,
    `port=${diagnostics.port}`,
    `profile=${diagnostics.profileId}`,
    `support=${diagnostics.supportMode}`,
    `version=${diagnostics.runtimeVersion}`,
    `bodyLimit=${diagnostics.maxBodyBytes}`,
    `shutdownTimeout=${diagnostics.shutdownTimeoutMs}`,
    `cors=${diagnostics.corsEnabled ? "enabled" : "disabled"}`,
    `attachPoints=${diagnostics.attachPointCount}`,
    `blockedAttachPoints=${diagnostics.blockedAttachPointCount}`,
    `valid=${diagnostics.valid}`,
    "no live operations",
  ].join(" ");
};
