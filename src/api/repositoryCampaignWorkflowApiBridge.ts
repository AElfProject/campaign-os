import type {
  AccountType,
  ContractMode,
  LocalizedText,
  SupportedLocale,
  VerificationType,
  WalletCompatibility,
  WalletPolicy,
  WalletSource,
} from "../domain/types";
import { isCallerControlledWalletAuthorityHeaderName } from "./walletSessionAuthHeaders";

export type RepositoryCampaignWorkflowApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type RepositoryCampaignWorkflowApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "partial"
  | "ready";

export interface RepositoryCampaignWorkflowApiDiagnostic {
  code:
    | "API_AUDIT_FAILED"
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_CREATE_FAILED"
    | "API_ELIGIBILITY_FAILED"
    | "API_EXPORT_FAILED"
    | "API_HEALTH_FAILED"
    | "API_LIST_FAILED"
    | "API_PREVIEW_AUTHORITY_CONFLICT"
    | "API_PREVIEW_AUTHORITY_REQUIRED"
    | "API_READINESS_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID"
    | "API_TASK_FAILED"
    | "API_VERIFICATION_FAILED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface RepositoryCampaignWorkflowApiConfig {
  /** @deprecated Explicit opt-in for disposable loopback preview runtimes only. */
  authorityMode?: "deprecated_non_live_preview";
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface RepositoryCampaignWorkflowReviewInput {
  accountType?: AccountType;
  contractMode?: ContractMode;
  defaultLocale?: SupportedLocale;
  ownerAddress?: string;
  projectId?: string;
  supportedLocales?: SupportedLocale[];
  walletAddress?: string;
  walletPolicy?: WalletPolicy;
  walletSource?: WalletSource;
}

export interface RepositoryCampaignWorkflowRepositoryMetadata {
  adapterId?: string;
  createdViaRepository?: boolean;
  draftId?: string;
  repositoryId?: string;
  storeId?: string;
  taskId?: string;
}

export interface RepositoryCampaignWorkflowPersistenceMetadata {
  kind?: string;
  recordId?: string;
}

export interface RepositoryCampaignWorkflowHealthState {
  routeCount?: number;
  status?: string;
  traceId?: string;
}

export interface RepositoryCampaignWorkflowCampaignState {
  contractMode?: string;
  createdDraftId: string;
  defaultLocale?: string;
  listCampaignCount?: number;
  listContainsCreatedDraft?: boolean;
  ownerAddress?: string;
  persistence?: RepositoryCampaignWorkflowPersistenceMetadata;
  projectId?: string;
  repository?: RepositoryCampaignWorkflowRepositoryMetadata;
  status?: string;
  supportedLocales: readonly string[];
  walletPolicy?: string;
}

export interface RepositoryCampaignWorkflowTaskState {
  evidenceRule?: Record<string, boolean | number | string>;
  persistence?: RepositoryCampaignWorkflowPersistenceMetadata;
  points: number;
  repository?: RepositoryCampaignWorkflowRepositoryMetadata;
  required: boolean;
  taskId: string;
  templateCode: string;
  verificationType: VerificationType | string;
  walletCompatibility: WalletCompatibility | string;
}

export interface RepositoryCampaignWorkflowVerificationState {
  accountType?: AccountType | string;
  evidenceHash?: string;
  evidenceId?: string;
  evidenceSource?: string;
  liveContractExecuted: false;
  liveProviderExecuted: false;
  liveRewardExecuted: false;
  liveStorageExecuted: false;
  persistence?: RepositoryCampaignWorkflowPersistenceMetadata;
  pointsAwarded: number;
  pointsAvailable?: number;
  repositoryEvidence?: RepositoryCampaignWorkflowRepositoryMetadata;
  status: string;
  taskId: string;
  walletAddress?: string;
  walletSource?: WalletSource | string;
}

export interface RepositoryCampaignWorkflowEligibilityState {
  accountType?: AccountType | string;
  eligible: boolean;
  evidenceHashes: readonly string[];
  localePreference?: string;
  missingTasks: readonly string[];
  riskFlags: readonly string[];
  score: number;
  status: string;
  walletAddress?: string;
  walletSource?: WalletSource | string;
  walletTypeVerified: boolean;
}

export interface RepositoryCampaignWorkflowExportPreviewState {
  artifactChecksum?: string;
  artifactId?: string;
  blockedRows: number;
  contractRootMode?: string;
  readyRows: number;
  reviewRequiredRows: number;
  rowStatuses: readonly string[];
  totalRows: number;
}

export interface RepositoryCampaignWorkflowReadinessState {
  blockedRows: number;
  contractRootModes: readonly string[];
  previewModes: readonly string[];
  readyRows: number;
  reviewRequiredRows: number;
  totalRows: number;
}

export interface RepositoryCampaignWorkflowAuditState {
  detailFound: boolean;
  recordCount: number;
  safety?: {
    downloadUrlEnabled?: false;
    localReviewOnly?: true;
    storageWriteEnabled?: false;
  };
}

export interface RepositoryCampaignWorkflowStepState {
  endpoint: string;
  method: "GET" | "POST";
  status: "completed" | "failed" | "skipped";
  stepId: string;
  traceId?: string;
}

export interface RepositoryCampaignWorkflowLiveSideEffectsState {
  contractWriteExecuted: false;
  objectKeyCreated: false;
  providerCallExecuted: false;
  rawProviderPayloadExposed: false;
  rewardCustodyExecuted: false;
  rewardDistributionExecuted: false;
  signedUrlCreated: false;
  storageWriteExecuted: false;
  walletSignatureExecuted: false;
}

export interface RepositoryCampaignWorkflowBridgeState {
  boundary: LocalizedText;
  campaign?: RepositoryCampaignWorkflowCampaignState;
  configured: boolean;
  diagnostics: readonly RepositoryCampaignWorkflowApiDiagnostic[];
  eligibility?: {
    afterOptional?: RepositoryCampaignWorkflowEligibilityState;
    afterRequired?: RepositoryCampaignWorkflowEligibilityState;
    beforeRequired?: RepositoryCampaignWorkflowEligibilityState;
  };
  exportReview?: {
    audit?: RepositoryCampaignWorkflowAuditState;
    blockedPreview?: RepositoryCampaignWorkflowExportPreviewState;
    readiness?: RepositoryCampaignWorkflowReadinessState;
    readyPreview?: RepositoryCampaignWorkflowExportPreviewState;
  };
  health?: RepositoryCampaignWorkflowHealthState;
  liveSideEffects: RepositoryCampaignWorkflowLiveSideEffectsState;
  loading: boolean;
  seededSummary?: string;
  source: RepositoryCampaignWorkflowApiSource;
  status: RepositoryCampaignWorkflowApiStatus;
  tasks?: {
    optional?: RepositoryCampaignWorkflowTaskState;
    required?: RepositoryCampaignWorkflowTaskState;
  };
  traceId?: string;
  traceIds: readonly string[];
  verification?: {
    optional?: RepositoryCampaignWorkflowVerificationState;
    required?: RepositoryCampaignWorkflowVerificationState;
  };
  workflowStepCount: number;
  workflowSteps: readonly RepositoryCampaignWorkflowStepState[];
}

export type RepositoryCampaignWorkflowApiFetch = typeof fetch;

interface LoadRepositoryCampaignWorkflowBridgeStateInput {
  config?: RepositoryCampaignWorkflowApiConfig;
  fetchImpl?: RepositoryCampaignWorkflowApiFetch;
  reviewInput?: RepositoryCampaignWorkflowReviewInput;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: RepositoryCampaignWorkflowApiDiagnostic;
  headers: Record<string, string>;
  normalizedTracePrefix: string;
  previewAuthorityEnabled: boolean;
  timeoutMs: number;
}

interface ApiRuntimeEnvelope {
  data?: unknown;
  error?: unknown;
  ok: boolean;
  runtime?: {
    routeCount?: unknown;
  };
  safety?: unknown;
  traceId?: unknown;
}

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: RepositoryCampaignWorkflowApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

interface TaskVerificationRequestBody {
  campaignId: string;
}

type EndpointFailureCode =
  | "API_AUDIT_FAILED"
  | "API_CREATE_FAILED"
  | "API_ELIGIBILITY_FAILED"
  | "API_EXPORT_FAILED"
  | "API_HEALTH_FAILED"
  | "API_LIST_FAILED"
  | "API_READINESS_FAILED"
  | "API_TASK_FAILED"
  | "API_VERIFICATION_FAILED";

type DiagnosticInput =
  & Pick<RepositoryCampaignWorkflowApiDiagnostic, "code" | "severity">
  & {
    message?: LocalizedText;
    safeDetails?: Record<string, unknown>;
  };

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;

const defaultReviewInput = {
  accountType: "EOA" as const,
  contractMode: "OFF_CHAIN_MVP" as const,
  defaultLocale: "en-US" as const,
  ownerAddress: "ELF_local_review_project_owner",
  projectId: "repo-workflow-review",
  supportedLocales: ["en-US", "zh-CN", "zh-TW"] as SupportedLocale[],
  walletAddress: "2F4RepositoryWorkflowWallet",
  walletPolicy: "ANY" as const,
  walletSource: "PORTKEY_EOA_EXTENSION" as const,
};

const taskVerificationRequestBody = (campaignId: string): TaskVerificationRequestBody => ({
  campaignId,
});

export const repositoryCampaignWorkflowApiBoundary: LocalizedText = {
  "en-US":
    "Local repository campaign workflow API review only. No live provider call, wallet signature, contract write, object storage write, signed URL, object key, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 repository campaign workflow API 评审。不会执行实时 provider 调用、钱包签名、合约写入、object storage 写入、signed URL、object key、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 repository campaign workflow API 評審。不會執行即時 provider 呼叫、錢包簽名、合約寫入、object storage 寫入、signed URL、object key、獎勵託管或發獎。",
};

const diagnosticMessages: Record<RepositoryCampaignWorkflowApiDiagnostic["code"], LocalizedText> = {
  API_AUDIT_FAILED: {
    "en-US": "The local export artifact audit route did not return usable review evidence.",
    "zh-CN": "本地导出 artifact audit route 未返回可用评审证据。",
    "zh-TW": "本地匯出 artifact audit route 未回傳可用評審證據。",
  },
  API_BASE_URL_INVALID: {
    "en-US": "The local repository workflow API base URL is invalid, so seeded workflow review remains visible.",
    "zh-CN": "本地 repository workflow API base URL 无效，因此继续显示 seeded workflow review。",
    "zh-TW": "本地 repository workflow API base URL 無效，因此繼續顯示 seeded workflow review。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local repository workflow API base URL is configured, so seeded workflow review remains visible.",
    "zh-CN": "未配置本地 repository workflow API base URL，因此继续显示 seeded workflow review。",
    "zh-TW": "未設定本地 repository workflow API base URL，因此繼續顯示 seeded workflow review。",
  },
  API_CREATE_FAILED: {
    "en-US": "The local campaign creation route did not return a repository draft.",
    "zh-CN": "本地活动创建 route 未返回 repository draft。",
    "zh-TW": "本地活動建立 route 未回傳 repository draft。",
  },
  API_ELIGIBILITY_FAILED: {
    "en-US": "The local eligibility route did not return a usable transition state.",
    "zh-CN": "本地资格 route 未返回可用的状态转换。",
    "zh-TW": "本地資格 route 未回傳可用的狀態轉換。",
  },
  API_EXPORT_FAILED: {
    "en-US": "The local export preview route did not return usable blocked or ready evidence.",
    "zh-CN": "本地导出 preview route 未返回可用 blocked 或 ready 证据。",
    "zh-TW": "本地匯出 preview route 未回傳可用 blocked 或 ready 證據。",
  },
  API_HEALTH_FAILED: {
    "en-US": "The local API health route did not return a usable runtime envelope.",
    "zh-CN": "本地 API health route 未返回可用 runtime envelope。",
    "zh-TW": "本地 API health route 未回傳可用 runtime envelope。",
  },
  API_LIST_FAILED: {
    "en-US": "The local campaign list refresh did not confirm the created repository draft.",
    "zh-CN": "本地活动列表刷新未确认已创建的 repository draft。",
    "zh-TW": "本地活動列表刷新未確認已建立的 repository draft。",
  },
  API_PREVIEW_AUTHORITY_CONFLICT: {
    "en-US": "Caller-controlled authority headers are not accepted by the repository workflow preview bridge.",
    "zh-CN": "Repository workflow preview bridge 不接受调用方直接配置 authority headers。",
    "zh-TW": "Repository workflow preview bridge 不接受呼叫方直接設定 authority headers。",
  },
  API_PREVIEW_AUTHORITY_REQUIRED: {
    "en-US": "Repository workflow authority headers require explicit deprecated non-live preview mode on a loopback runtime.",
    "zh-CN": "Repository workflow authority headers 仅允许在显式 deprecated non-live preview 模式的 loopback runtime 中使用。",
    "zh-TW": "Repository workflow authority headers 僅允許在明確 deprecated non-live preview 模式的 loopback runtime 中使用。",
  },
  API_READINESS_FAILED: {
    "en-US": "The local export readiness route did not return usable review evidence.",
    "zh-CN": "本地导出 readiness route 未返回可用评审证据。",
    "zh-TW": "本地匯出 readiness route 未回傳可用評審證據。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local repository workflow API request failed.",
    "zh-CN": "本地 repository workflow API 请求失败。",
    "zh-TW": "本地 repository workflow API 請求失敗。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local repository workflow API request timed out.",
    "zh-CN": "本地 repository workflow API 请求超时。",
    "zh-TW": "本地 repository workflow API 請求逾時。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local repository workflow API response shape was not recognized.",
    "zh-CN": "本地 repository workflow API 响应结构无法识别。",
    "zh-TW": "本地 repository workflow API 回應結構無法識別。",
  },
  API_TASK_FAILED: {
    "en-US": "The local campaign task route did not return a usable task draft.",
    "zh-CN": "本地活动任务 route 未返回可用任务草稿。",
    "zh-TW": "本地活動任務 route 未回傳可用任務草稿。",
  },
  API_VERIFICATION_FAILED: {
    "en-US": "The local task verification route did not return usable evidence.",
    "zh-CN": "本地任务验证 route 未返回可用证据。",
    "zh-TW": "本地任務驗證 route 未回傳可用證據。",
  },
};

const unsafePatterns: Array<[RegExp, string]> = [
  [/\braw[-_\s]*signature\s*[=:]\s*[^&\s"'<>]+/gi, "rawSignature=redacted"],
  [/\brawsignature\s*[=:]\s*[^&\s"'<>]+/gi, "rawSignature=redacted"],
  [/\braw[-_\s]*signature\b/gi, "redacted signature"],
  [/\bprivate[-_\s]*key\s*[=:]\s*[^&\s"'<>]+/gi, "privateKey=redacted"],
  [/\bprivatekey\s*[=:]\s*[^&\s"'<>]+/gi, "privateKey=redacted"],
  [/\bprivate[-_\s]*key\b/gi, "redacted key"],
  [/\bseed[-_\s]*phrase\s*[=:]\s*[^&\s"'<>]+/gi, "seedPhrase=redacted"],
  [/\bseed[-_\s]*phrase\b/gi, "redacted seed"],
  [/\bbearer[-_\s]*token\b/gi, "redacted bearer credential"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "redacted bearer credential"],
  [/\bpassword\s*[=:]\s*[^&\s"'<>]+/gi, "password=redacted"],
  [/\bapi[-_\s]*key\s*[=:]\s*[^&\s"'<>]+/gi, "apiKey=redacted"],
  [/\bapi[-_\s]*key\b/gi, "redacted credential"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "redacted query credential"],
  [/\bsigned[-_\s]*url\s*[=:]\s*[^&\s"'<>]+/gi, "signedUrl=redacted"],
  [/\bsignedurl\s*[=:]\s*[^&\s"'<>]+/gi, "signedUrl=redacted"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed url"],
  [/\bobject[-_\s]*key\s*[=:]\s*[^&\s"'<>]+/gi, "objectKey=redacted"],
  [/\bobjectkey\s*[=:]\s*[^&\s"'<>]+/gi, "objectKey=redacted"],
  [/\bobject[-_\s]*key\b/gi, "redacted object key"],
  [/\/Users\/[^"'\s<>]*(campaign-os-kitty|docs\/current|kitty-specs|evidence|sync)[^"'\s<>]*/gi, "redacted private path"],
  [/\bdocs\/current\b/gi, "redacted private docs"],
  [/\bkitty-specs\b/gi, "redacted private specs"],
  [/\bevidence\//gi, "redacted private evidence/"],
  [/\bsync\//gi, "redacted private sync/"],
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider payload"],
  [/\bproviderpayload\b/gi, "redacted provider payload"],
  [/\bdatabase[-_\s]*payload\b/gi, "redacted database payload"],
  [/\bdatabasepayload\b/gi, "redacted database payload"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
];

const noLiveSideEffects: RepositoryCampaignWorkflowLiveSideEffectsState = {
  contractWriteExecuted: false,
  objectKeyCreated: false,
  providerCallExecuted: false,
  rawProviderPayloadExposed: false,
  rewardCustodyExecuted: false,
  rewardDistributionExecuted: false,
  signedUrlCreated: false,
  storageWriteExecuted: false,
  walletSignatureExecuted: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeRepositoryCampaignWorkflowApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");

  return unsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );
};

const sanitizeDetailValue = (value: unknown): boolean | number | string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return sanitizeRepositoryCampaignWorkflowApiText(value);
};

const diagnostic = (
  code: RepositoryCampaignWorkflowApiDiagnostic["code"],
  severity: RepositoryCampaignWorkflowApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): RepositoryCampaignWorkflowApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeRepositoryCampaignWorkflowApiText(key),
        sanitizeDetailValue(value),
      ]),
    )
    : undefined;

  return {
    code,
    message: diagnosticMessages[code],
    ...(normalizedDetails ? { safeDetails: normalizedDetails } : {}),
    severity,
  };
};

const normalizeDiagnostic = (input: DiagnosticInput): RepositoryCampaignWorkflowApiDiagnostic => ({
  code: input.code,
  message: input.message ?? diagnosticMessages[input.code],
  ...(input.safeDetails
    ? {
      safeDetails: Object.fromEntries(
        Object.entries(input.safeDetails).map(([key, value]) => [
          sanitizeRepositoryCampaignWorkflowApiText(key),
          sanitizeDetailValue(value),
        ]),
      ),
    }
    : {}),
  severity: input.severity,
});

const clampTimeout = (timeoutMs: number | undefined) => {
  if (!Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(minTimeoutMs, Math.trunc(timeoutMs ?? defaultTimeoutMs)));
};

const normalizeTracePrefix = (tracePrefix: string | undefined) => {
  const sanitized = sanitizeRepositoryCampaignWorkflowApiText(tracePrefix ?? "repository-workflow-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "repository-workflow-review";
};

interface NormalizedHeaderResult {
  conflictField?: string;
  headers: Record<string, string>;
  invalidField?: string;
}

const normalizeHeaders = (
  headers: Record<string, string> | undefined,
): NormalizedHeaderResult => {
  try {
    const normalized = new Headers(headers);
    const result: Record<string, string> = {};
    let conflictField: string | undefined;

    normalized.forEach((rawValue, rawName) => {
      const name = rawName.trim().toLowerCase();
      if (!conflictField && isCallerControlledWalletAuthorityHeaderName(name)) {
        conflictField = name;
        return;
      }
      if (name && rawValue.trim()) {
        result[sanitizeRepositoryCampaignWorkflowApiText(name).toLowerCase()] =
          sanitizeRepositoryCampaignWorkflowApiText(rawValue);
      }
    });

    return {
      ...(conflictField ? { conflictField } : {}),
      headers: result,
    };
  } catch {
    return { headers: {}, invalidField: "headers" };
  }
};

const normalizeConfig = (config: RepositoryCampaignWorkflowApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const normalizedHeaders = normalizeHeaders(config?.headers);
  const headers = normalizedHeaders.headers;
  const rawBaseUrl = config?.baseUrl?.trim();
  const explicitPreview = config?.authorityMode === "deprecated_non_live_preview";

  if (normalizedHeaders.conflictField || normalizedHeaders.invalidField) {
    return {
      configured: Boolean(rawBaseUrl),
      diagnostic: diagnostic("API_PREVIEW_AUTHORITY_CONFLICT", "error", {
        field: normalizedHeaders.conflictField ?? normalizedHeaders.invalidField ?? "headers",
      }),
      headers,
      normalizedTracePrefix,
      previewAuthorityEnabled: false,
      timeoutMs,
    };
  }

  if (!rawBaseUrl) {
    return {
      configured: false,
      diagnostic: diagnostic("API_BASE_URL_MISSING", "info"),
      headers,
      normalizedTracePrefix,
      previewAuthorityEnabled: false,
      timeoutMs,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return {
        configured: true,
        diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
          reason: "unsupported_protocol",
          url: rawBaseUrl,
        }),
        headers,
        normalizedTracePrefix,
        previewAuthorityEnabled: false,
        timeoutMs,
      };
    }

    if (baseUrl.username !== "" || baseUrl.password !== "") {
      return {
        configured: true,
        diagnostic: diagnostic("API_PREVIEW_AUTHORITY_REQUIRED", "error", {
          reason: "credentialed_url_rejected",
        }),
        headers,
        normalizedTracePrefix,
        previewAuthorityEnabled: false,
        timeoutMs,
      };
    }

    const loopbackHost = baseUrl.hostname === "localhost"
      || baseUrl.hostname === "127.0.0.1"
      || baseUrl.hostname === "[::1]"
      || baseUrl.hostname === "::1";
    const previewAuthorityEnabled = explicitPreview && loopbackHost;
    return {
      baseUrl,
      configured: true,
      ...(previewAuthorityEnabled
        ? {}
        : {
          diagnostic: diagnostic("API_PREVIEW_AUTHORITY_REQUIRED", "error", {
            reason: explicitPreview ? "loopback_runtime_required" : "explicit_preview_opt_in_required",
          }),
        }),
      headers,
      normalizedTracePrefix,
      previewAuthorityEnabled,
      timeoutMs,
    };
  } catch {
    return {
      configured: true,
      diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
        reason: "malformed_url",
        url: rawBaseUrl,
      }),
      headers,
      normalizedTracePrefix,
      previewAuthorityEnabled: false,
      timeoutMs,
    };
  }
};

const createTraceId = (prefix: string, stepId: string) => `${prefix}-${stepId}-${Date.now().toString(36)}`;

const endpointUrl = (
  baseUrl: URL,
  endpoint: string,
  searchParams?: Record<string, string | undefined>,
) => {
  const next = new URL(baseUrl.toString());

  next.pathname = endpoint;
  next.search = "";
  next.hash = "";

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined && value.trim()) {
      next.searchParams.set(key, value);
    }
  }

  return next.toString();
};

const withTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    clear: () => globalThis.clearTimeout(timeout),
    signal: controller.signal,
  };
};

const extractTraceId = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.traceId === "string" && value.traceId.trim()
    ? sanitizeRepositoryCampaignWorkflowApiText(value.traceId)
    : undefined;

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError"
  || isRecord(error) && error.name === "AbortError"
  || sanitizeRepositoryCampaignWorkflowApiText(error).includes("AbortError");

const safeFetchJson = async ({
  body,
  endpoint,
  failureCode,
  fetchImpl,
  headers,
  method,
  requestHeaders,
  timeoutMs,
  traceId,
  url,
}: {
  body?: string;
  endpoint: string;
  failureCode: EndpointFailureCode;
  fetchImpl: RepositoryCampaignWorkflowApiFetch;
  headers: Record<string, string>;
  method: "GET" | "POST";
  requestHeaders?: Record<string, string>;
  timeoutMs: number;
  traceId: string;
  url: string;
}): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...(body ? { body } : {}),
      headers: {
        accept: "application/json",
        ...headers,
        ...(requestHeaders ?? {}),
        ...(body ? { "content-type": "application/json" } : {}),
        "x-campaign-os-trace-id": traceId,
      },
      method,
      signal: timeout.signal,
    });
    const jsonBody = await response.json().catch((error: unknown) => ({
      jsonError: sanitizeRepositoryCampaignWorkflowApiText(error),
    })) as unknown;
    const responseTraceId =
      sanitizeRepositoryCampaignWorkflowApiText(response.headers.get("x-campaign-os-trace-id") ?? "")
      || extractTraceId(jsonBody)
      || traceId;

    if (!response.ok) {
      return {
        body: jsonBody,
        diagnostic: diagnostic(failureCode, "error", {
          endpoint,
          status: response.status,
        }),
        ok: false,
        status: response.status,
        traceId: responseTraceId,
      };
    }

    return {
      body: jsonBody,
      ok: true,
      status: response.status,
      traceId: responseTraceId,
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(isAbortError(error) ? "API_REQUEST_TIMEOUT" : "API_REQUEST_FAILED", "error", {
        endpoint,
        reason: sanitizeRepositoryCampaignWorkflowApiText(error),
      }),
      ok: false,
      traceId,
    };
  } finally {
    timeout.clear();
  }
};

const isApiEnvelope = (value: unknown): value is ApiRuntimeEnvelope =>
  isRecord(value) && typeof value.ok === "boolean";

const getDataRecord = (body: unknown): Record<string, unknown> | undefined =>
  isApiEnvelope(body) && body.ok && isRecord(body.data) ? body.data : undefined;

const getPayloadRecord = (body: unknown): Record<string, unknown> | undefined => {
  const data = getDataRecord(body);

  if (!data) {
    return undefined;
  }

  return isRecord(data.payload) ? data.payload : data;
};

const optionalStringField = (value: Record<string, unknown> | undefined, key: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const raw = value[key];

  return typeof raw === "string" && raw.trim() ? sanitizeRepositoryCampaignWorkflowApiText(raw) : undefined;
};

const optionalNumberField = (value: Record<string, unknown>, key: string): number | undefined => {
  const raw = value[key];

  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
};

const optionalBooleanField = (value: Record<string, unknown>, key: string): boolean | undefined => {
  const raw = value[key];

  return typeof raw === "boolean" ? raw : undefined;
};

const verificationNoLiveFlagKeys = [
  "liveContractExecuted",
  "liveProviderExecuted",
  "liveRewardExecuted",
  "liveStorageExecuted",
] as const;

type VerificationNoLiveFlagKey = typeof verificationNoLiveFlagKeys[number];
type VerificationNoLiveFlags = Pick<RepositoryCampaignWorkflowVerificationState, VerificationNoLiveFlagKey>;

const explicitFalseField = (value: Record<string, unknown>, key: VerificationNoLiveFlagKey): false | undefined =>
  value[key] === false ? false : undefined;

const normalizeVerificationNoLiveFlags = (
  payload: Record<string, unknown>,
): VerificationNoLiveFlags | undefined => {
  const flags = {
    liveContractExecuted: explicitFalseField(payload, "liveContractExecuted"),
    liveProviderExecuted: explicitFalseField(payload, "liveProviderExecuted"),
    liveRewardExecuted: explicitFalseField(payload, "liveRewardExecuted"),
    liveStorageExecuted: explicitFalseField(payload, "liveStorageExecuted"),
  };

  return Object.values(flags).every((value) => value === false) ? flags as VerificationNoLiveFlags : undefined;
};

const invalidVerificationNoLiveFields = (body: unknown): readonly VerificationNoLiveFlagKey[] => {
  const payload = getPayloadRecord(body);

  if (!payload) {
    return [];
  }

  return verificationNoLiveFlagKeys.filter((key) => payload[key] !== false);
};

const verificationNoLiveDiagnostic = (
  body: unknown,
  endpoint: string,
): RepositoryCampaignWorkflowApiDiagnostic | undefined => {
  const invalidFields = invalidVerificationNoLiveFields(body);

  return invalidFields.length > 0
    ? diagnostic("API_RESPONSE_INVALID", "error", {
      endpoint,
      invalidNoLiveFieldCount: invalidFields.length,
      invalidNoLiveFields: invalidFields.join(","),
      reason: "unsafe_no_live_verification_flag",
    })
    : undefined;
};

const withVerificationNoLiveDiagnostic = (
  result: FetchJsonResult,
  endpoint: string,
): FetchJsonResult => {
  const noLiveDiagnostic = verificationNoLiveDiagnostic(result.body, endpoint);

  return noLiveDiagnostic ? { ...result, diagnostic: noLiveDiagnostic } : result;
};

const stringArrayFromValue = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === "string")
      .map(sanitizeRepositoryCampaignWorkflowApiText)
    : [];

const safeFlatRecord = (value: unknown): Record<string, boolean | number | string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([, item]) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    .map(([key, item]) => [
      sanitizeRepositoryCampaignWorkflowApiText(key),
      sanitizeDetailValue(item),
    ]);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const repositoryMetadataFromValue = (
  value: unknown,
): RepositoryCampaignWorkflowRepositoryMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: RepositoryCampaignWorkflowRepositoryMetadata = {
    ...(optionalStringField(value, "adapterId") ? { adapterId: optionalStringField(value, "adapterId") } : {}),
    ...(optionalBooleanField(value, "createdViaRepository") !== undefined
      ? { createdViaRepository: optionalBooleanField(value, "createdViaRepository") }
      : {}),
    ...(optionalStringField(value, "draftId") ? { draftId: optionalStringField(value, "draftId") } : {}),
    ...(optionalStringField(value, "repositoryId") ? { repositoryId: optionalStringField(value, "repositoryId") } : {}),
    ...(optionalStringField(value, "storeId") ? { storeId: optionalStringField(value, "storeId") } : {}),
    ...(optionalStringField(value, "taskId") ? { taskId: optionalStringField(value, "taskId") } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const persistenceMetadataFromValue = (
  value: unknown,
): RepositoryCampaignWorkflowPersistenceMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: RepositoryCampaignWorkflowPersistenceMetadata = {
    ...(optionalStringField(value, "kind") ? { kind: optionalStringField(value, "kind") } : {}),
    ...(optionalStringField(value, "recordId") ? { recordId: optionalStringField(value, "recordId") } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const normalizeHealth = (body: unknown, traceId?: string): RepositoryCampaignWorkflowHealthState | undefined => {
  if (!isApiEnvelope(body) || !body.ok) {
    return undefined;
  }

  const data = isRecord(body.data) ? body.data : undefined;
  const status =
    data && typeof data.status === "string"
      ? sanitizeRepositoryCampaignWorkflowApiText(data.status)
      : "ready";
  const routeCount =
    typeof body.runtime?.routeCount === "number" && Number.isFinite(body.runtime.routeCount)
      ? body.runtime.routeCount
      : undefined;

  return {
    ...(routeCount !== undefined ? { routeCount } : {}),
    status,
    ...(traceId ? { traceId } : {}),
  };
};

const normalizeCampaign = (
  body: unknown,
  listBody?: unknown,
): RepositoryCampaignWorkflowCampaignState | undefined => {
  const data = getDataRecord(body);
  const payload = getPayloadRecord(body);

  if (!data || !payload) {
    return undefined;
  }

  const repository = repositoryMetadataFromValue(data.campaignDb);
  const createdDraftId = optionalStringField(payload, "id") ?? repository?.draftId;

  if (!createdDraftId) {
    return undefined;
  }

  const listPayload = listBody ? getPayloadRecord(listBody) : undefined;
  const listItems = listPayload && Array.isArray(listPayload.items) ? listPayload.items : undefined;
  const listCampaignCount =
    listPayload && isRecord(listPayload.summary) && typeof listPayload.summary.totalCampaigns === "number"
      ? listPayload.summary.totalCampaigns
      : listItems?.length;
  const supportedLocales = stringArrayFromValue(payload.supportedLocales);

  return {
    ...(optionalStringField(payload, "contractMode") ? { contractMode: optionalStringField(payload, "contractMode") } : {}),
    createdDraftId,
    ...(optionalStringField(payload, "defaultLocale") ? { defaultLocale: optionalStringField(payload, "defaultLocale") } : {}),
    ...(listCampaignCount !== undefined ? { listCampaignCount } : {}),
    ...(listItems
      ? {
        listContainsCreatedDraft: listItems.some(
          (item) => isRecord(item) && optionalStringField(item, "id") === createdDraftId,
        ),
      }
      : {}),
    ...(optionalStringField(payload, "ownerAddress") ? { ownerAddress: optionalStringField(payload, "ownerAddress") } : {}),
    ...(persistenceMetadataFromValue(data.persistence) ? { persistence: persistenceMetadataFromValue(data.persistence) } : {}),
    ...(optionalStringField(payload, "projectId") ? { projectId: optionalStringField(payload, "projectId") } : {}),
    ...(repository ? { repository } : {}),
    ...(optionalStringField(payload, "status") ? { status: optionalStringField(payload, "status") } : {}),
    supportedLocales,
    ...(optionalStringField(payload, "walletPolicy") ? { walletPolicy: optionalStringField(payload, "walletPolicy") } : {}),
  };
};

const normalizeTask = (body: unknown): RepositoryCampaignWorkflowTaskState | undefined => {
  const data = getDataRecord(body);
  const payload = getPayloadRecord(body);

  if (!data || !payload) {
    return undefined;
  }

  const repository = repositoryMetadataFromValue(data.campaignDbTask);
  const taskId = repository?.taskId ?? optionalStringField(payload, "taskId") ?? optionalStringField(payload, "id");
  const templateCode = optionalStringField(payload, "templateCode");
  const verificationType = optionalStringField(payload, "verificationType");
  const walletCompatibility = optionalStringField(payload, "walletCompatibility");
  const points = optionalNumberField(payload, "points");
  const required = optionalBooleanField(payload, "required");

  if (
    !taskId
    || !templateCode
    || !verificationType
    || !walletCompatibility
    || points === undefined
    || required === undefined
  ) {
    return undefined;
  }

  return {
    ...(safeFlatRecord(payload.evidenceRule) ? { evidenceRule: safeFlatRecord(payload.evidenceRule) } : {}),
    ...(persistenceMetadataFromValue(data.persistence) ? { persistence: persistenceMetadataFromValue(data.persistence) } : {}),
    points,
    ...(repository ? { repository } : {}),
    required,
    taskId,
    templateCode,
    verificationType,
    walletCompatibility,
  };
};

const normalizeVerification = (
  body: unknown,
): RepositoryCampaignWorkflowVerificationState | undefined => {
  const data = getDataRecord(body);
  const payload = getPayloadRecord(body);

  if (!data || !payload) {
    return undefined;
  }

  const taskId = optionalStringField(payload, "taskId");
  const status = optionalStringField(payload, "status");
  const pointsAwarded = optionalNumberField(payload, "pointsAwarded");
  const noLiveFlags = normalizeVerificationNoLiveFlags(payload);

  if (!taskId || !status || pointsAwarded === undefined || !noLiveFlags) {
    return undefined;
  }

  return {
    ...(optionalStringField(payload, "accountType") ? { accountType: optionalStringField(payload, "accountType") } : {}),
    ...(optionalStringField(payload, "evidenceHash") ? { evidenceHash: optionalStringField(payload, "evidenceHash") } : {}),
    ...(optionalStringField(payload, "evidenceId") ? { evidenceId: optionalStringField(payload, "evidenceId") } : {}),
    ...(optionalStringField(payload, "evidenceSource") ? { evidenceSource: optionalStringField(payload, "evidenceSource") } : {}),
    ...noLiveFlags,
    ...(persistenceMetadataFromValue(data.persistence) ? { persistence: persistenceMetadataFromValue(data.persistence) } : {}),
    pointsAwarded,
    ...(optionalNumberField(payload, "pointsAvailable") !== undefined
      ? { pointsAvailable: optionalNumberField(payload, "pointsAvailable") }
      : {}),
    ...(repositoryMetadataFromValue(data.campaignDbEvidence)
      ? { repositoryEvidence: repositoryMetadataFromValue(data.campaignDbEvidence) }
      : {}),
    status,
    taskId,
    ...(optionalStringField(payload, "walletAddress") ? { walletAddress: optionalStringField(payload, "walletAddress") } : {}),
    ...(optionalStringField(payload, "walletSource") ? { walletSource: optionalStringField(payload, "walletSource") } : {}),
  };
};

const evidenceHashesFromValue = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (isRecord(item) && typeof item.evidenceHash === "string") {
      return [sanitizeRepositoryCampaignWorkflowApiText(item.evidenceHash)];
    }

    return [];
  });
};

const normalizeEligibility = (
  body: unknown,
): RepositoryCampaignWorkflowEligibilityState | undefined => {
  const payload = getPayloadRecord(body);

  if (!payload) {
    return undefined;
  }

  const eligible = optionalBooleanField(payload, "eligible");
  const score = optionalNumberField(payload, "score");
  const status = optionalStringField(payload, "status");
  const walletTypeVerified = optionalBooleanField(payload, "walletTypeVerified");

  if (eligible === undefined || score === undefined || !status || walletTypeVerified === undefined) {
    return undefined;
  }

  return {
    ...(optionalStringField(payload, "accountType") ? { accountType: optionalStringField(payload, "accountType") } : {}),
    eligible,
    evidenceHashes: evidenceHashesFromValue(payload.campaignDbEvidence),
    ...(optionalStringField(payload, "localePreference") ? { localePreference: optionalStringField(payload, "localePreference") } : {}),
    missingTasks: stringArrayFromValue(payload.missingTasks),
    riskFlags: stringArrayFromValue(payload.riskFlags),
    score,
    status,
    ...(optionalStringField(payload, "walletAddress") ? { walletAddress: optionalStringField(payload, "walletAddress") } : {}),
    ...(optionalStringField(payload, "walletSource") ? { walletSource: optionalStringField(payload, "walletSource") } : {}),
    walletTypeVerified,
  };
};

const normalizeExportPreview = (
  body: unknown,
): RepositoryCampaignWorkflowExportPreviewState | undefined => {
  const payload = getPayloadRecord(body);

  if (!payload) {
    return undefined;
  }

  const blockedRows = optionalNumberField(payload, "blockedRows");
  const readyRows = optionalNumberField(payload, "readyRows");
  const reviewRequiredRows = optionalNumberField(payload, "reviewRequiredRows");
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (blockedRows === undefined || readyRows === undefined || reviewRequiredRows === undefined) {
    return undefined;
  }

  const artifactRegistry = isRecord(payload.artifactRegistry) ? payload.artifactRegistry : undefined;
  const artifact = isRecord(payload.artifact) ? payload.artifact : undefined;

  return {
    ...(optionalStringField(artifact, "checksum") ?? optionalStringField(artifactRegistry, "checksum")
      ? { artifactChecksum: optionalStringField(artifact, "checksum") ?? optionalStringField(artifactRegistry, "checksum") }
      : {}),
    ...(optionalStringField(artifactRegistry, "artifactId") ? { artifactId: optionalStringField(artifactRegistry, "artifactId") } : {}),
    blockedRows,
    ...(optionalStringField(payload, "contractRootMode") ? { contractRootMode: optionalStringField(payload, "contractRootMode") } : {}),
    readyRows,
    reviewRequiredRows,
    rowStatuses: rows.flatMap((row) => {
      if (isRecord(row) && typeof row.rowStatus === "string") {
        return [sanitizeRepositoryCampaignWorkflowApiText(row.rowStatus)];
      }

      return [];
    }),
    totalRows: rows.length,
  };
};

const normalizeReadiness = (
  body: unknown,
): RepositoryCampaignWorkflowReadinessState | undefined => {
  const payload = getPayloadRecord(body);

  if (!payload || !isRecord(payload.summary)) {
    return undefined;
  }

  const blockedRows = optionalNumberField(payload.summary, "blockedRows");
  const readyRows = optionalNumberField(payload.summary, "readyRows");
  const reviewRequiredRows = optionalNumberField(payload.summary, "reviewRequiredRows");
  const totalRows = optionalNumberField(payload.summary, "totalRows");

  if (
    blockedRows === undefined
    || readyRows === undefined
    || reviewRequiredRows === undefined
    || totalRows === undefined
  ) {
    return undefined;
  }

  const previewModes = Array.isArray(payload.previewModes)
    ? payload.previewModes.flatMap((mode) =>
      isRecord(mode) && typeof mode.mode === "string"
        ? [sanitizeRepositoryCampaignWorkflowApiText(mode.mode)]
        : [])
    : [];
  const contractRootModes = Array.isArray(payload.contractRootReadiness)
    ? payload.contractRootReadiness.flatMap((mode) =>
      isRecord(mode) && typeof mode.mode === "string"
        ? [sanitizeRepositoryCampaignWorkflowApiText(mode.mode)]
        : [])
    : [];

  return {
    blockedRows,
    contractRootModes,
    previewModes,
    readyRows,
    reviewRequiredRows,
    totalRows,
  };
};

const normalizeAuditList = (body: unknown): Pick<RepositoryCampaignWorkflowAuditState, "recordCount" | "safety"> | undefined => {
  const payload = getPayloadRecord(body);

  if (!payload || !Array.isArray(payload.records)) {
    return undefined;
  }

  const safety = isRecord(payload.safety)
    ? {
      ...(optionalBooleanField(payload.safety, "downloadUrlEnabled") === false ? { downloadUrlEnabled: false as const } : {}),
      ...(optionalBooleanField(payload.safety, "localReviewOnly") === true ? { localReviewOnly: true as const } : {}),
      ...(optionalBooleanField(payload.safety, "storageWriteEnabled") === false ? { storageWriteEnabled: false as const } : {}),
    }
    : undefined;

  return {
    recordCount: payload.records.length,
    ...(safety && Object.keys(safety).length > 0 ? { safety } : {}),
  };
};

const normalizeAuditDetail = (body: unknown): Pick<RepositoryCampaignWorkflowAuditState, "detailFound"> | undefined => {
  const payload = getPayloadRecord(body);

  return payload && isRecord(payload.record) ? { detailFound: true } : undefined;
};

const traceIdsFromSteps = (steps: readonly RepositoryCampaignWorkflowStepState[]) =>
  Array.from(new Set(steps.flatMap((step) => step.traceId ? [step.traceId] : [])));

const projectOwnerAuthHeaders = (ownerAddress: string): Record<string, string> => ({
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "project_owner",
  "x-campaign-os-session-id": `sess-${sanitizeRepositoryCampaignWorkflowApiText(ownerAddress)}`,
  "x-campaign-os-wallet-address": sanitizeRepositoryCampaignWorkflowApiText(ownerAddress),
  "x-campaign-os-wallet-source": "PORTKEY_AA",
});

const baseState = ({
  configured,
  diagnostics = [],
  loading,
  source,
  status,
  steps = [],
  traceId,
}: {
  configured: boolean;
  diagnostics?: readonly RepositoryCampaignWorkflowApiDiagnostic[];
  loading: boolean;
  source: RepositoryCampaignWorkflowApiSource;
  status: RepositoryCampaignWorkflowApiStatus;
  steps?: readonly RepositoryCampaignWorkflowStepState[];
  traceId?: string;
}): Omit<RepositoryCampaignWorkflowBridgeState, "boundary"> & { boundary: LocalizedText } => ({
  boundary: repositoryCampaignWorkflowApiBoundary,
  configured,
  diagnostics,
  liveSideEffects: noLiveSideEffects,
  loading,
  source,
  status,
  ...(traceId ? { traceId } : {}),
  traceIds: traceIdsFromSteps(steps),
  workflowStepCount: steps.length,
  workflowSteps: steps,
});

export const createRepositoryCampaignWorkflowLoadingState = (): RepositoryCampaignWorkflowBridgeState =>
  baseState({
    configured: true,
    loading: true,
    source: "loading",
    status: "loading",
  });

export const createRepositoryCampaignWorkflowSeededFallbackState = ({
  diagnostics = [],
}: {
  diagnostics?: readonly DiagnosticInput[];
} = {}): RepositoryCampaignWorkflowBridgeState => ({
  ...baseState({
    configured: false,
    diagnostics: diagnostics.map(normalizeDiagnostic),
    loading: false,
    source: "seeded_fallback",
    status: "fallback",
  }),
  seededSummary: "Seeded local workflow review remains visible until a local API runtime base URL is configured.",
});

export const createRepositoryCampaignWorkflowErrorFallbackState = ({
  diagnostics = [],
  traceId,
}: {
  diagnostics?: readonly DiagnosticInput[];
  traceId?: string;
}): RepositoryCampaignWorkflowBridgeState =>
  baseState({
    configured: true,
    diagnostics: diagnostics.map(normalizeDiagnostic),
    loading: false,
    source: "error_fallback",
    status: "error",
    ...(traceId ? { traceId } : {}),
  });

const stepState = ({
  endpoint,
  method,
  result,
  status,
  stepId,
}: {
  endpoint: string;
  method: "GET" | "POST";
  result?: FetchJsonResult;
  status: RepositoryCampaignWorkflowStepState["status"];
  stepId: string;
}): RepositoryCampaignWorkflowStepState => ({
  endpoint,
  method,
  status,
  ...(result?.traceId ? { traceId: result.traceId } : {}),
  stepId,
});

const stateWithEvidence = ({
  campaign,
  diagnostics,
  eligibility,
  exportReview,
  health,
  source,
  status,
  steps,
  tasks,
  traceId,
  verification,
}: {
  campaign?: RepositoryCampaignWorkflowCampaignState;
  diagnostics: readonly RepositoryCampaignWorkflowApiDiagnostic[];
  eligibility?: RepositoryCampaignWorkflowBridgeState["eligibility"];
  exportReview?: RepositoryCampaignWorkflowBridgeState["exportReview"];
  health?: RepositoryCampaignWorkflowHealthState;
  source: RepositoryCampaignWorkflowApiSource;
  status: RepositoryCampaignWorkflowApiStatus;
  steps: readonly RepositoryCampaignWorkflowStepState[];
  tasks?: RepositoryCampaignWorkflowBridgeState["tasks"];
  traceId?: string;
  verification?: RepositoryCampaignWorkflowBridgeState["verification"];
}): RepositoryCampaignWorkflowBridgeState => ({
  ...baseState({
    configured: true,
    diagnostics,
    loading: false,
    source,
    status,
    steps,
    ...(traceId ? { traceId } : {}),
  }),
  ...(campaign ? { campaign } : {}),
  ...(eligibility ? { eligibility } : {}),
  ...(exportReview ? { exportReview } : {}),
  ...(health ? { health } : {}),
  ...(tasks ? { tasks } : {}),
  ...(verification ? { verification } : {}),
});

export const loadRepositoryCampaignWorkflowBridgeState = async ({
  config,
  fetchImpl = fetch,
  reviewInput,
}: LoadRepositoryCampaignWorkflowBridgeStateInput = {}): Promise<RepositoryCampaignWorkflowBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    if (normalizedConfig.diagnostic?.severity === "error") {
      return createRepositoryCampaignWorkflowErrorFallbackState({
        diagnostics: [normalizedConfig.diagnostic],
      });
    }
    return {
      ...createRepositoryCampaignWorkflowSeededFallbackState({
        diagnostics: normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
      }),
      configured: normalizedConfig.configured,
    };
  }
  if (!normalizedConfig.previewAuthorityEnabled) {
    return createRepositoryCampaignWorkflowErrorFallbackState({
      diagnostics: [normalizedConfig.diagnostic ?? diagnostic("API_PREVIEW_AUTHORITY_REQUIRED", "error")],
    });
  }

  const review = {
    ...defaultReviewInput,
    ...reviewInput,
    supportedLocales: reviewInput?.supportedLocales ?? defaultReviewInput.supportedLocales,
  };
  const diagnostics: RepositoryCampaignWorkflowApiDiagnostic[] = [];
  const steps: RepositoryCampaignWorkflowStepState[] = [];
  const request = async ({
    body,
    endpoint,
    failureCode,
    method,
    searchParams,
    stepId,
    requestHeaders,
  }: {
    body?: unknown;
    endpoint: string;
    failureCode: EndpointFailureCode;
    method: "GET" | "POST";
    requestHeaders?: Record<string, string>;
    searchParams?: Record<string, string | undefined>;
    stepId: string;
  }) => {
    const result = await safeFetchJson({
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      endpoint,
      failureCode,
      fetchImpl,
      headers: normalizedConfig.headers,
      method,
      ...(requestHeaders ? { requestHeaders } : {}),
      timeoutMs: normalizedConfig.timeoutMs,
      traceId: createTraceId(normalizedConfig.normalizedTracePrefix, stepId),
      url: endpointUrl(normalizedConfig.baseUrl!, endpoint, searchParams),
    });

    steps.push(stepState({
      endpoint,
      method,
      result,
      status: result.ok && isApiEnvelope(result.body) && result.body.ok ? "completed" : "failed",
      stepId,
    }));

    return result;
  };
  const fail = ({
    campaign,
    code,
    fallbackCode,
    health,
    result,
    tasks,
    verification,
  }: {
    campaign?: RepositoryCampaignWorkflowCampaignState;
    code: RepositoryCampaignWorkflowApiDiagnostic["code"];
    fallbackCode?: EndpointFailureCode;
    health?: RepositoryCampaignWorkflowHealthState;
    result: FetchJsonResult;
    tasks?: RepositoryCampaignWorkflowBridgeState["tasks"];
    verification?: RepositoryCampaignWorkflowBridgeState["verification"];
  }) =>
    stateWithEvidence({
      campaign,
      diagnostics: [result.diagnostic ?? diagnostic(fallbackCode ?? code, "error")],
      health,
      source: "error_fallback",
      status: campaign ? "partial" : "error",
      steps,
      tasks,
      traceId: result.traceId ?? extractTraceId(result.body),
      verification,
    });

  const healthResponse = await request({
    endpoint: "/api/health",
    failureCode: "API_HEALTH_FAILED",
    method: "GET",
    stepId: "health",
  });
  const health = normalizeHealth(healthResponse.body, healthResponse.traceId);

  if (!healthResponse.ok || !isApiEnvelope(healthResponse.body) || !healthResponse.body.ok || !health) {
    return fail({ code: "API_HEALTH_FAILED", fallbackCode: "API_HEALTH_FAILED", result: healthResponse });
  }

  const createResponse = await request({
    body: {
      contractMode: review.contractMode,
      defaultLocale: review.defaultLocale,
      duration: "2026-08-01/2026-08-14",
      endTime: "2026-08-14T23:59:59Z",
      goal: "Repository workflow review bridge",
      ownerAddress: review.ownerAddress,
      projectId: review.projectId,
      rewardDescription: "Repository workflow rewards remain local-review only.",
      startTime: "2026-08-01T00:00:00Z",
      supportedLocales: review.supportedLocales,
      walletPolicy: review.walletPolicy,
    },
    endpoint: "/api/campaigns",
    failureCode: "API_CREATE_FAILED",
    method: "POST",
    requestHeaders: projectOwnerAuthHeaders(review.ownerAddress),
    stepId: "campaign-create",
  });

  if (!createResponse.ok || !isApiEnvelope(createResponse.body) || !createResponse.body.ok) {
    return fail({ code: "API_CREATE_FAILED", fallbackCode: "API_CREATE_FAILED", health, result: createResponse });
  }

  const campaignAfterCreate = normalizeCampaign(createResponse.body);

  if (!campaignAfterCreate) {
    return fail({
      code: "API_RESPONSE_INVALID",
      health,
      result: {
        ...createResponse,
        diagnostic: diagnostic("API_RESPONSE_INVALID", "error", { endpoint: "/api/campaigns" }),
      },
    });
  }

  const listResponse = await request({
    endpoint: "/api/campaigns",
    failureCode: "API_LIST_FAILED",
    method: "GET",
    searchParams: {
      ownerAddress: review.ownerAddress,
      projectId: review.projectId,
      status: "draft",
    },
    stepId: "campaign-list",
  });
  const campaign = normalizeCampaign(createResponse.body, listResponse.body) ?? campaignAfterCreate;

  if (!listResponse.ok || !isApiEnvelope(listResponse.body) || !listResponse.body.ok) {
    diagnostics.push(listResponse.diagnostic
      ? { ...listResponse.diagnostic, severity: "warning" }
      : diagnostic("API_LIST_FAILED", "warning", { endpoint: "/api/campaigns" }));
  } else if (campaign.listContainsCreatedDraft !== true) {
    diagnostics.push(diagnostic("API_LIST_FAILED", "warning", {
      createdDraftId: campaign.createdDraftId,
      reason: "created_draft_missing_from_list_refresh",
    }));
  }

  const requiredTaskResponse = await request({
    body: {
      evidenceRule: { minAmount: 1, source: "AELFSCAN" },
      points: 120,
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
      walletCompatibility: "ANY",
    },
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/tasks`,
    failureCode: "API_TASK_FAILED",
    method: "POST",
    stepId: "required-task",
  });
  const requiredTask = normalizeTask(requiredTaskResponse.body);

  if (!requiredTaskResponse.ok || !requiredTask) {
    return fail({
      campaign,
      code: "API_TASK_FAILED",
      fallbackCode: "API_TASK_FAILED",
      health,
      result: requiredTaskResponse,
    });
  }

  const optionalTaskResponse = await request({
    body: {
      evidenceRule: { action: "share" },
      points: 50,
      required: false,
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
      walletCompatibility: "ANY",
    },
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/tasks`,
    failureCode: "API_TASK_FAILED",
    method: "POST",
    stepId: "optional-task",
  });
  const optionalTask = normalizeTask(optionalTaskResponse.body);
  const tasks = { optional: optionalTask, required: requiredTask };

  if (!optionalTaskResponse.ok || !optionalTask) {
    return fail({
      campaign,
      code: "API_TASK_FAILED",
      fallbackCode: "API_TASK_FAILED",
      health,
      result: optionalTaskResponse,
      tasks: { required: requiredTask },
    });
  }

  const eligibilitySearch = {
    accountType: review.accountType,
    address: review.walletAddress,
    walletSource: review.walletSource,
  };
  const beforeEligibilityResponse = await request({
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/eligibility`,
    failureCode: "API_ELIGIBILITY_FAILED",
    method: "GET",
    searchParams: eligibilitySearch,
    stepId: "eligibility-before-required",
  });
  const beforeRequired = normalizeEligibility(beforeEligibilityResponse.body);

  if (!beforeEligibilityResponse.ok || !beforeRequired) {
    return fail({
      campaign,
      code: "API_ELIGIBILITY_FAILED",
      fallbackCode: "API_ELIGIBILITY_FAILED",
      health,
      result: beforeEligibilityResponse,
      tasks,
    });
  }

  const optionalVerificationEndpoint = `/api/tasks/${encodeURIComponent(optionalTask.taskId)}/verify`;
  const optionalVerificationResponse = await request({
    body: taskVerificationRequestBody(campaign.createdDraftId),
    endpoint: optionalVerificationEndpoint,
    failureCode: "API_VERIFICATION_FAILED",
    method: "POST",
    stepId: "optional-verification",
  });
  const optionalVerification = normalizeVerification(optionalVerificationResponse.body);

  if (!optionalVerificationResponse.ok || !optionalVerification) {
    return fail({
      campaign,
      code: "API_VERIFICATION_FAILED",
      fallbackCode: "API_VERIFICATION_FAILED",
      health,
      result: withVerificationNoLiveDiagnostic(optionalVerificationResponse, optionalVerificationEndpoint),
      tasks,
    });
  }

  const optionalEligibilityResponse = await request({
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/eligibility`,
    failureCode: "API_ELIGIBILITY_FAILED",
    method: "GET",
    searchParams: eligibilitySearch,
    stepId: "eligibility-after-optional",
  });
  const afterOptional = normalizeEligibility(optionalEligibilityResponse.body);

  if (!optionalEligibilityResponse.ok || !afterOptional) {
    return fail({
      campaign,
      code: "API_ELIGIBILITY_FAILED",
      fallbackCode: "API_ELIGIBILITY_FAILED",
      health,
      result: optionalEligibilityResponse,
      tasks,
      verification: { optional: optionalVerification },
    });
  }

  const blockedExportResponse = await request({
    body: {
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    },
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/export`,
    failureCode: "API_EXPORT_FAILED",
    method: "POST",
    stepId: "blocked-export",
  });
  const blockedPreview = normalizeExportPreview(blockedExportResponse.body);

  if (!blockedExportResponse.ok || !blockedPreview) {
    return fail({
      campaign,
      code: "API_EXPORT_FAILED",
      fallbackCode: "API_EXPORT_FAILED",
      health,
      result: blockedExportResponse,
      tasks,
      verification: { optional: optionalVerification },
    });
  }

  const requiredVerificationEndpoint = `/api/tasks/${encodeURIComponent(requiredTask.taskId)}/verify`;
  const requiredVerificationResponse = await request({
    body: taskVerificationRequestBody(campaign.createdDraftId),
    endpoint: requiredVerificationEndpoint,
    failureCode: "API_VERIFICATION_FAILED",
    method: "POST",
    stepId: "required-verification",
  });
  const requiredVerification = normalizeVerification(requiredVerificationResponse.body);
  const verification = { optional: optionalVerification, required: requiredVerification };

  if (!requiredVerificationResponse.ok || !requiredVerification) {
    return fail({
      campaign,
      code: "API_VERIFICATION_FAILED",
      fallbackCode: "API_VERIFICATION_FAILED",
      health,
      result: withVerificationNoLiveDiagnostic(requiredVerificationResponse, requiredVerificationEndpoint),
      tasks,
      verification: { optional: optionalVerification },
    });
  }

  const afterEligibilityResponse = await request({
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/eligibility`,
    failureCode: "API_ELIGIBILITY_FAILED",
    method: "GET",
    searchParams: eligibilitySearch,
    stepId: "eligibility-after-required",
  });
  const afterRequired = normalizeEligibility(afterEligibilityResponse.body);
  const eligibility = { afterOptional, afterRequired, beforeRequired };

  if (!afterEligibilityResponse.ok || !afterRequired) {
    return fail({
      campaign,
      code: "API_ELIGIBILITY_FAILED",
      fallbackCode: "API_ELIGIBILITY_FAILED",
      health,
      result: afterEligibilityResponse,
      tasks,
      verification,
    });
  }

  const readyExportResponse = await request({
    body: {
      contractRootMode: "none",
      format: "json",
      includeLocalePreference: true,
      includeRiskFlags: true,
      includeWalletType: true,
    },
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/export`,
    failureCode: "API_EXPORT_FAILED",
    method: "POST",
    stepId: "ready-export",
  });
  const readyPreview = normalizeExportPreview(readyExportResponse.body);

  if (!readyExportResponse.ok || !readyPreview) {
    return fail({
      campaign,
      code: "API_EXPORT_FAILED",
      fallbackCode: "API_EXPORT_FAILED",
      health,
      result: readyExportResponse,
      tasks,
      verification,
    });
  }

  const readinessResponse = await request({
    endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/export-readiness`,
    failureCode: "API_READINESS_FAILED",
    method: "GET",
    stepId: "export-readiness",
  });
  const readiness = normalizeReadiness(readinessResponse.body);

  if (!readinessResponse.ok || !readiness) {
    return fail({
      campaign,
      code: "API_READINESS_FAILED",
      fallbackCode: "API_READINESS_FAILED",
      health,
      result: readinessResponse,
      tasks,
      verification,
    });
  }

  let audit: RepositoryCampaignWorkflowAuditState | undefined;

  if (readyPreview.artifactId) {
    const auditListResponse = await request({
      endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/export-artifacts`,
      failureCode: "API_AUDIT_FAILED",
      method: "GET",
      searchParams: { artifactId: readyPreview.artifactId },
      stepId: "artifact-audit-list",
    });
    const auditList = normalizeAuditList(auditListResponse.body);

    if (!auditListResponse.ok || !auditList) {
      return fail({
        campaign,
        code: "API_AUDIT_FAILED",
        fallbackCode: "API_AUDIT_FAILED",
        health,
        result: auditListResponse,
        tasks,
        verification,
      });
    }

    const auditDetailResponse = await request({
      endpoint: `/api/campaigns/${encodeURIComponent(campaign.createdDraftId)}/export-artifacts/${encodeURIComponent(readyPreview.artifactId)}`,
      failureCode: "API_AUDIT_FAILED",
      method: "GET",
      stepId: "artifact-audit-detail",
    });
    const auditDetail = normalizeAuditDetail(auditDetailResponse.body);

    if (!auditDetailResponse.ok || !auditDetail) {
      return fail({
        campaign,
        code: "API_AUDIT_FAILED",
        fallbackCode: "API_AUDIT_FAILED",
        health,
        result: auditDetailResponse,
        tasks,
        verification,
      });
    }

    audit = {
      detailFound: auditDetail.detailFound,
      recordCount: auditList.recordCount,
      ...(auditList.safety ? { safety: auditList.safety } : {}),
    };
  }

  const ready =
    campaign.listContainsCreatedDraft === true
    && afterOptional.eligible === false
    && afterRequired.eligible === true
    && blockedPreview.blockedRows > 0
    && readyPreview.readyRows > 0
    && readiness.readyRows > 0;

  const traceIds = traceIdsFromSteps(steps);

  return stateWithEvidence({
    campaign,
    diagnostics,
    eligibility,
    exportReview: {
      ...(audit ? { audit } : {}),
      blockedPreview,
      readiness,
      readyPreview,
    },
    health,
    source: "api_runtime",
    status: ready && diagnostics.length === 0 ? "ready" : "partial",
    steps,
    tasks,
    traceId: traceIds[traceIds.length - 1],
    verification,
  });
};
