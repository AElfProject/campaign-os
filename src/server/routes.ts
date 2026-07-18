import { requiredApiSkillIds } from "../domain/apiSkillContracts";
import type { ApiSkillId, LocalizedText } from "../domain/types";
import type { ApiRuntimeContractCoverage, ApiRuntimeRouteContract } from "./contracts";
import type { AdminOperatorRouteId } from "./authEnforcement";
import { apiRuntimeServiceGroupById } from "./capabilities";
import type { CampaignOsAdminOperatorRoleId } from "./config";
import { runtimeBoundary } from "./envelope";
import {
  WALLET_SESSION_MAX_COOKIE_HEADER_BYTES,
  WALLET_SESSION_MAX_CSRF_HEADER_BYTES,
} from "./walletSessionRequestSecurity";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const route = (contract: ApiRuntimeRouteContract): ApiRuntimeRouteContract => contract;

type ProviderLiveRouteContract = Omit<ApiRuntimeRouteContract, "supportMode"> & {
  supportMode: "provider_live";
};

const providerLiveRoute = (
  contract: ProviderLiveRouteContract,
): ApiRuntimeRouteContract => contract as unknown as ApiRuntimeRouteContract;

const boundary = runtimeBoundary;
const taskVerificationBoundary = text(
  "Protected provider-live verification backed by PostgreSQL schema 0004. Activation is default-disabled, production disabled until a pinned runtime is supplied, and no client material or provider configuration is exposed.",
  "受保护的 provider-live 验证，由 PostgreSQL schema 0004 支撑。默认关闭；在提供 pinned runtime 前 production disabled；不会暴露 client material 或 provider 配置。",
);
const dependenciesFor = (serviceGroup: ApiRuntimeRouteContract["serviceGroup"]) =>
  apiRuntimeServiceGroupById[serviceGroup].deferredDependencies;

export type ExactProtectedApiRouteId =
  | "admin.wallet-session.revoke"
  | "tasks.verify"
  | "wallet.auth.challenge.create"
  | "wallet.auth.session.create"
  | "wallet.auth.session.current"
  | "wallet.auth.session.logout"
  | "wallet.auth.session.rotate";

export type ExactRequestCredentialRequirement = "forbidden" | "optional" | "required";
export type ExactJsonPropertyType = "object" | "string";

export interface ExactJsonPropertyContract {
  allowedValues?: readonly string[];
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  type: ExactJsonPropertyType;
}

export interface ExactJsonBodyContract {
  additionalProperties: false;
  contentType: "application/json";
  maxBytes: number;
  mode: "json";
  properties: Readonly<Record<string, ExactJsonPropertyContract>>;
  required: readonly string[];
}

export interface ExactForbiddenBodyContract {
  mode: "forbidden";
}

export interface ExactProtectedApiRequestContract {
  body: ExactForbiddenBodyContract | ExactJsonBodyContract;
  cookie: ExactRequestCredentialRequirement;
  cors: Readonly<{
    allowedHeaders: readonly string[];
    allowedMethods: readonly ("GET" | "POST")[];
  }>;
  csrf: ExactRequestCredentialRequirement;
  headers: Readonly<{
    controlled: readonly string[];
    maxBytesByName: Readonly<Record<string, number>>;
    maxCount: number;
    maxTotalBytes: number;
    rejectCallerAuthority: true;
  }>;
  origin: "required";
  pathParameters: Readonly<Record<string, ExactJsonPropertyContract>>;
  query: Readonly<{
    additionalProperties: false;
    allowed: readonly string[];
  }>;
}

export interface ExactProtectedApiRouteContract {
  credentialedCors: true;
  id: ExactProtectedApiRouteId;
  method: "GET" | "POST";
  operationId: string;
  path: string;
  request: ExactProtectedApiRequestContract;
}

const EXACT_PROTECTED_PATH_PARAMETER_MAX_LENGTH = 160;
const EXACT_MAX_HEADER_COUNT = 64;
const EXACT_MAX_TOTAL_HEADER_BYTES = 16 * 1_024;
const EXACT_MAX_ORIGIN_BYTES = 512;
const EXACT_MAX_TRACE_ID_BYTES = 128;
const EXACT_MAX_CONTENT_TYPE_BYTES = 128;
const EXACT_CONTROLLED_HEADERS = Object.freeze([
  "content-type",
  "cookie",
  "origin",
  "x-campaign-os-csrf",
  "x-campaign-os-trace-id",
] as const);
const EXACT_HEADER_MAX_BYTES = Object.freeze({
  "content-type": EXACT_MAX_CONTENT_TYPE_BYTES,
  cookie: WALLET_SESSION_MAX_COOKIE_HEADER_BYTES,
  origin: EXACT_MAX_ORIGIN_BYTES,
  "x-campaign-os-csrf": WALLET_SESSION_MAX_CSRF_HEADER_BYTES,
  "x-campaign-os-trace-id": EXACT_MAX_TRACE_ID_BYTES,
});
const EXACT_EMPTY_PATH_PARAMETERS = Object.freeze({});
const EXACT_NO_QUERY = Object.freeze({
  additionalProperties: false as const,
  allowed: Object.freeze([] as const),
});
const EXACT_NO_BODY = Object.freeze({ mode: "forbidden" as const });
const EXACT_CORS_TRACE_HEADER = "x-campaign-os-trace-id";
const EXACT_CORS_CONTENT_TYPE_HEADER = "content-type";
const EXACT_CORS_CSRF_HEADER = "x-campaign-os-csrf";
const EXACT_BOUNDED_ID_PATTERN = "^[^\\u0000-\\u001F\\u007F-\\u009F]+$";
const EXACT_MALFORMED_PERCENT_ENCODING = /%(?![0-9A-Fa-f]{2})/u;
const EXACT_ENCODED_BACKSLASH = /%5c/iu;
const CALLER_AUTHORITY_HEADER_NAMES = new Set([
  "authorization",
  "x-account-type",
  "x-auth-session-id",
  "x-campaign-os-account-type",
  "x-campaign-os-capabilities",
  "x-campaign-os-capability",
  "x-campaign-os-chain-id",
  "x-campaign-os-credential-boundary",
  "x-campaign-os-network",
  "x-campaign-os-proof-status",
  "x-campaign-os-role",
  "x-campaign-os-roles",
  "x-campaign-os-session-id",
  "x-campaign-os-wallet-address",
  "x-campaign-os-wallet-source",
  "x-capabilities",
  "x-capability",
  "x-chain-id",
  "x-network",
  "x-role",
  "x-roles",
  "x-session-id",
]);

export const isCallerAuthorityHeaderName = (rawName: string): boolean => {
  const name = rawName.trim().toLowerCase();

  return name.startsWith("x-wallet-") || CALLER_AUTHORITY_HEADER_NAMES.has(name);
};

export const isUnambiguousApiRequestTarget = (requestTarget: string): boolean => {
  if (
    typeof requestTarget !== "string"
    || !requestTarget.startsWith("/")
    || requestTarget.includes("#")
  ) {
    return false;
  }

  const queryIndex = requestTarget.search(/[?#]/u);
  const rawPathname = queryIndex < 0 ? requestTarget : requestTarget.slice(0, queryIndex);
  if (
    rawPathname.includes("\\")
    || EXACT_MALFORMED_PERCENT_ENCODING.test(rawPathname)
    || EXACT_ENCODED_BACKSLASH.test(rawPathname)
  ) {
    return false;
  }

  try {
    return new URL(rawPathname, "http://campaign-os.invalid").pathname === rawPathname;
  } catch {
    return false;
  }
};

const exactString = (
  minLength: number,
  maxLength: number,
  allowedValues?: readonly string[],
): ExactJsonPropertyContract => Object.freeze({
  ...(allowedValues ? { allowedValues: Object.freeze([...allowedValues]) } : {}),
  maxLength,
  minLength,
  type: "string" as const,
});

const exactBoundedId = (
  minLength: number,
  maxLength: number,
): ExactJsonPropertyContract => Object.freeze({
  ...exactString(minLength, maxLength),
  pattern: EXACT_BOUNDED_ID_PATTERN,
});

const exactJsonBody = (
  maxBytes: number,
  properties: Readonly<Record<string, ExactJsonPropertyContract>>,
  required: readonly string[],
): ExactJsonBodyContract => Object.freeze({
  additionalProperties: false as const,
  contentType: "application/json" as const,
  maxBytes,
  mode: "json" as const,
  properties: Object.freeze({ ...properties }),
  required: Object.freeze([...required]),
});

const exactRequestContract = ({
  body,
  cookie,
  csrf,
  method,
  pathParameters = EXACT_EMPTY_PATH_PARAMETERS,
}: {
  body: ExactProtectedApiRequestContract["body"];
  cookie: ExactRequestCredentialRequirement;
  csrf: ExactRequestCredentialRequirement;
  method: "GET" | "POST";
  pathParameters?: Readonly<Record<string, ExactJsonPropertyContract>>;
}): ExactProtectedApiRequestContract => {
  const allowedHeaders = [
    ...(body.mode === "json" ? [EXACT_CORS_CONTENT_TYPE_HEADER] : []),
    ...(csrf === "required" ? [EXACT_CORS_CSRF_HEADER] : []),
    EXACT_CORS_TRACE_HEADER,
  ];

  return Object.freeze({
    body,
    cookie,
    cors: Object.freeze({
      allowedHeaders: Object.freeze(allowedHeaders),
      allowedMethods: Object.freeze([method]),
    }),
    csrf,
    headers: Object.freeze({
      controlled: EXACT_CONTROLLED_HEADERS,
      maxBytesByName: EXACT_HEADER_MAX_BYTES,
      maxCount: EXACT_MAX_HEADER_COUNT,
      maxTotalBytes: EXACT_MAX_TOTAL_HEADER_BYTES,
      rejectCallerAuthority: true as const,
    }),
    origin: "required" as const,
    pathParameters,
    query: EXACT_NO_QUERY,
  });
};

const sessionIdPathParameter = Object.freeze({
  sessionId: exactString(1, EXACT_PROTECTED_PATH_PARAMETER_MAX_LENGTH),
});
const taskIdPathParameter = Object.freeze({
  taskId: exactString(1, EXACT_PROTECTED_PATH_PARAMETER_MAX_LENGTH),
});

export const exactProtectedApiRouteContracts = Object.freeze([
  Object.freeze({
    credentialedCors: true as const,
    id: "wallet.auth.challenge.create" as const,
    method: "POST" as const,
    operationId: "createWalletAuthenticationChallenge",
    path: "/api/wallet/auth/challenges",
    request: exactRequestContract({
      body: exactJsonBody(2_048, {
        adapterId: exactString(1, 80),
        caHash: exactString(1, 128),
        chainId: exactString(1, 32),
        network: exactString(1, 7, ["mainnet", "testnet"]),
        walletAddress: exactString(1, 160),
      }, ["adapterId", "chainId", "network", "walletAddress"]),
      cookie: "optional",
      csrf: "forbidden",
      method: "POST",
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "wallet.auth.session.create" as const,
    method: "POST" as const,
    operationId: "createWalletAuthenticationSession",
    path: "/api/wallet/auth/sessions",
    request: exactRequestContract({
      body: exactJsonBody(96 * 1_024, {
        adapterProof: Object.freeze({ type: "object" as const }),
        challengeId: exactString(1, 160),
        message: exactString(1, 16_384),
        nonce: exactString(32, 512),
        publicKey: exactString(1, 4_096),
        signature: exactString(1, 8_192),
      }, ["challengeId", "message", "nonce", "signature"]),
      cookie: "optional",
      csrf: "forbidden",
      method: "POST",
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "wallet.auth.session.current" as const,
    method: "GET" as const,
    operationId: "getCurrentWalletAuthenticationSession",
    path: "/api/wallet/auth/session",
    request: exactRequestContract({
      body: EXACT_NO_BODY,
      cookie: "required",
      csrf: "forbidden",
      method: "GET",
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "wallet.auth.session.rotate" as const,
    method: "POST" as const,
    operationId: "rotateWalletAuthenticationSession",
    path: "/api/wallet/auth/session/rotate",
    request: exactRequestContract({
      body: EXACT_NO_BODY,
      cookie: "required",
      csrf: "required",
      method: "POST",
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "wallet.auth.session.logout" as const,
    method: "POST" as const,
    operationId: "logoutWalletAuthenticationSession",
    path: "/api/wallet/auth/logout",
    request: exactRequestContract({
      body: EXACT_NO_BODY,
      cookie: "required",
      csrf: "required",
      method: "POST",
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "admin.wallet-session.revoke" as const,
    method: "POST" as const,
    operationId: "revokeWalletAuthenticationSession",
    path: "/api/admin/wallet-sessions/:sessionId/revoke",
    request: exactRequestContract({
      body: exactJsonBody(512, {
        reasonCode: exactString(1, 64, [
          "ADMIN_REVOKED",
          "COMPROMISE_RESPONSE",
          "MEMBERSHIP_CHANGED",
        ]),
      }, ["reasonCode"]),
      cookie: "required",
      csrf: "required",
      method: "POST",
      pathParameters: sessionIdPathParameter,
    }),
  }),
  Object.freeze({
    credentialedCors: true as const,
    id: "tasks.verify" as const,
    method: "POST" as const,
    operationId: "verifyTask",
    path: "/api/tasks/:taskId/verify",
    request: exactRequestContract({
      body: exactJsonBody(2_048, {
        campaignId: exactBoundedId(1, EXACT_PROTECTED_PATH_PARAMETER_MAX_LENGTH),
      }, ["campaignId"]),
      cookie: "required",
      csrf: "required",
      method: "POST",
      pathParameters: taskIdPathParameter,
    }),
  }),
] as const satisfies readonly ExactProtectedApiRouteContract[]);

export const exactProtectedApiRouteContractById = Object.freeze(Object.fromEntries(
  exactProtectedApiRouteContracts.map((contract) => [contract.id, contract]),
)) as Readonly<Record<ExactProtectedApiRouteId, ExactProtectedApiRouteContract>>;

export interface ResolvedExactProtectedApiRoute {
  params: Readonly<Record<string, string>>;
  queryAllowed: boolean;
  route: ExactProtectedApiRouteContract;
}

const safeExactPathParameter = (
  rawValue: string,
  contract: ExactJsonPropertyContract,
): string | undefined => {
  let value: string;
  try {
    value = decodeURIComponent(rawValue);
  } catch {
    return undefined;
  }

  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
    || (contract.minLength !== undefined && value.length < contract.minLength)
    || (contract.maxLength !== undefined && value.length > contract.maxLength)
  ) {
    return undefined;
  }

  return value;
};

const matchExactProtectedPath = (
  pathname: string,
  routeContract: ExactProtectedApiRouteContract,
): Readonly<Record<string, string>> | undefined => {
  const pathSegments = pathname.split("/");
  const templateSegments = routeContract.path.split("/");
  if (pathSegments.length !== templateSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index] ?? "";
    const pathSegment = pathSegments[index] ?? "";
    if (!templateSegment.startsWith(":")) {
      if (templateSegment !== pathSegment) {
        return undefined;
      }
      continue;
    }

    const name = templateSegment.slice(1);
    const parameterContract = routeContract.request.pathParameters[name];
    const value = parameterContract
      ? safeExactPathParameter(pathSegment, parameterContract)
      : undefined;
    if (!value) {
      return undefined;
    }
    params[name] = value;
  }

  return Object.freeze(params);
};

export const resolveExactProtectedApiRoute = (
  requestTarget: string,
): ResolvedExactProtectedApiRoute | undefined => {
  if (
    typeof requestTarget !== "string"
    || requestTarget.length === 0
    || !isUnambiguousApiRequestTarget(requestTarget)
  ) {
    return undefined;
  }
  const hashIndex = requestTarget.indexOf("#");
  const withoutHash = hashIndex < 0 ? requestTarget : requestTarget.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex < 0 ? withoutHash : withoutHash.slice(0, queryIndex);
  const query = queryIndex < 0 ? "" : withoutHash.slice(queryIndex + 1);

  for (const routeContract of exactProtectedApiRouteContracts) {
    const params = matchExactProtectedPath(pathname, routeContract);
    if (params) {
      return Object.freeze({
        params,
        queryAllowed: query.length === 0,
        route: routeContract,
      });
    }
  }

  return undefined;
};

export const apiRuntimeRoutes = [
  route({
    apiGroup: "runtime",
    boundary,
    id: "runtime.health",
    method: "GET",
    path: "/api/health",
    productionDependencies: dependenciesFor("runtime"),
    readiness: "ready",
    riskLevel: "low",
    serviceGroup: "runtime",
    summary: text("Local runtime health and safety flags.", "本地 runtime 健康状态与安全边界。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "runtime",
    boundary,
    id: "runtime.contracts",
    method: "GET",
    path: "/api/contracts",
    productionDependencies: dependenciesFor("runtime"),
    readiness: "ready",
    riskLevel: "low",
    serviceGroup: "runtime",
    summary: text("Local route catalog and API skill coverage.", "本地 route catalog 与 API Skill 覆盖。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "runtime",
    boundary: text(
      "Local production database handoff readiness review route. No live API, database connection, DB client construction, query, write, transaction, migration execution, secret reveal, provider call, contract write, storage write, reward custody, or reward distribution is performed.",
      "本地 production database handoff readiness review route。不会执行实时 API、数据库连接、DB client 构造、查询、写入、事务、migration 执行、secret 暴露、provider 调用、合约写入、storage 写入、奖励托管或发奖。",
      "本地 production database handoff readiness review route。不會執行即時 API、資料庫連線、DB client 建構、查詢、寫入、交易、migration 執行、secret 暴露、provider 呼叫、合約寫入、storage 寫入、獎勵託管或發獎。",
    ),
    id: "backend.production-database.handoff-readiness",
    method: "GET",
    path: "/api/backend/production-database/handoff-readiness",
    productionDependencies: dependenciesFor("runtime"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "runtime",
    summary: text("Inspect local production database handoff readiness.", "检查本地 production database handoff readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "service_registry",
    boundary,
    id: "runtime.services",
    method: "GET",
    path: "/api/services",
    productionDependencies: dependenciesFor("service_registry"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "service_registry",
    summary: text("External service registry readiness.", "外部服务 registry readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "wallet_session",
    apiSkillId: "agent_wallet_action",
    boundary,
    id: "agent.wallet.action.review",
    method: "POST",
    path: "/api/agent-wallet/actions/review",
    productionDependencies: dependenciesFor("wallet_session"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "wallet_session",
    summary: text("Review internal Agent Skill wallet action readiness.", "审核内部 Agent Skill 钱包动作 readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "wallet_session",
    apiSkillId: "create_wallet_session",
    boundary,
    id: "wallet.session.create",
    method: "POST",
    path: "/api/wallet/session",
    productionDependencies: dependenciesFor("wallet_session"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "wallet_session",
    summary: text("Create a normalized local wallet session.", "创建本地归一化钱包会话。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "list_campaigns",
    boundary,
    id: "campaigns.list",
    method: "GET",
    path: "/api/campaigns",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("List public lifecycle Campaign OS campaigns.", "列出公开 lifecycle Campaign OS 活动。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "list_campaigns",
    boundary,
    id: "campaigns.owner.list",
    method: "GET",
    path: "/api/projects/:projectId/campaigns",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("List repository campaign drafts owned by the issued wallet session.", "列出 issued wallet session 拥有的 repository 活动草稿。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_creation",
    apiSkillId: "create_campaign",
    boundary,
    id: "campaigns.create",
    method: "POST",
    path: "/api/campaigns",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Create a local campaign draft.", "创建本地活动草稿。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "get_campaign_detail",
    boundary,
    id: "campaigns.detail",
    method: "GET",
    path: "/api/campaigns/:campaignId",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Get public lifecycle Campaign detail.", "获取公开 lifecycle 活动详情。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "get_campaign_lifecycle",
    boundary,
    id: "campaigns.lifecycle",
    method: "GET",
    path: "/api/campaigns/:campaignId/lifecycle",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect local campaign lifecycle operations.", "检查本地活动 lifecycle 操作。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "get_campaign_launch_readiness",
    boundary,
    id: "campaigns.launch.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/launch-readiness",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect local campaign launch readiness.", "检查本地活动 launch readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary,
    id: "campaigns.delivery.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/delivery-readiness",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect local delivery checklist readiness.", "检查本地交付清单 readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local front-end/back-end publish delivery review bridge. No live API, production publish, provider call, contract write, storage write, or reward execution is performed.",
      "本地前后端 publish delivery review bridge。不会执行真实发布、provider 调用、合约写入、storage 写入或奖励执行。",
    ),
    id: "campaigns.publish.delivery.review",
    method: "GET",
    path: "/api/campaigns/:campaignId/publish-delivery-review",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect the local publish and delivery joint review payload.", "检查本地发布与交付联合 review payload。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local points/ranking ledger runtime review route. No live API, Pixiepoints write, backend ledger write, provider/indexer call, wallet signature, contract write, export file, reward custody, or reward distribution is performed.",
      "本地 points/ranking ledger runtime review route。不会执行实时 API、Pixiepoints 写入、后端账本写入、provider/indexer 调用、钱包签名、合约写入、导出文件、奖励托管或发奖。",
    ),
    id: "campaigns.points.ranking.ledger.runtime",
    method: "GET",
    path: "/api/campaigns/:campaignId/points-ranking-ledger-runtime",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect the local points ranking ledger runtime payload.", "检查本地 points ranking ledger runtime payload。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary,
    id: "campaigns.companion.contract.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/companion-contract-readiness",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect local companion contract readiness.", "检查本地 companion contract readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local contract writer runtime readiness review route. No live API, signer, wallet signature, ABI generation, contract write, root write, queue publishing, scheduler execution, storage write, export write, reward custody, or reward distribution is performed.",
      "本地 contract writer runtime readiness review route。不会执行实时 API、真实 signer、钱包签名、ABI 生成、合约写入、root 写入、队列发布、调度执行、storage 写入、导出写入、奖励托管或发奖。",
    ),
    id: "campaigns.contract.writer.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/contract-writer/readiness",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "campaign",
    summary: text("Inspect local contract writer runtime readiness.", "检查本地 contract writer runtime readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local reward distribution handoff readiness review route. No live API, payout, reward custody, reward distribution, provider call, wallet signing, contract write, queue publishing, scheduler execution, or worker execution is performed.",
      "本地 reward distribution handoff readiness review route。不会执行实时 API、payout、奖励托管、发奖、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
      "本地 reward distribution handoff readiness review route。不會執行即時 API、payout、獎勵託管、發獎、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
    ),
    id: "campaigns.reward.distribution.handoff.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/reward-distribution/handoff-readiness",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "campaign",
    summary: text("Inspect local reward distribution handoff readiness.", "检查本地 reward distribution handoff readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local review-only project owner funding proof bridge. No live API call, upload, object storage write, signed URL, funding transfer, reward custody, reward distribution, provider call, wallet signing, contract write, queue publishing, scheduler execution, or worker execution is performed.",
      "本地、仅审核的项目方资金证明 bridge。不会执行上传、对象存储写入、signed URL、资金转移、奖励托管、发奖、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
      "本地、僅審核的專案方資金證明 bridge。不會執行上傳、物件儲存寫入、signed URL、資金轉移、獎勵託管、發獎、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
    ),
    id: "campaigns.reward.funding-proof.review",
    method: "GET",
    path: "/api/campaigns/:campaignId/reward-distribution/funding-proof-review",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "campaign",
    summary: text("Inspect local project owner funding proof review state.", "检查本地项目方资金证明 review state。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary: text(
      "Local review-only project owner funding proof metadata normalization route. Request metadata is sanitized and not persisted; No live API call, upload, object storage write, signed URL, funding transfer, reward custody, reward distribution, provider call, wallet signing, contract write, queue publishing, scheduler execution, or worker execution is performed.",
      "本地、仅审核的项目方资金证明 metadata 归一化 route。请求 metadata 会被清洗且不会持久化；不会执行上传、对象存储写入、signed URL、资金转移、奖励托管、发奖、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
      "本地、僅審核的專案方資金證明 metadata 歸一化 route。請求 metadata 會被清洗且不會持久化；不會執行上傳、物件儲存寫入、signed URL、資金轉移、獎勵託管、發獎、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
    ),
    id: "campaigns.reward.funding-proof.review.submit",
    method: "POST",
    path: "/api/campaigns/:campaignId/reward-distribution/funding-proof-review",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "campaign",
    summary: text("Normalize local project owner funding proof review metadata.", "归一化本地项目方资金证明 review metadata。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary,
    id: "campaigns.contract.transparency",
    method: "GET",
    path: "/api/campaigns/:campaignId/contract-transparency",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text("Inspect local contract transparency lanes.", "检查本地 contract transparency lanes。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "task_generation",
    apiSkillId: "add_campaign_task",
    boundary,
    id: "campaigns.tasks.add",
    method: "POST",
    path: "/api/campaigns/:campaignId/tasks",
    productionDependencies: dependenciesFor("task"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "task",
    summary: text("Add a local campaign task draft.", "添加本地活动任务草稿。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "task_generation",
    apiSkillId: "generate_campaign_tasks",
    boundary,
    id: "campaigns.tasks.generate",
    method: "POST",
    path: "/api/campaigns/:campaignId/tasks/generate",
    productionDependencies: dependenciesFor("task"),
    readiness: "ready",
    riskLevel: "medium",
    serviceGroup: "task",
    summary: text("Generate local campaign task suggestions.", "生成本地活动任务建议。"),
    supportMode: "local_seeded",
  }),
  providerLiveRoute({
    apiGroup: "task_verification",
    apiSkillId: "verify_task",
    boundary: taskVerificationBoundary,
    id: "tasks.verify",
    method: "POST",
    path: "/api/tasks/:taskId/verify",
    productionDependencies: [
      "auth_session",
      "migration_runner",
      "production_database",
      "provider_adapters",
      "sensitive_material_boundary",
      "worker_queue",
    ],
    readiness: "blocked",
    riskLevel: "high",
    serviceGroup: "verification",
    summary: text(
      "Verify task evidence through a protected provider-live runtime requiring PostgreSQL schema 0004.",
      "通过要求 PostgreSQL schema 0004 的受保护 provider-live runtime 验证任务 evidence。",
    ),
    supportMode: "provider_live",
  }),
  route({
    apiGroup: "task_verification",
    apiSkillId: "get_campaign_provider_readiness",
    boundary,
    id: "campaigns.provider.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/provider-readiness",
    productionDependencies: dependenciesFor("verification"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "verification",
    summary: text("Inspect local provider and verification readiness.", "检查本地 provider 与验证 readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "eligibility",
    apiSkillId: "check_eligibility",
    boundary,
    id: "campaigns.eligibility",
    method: "GET",
    path: "/api/campaigns/:campaignId/eligibility",
    productionDependencies: dependenciesFor("eligibility"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "eligibility",
    summary: text("Check local campaign eligibility.", "检查本地活动资格。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "analytics",
    apiSkillId: "get_campaign_analytics",
    boundary,
    id: "campaigns.analytics",
    method: "GET",
    path: "/api/campaigns/:campaignId/analytics",
    productionDependencies: dependenciesFor("analytics"),
    readiness: "ready",
    riskLevel: "low",
    serviceGroup: "analytics",
    summary: text("Get local campaign analytics summary.", "获取本地活动 analytics 汇总。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "analytics",
    boundary: text(
      "Local analytics ingestion readiness review route. No live API, analytics SDK, event warehouse write, browser tracking, profiling, fingerprinting, provider call, production database mutation, export write, contract write, wallet signature, reward custody, or reward distribution is performed.",
      "本地 analytics ingestion readiness review route。不会执行实时 API、analytics SDK、事件仓库写入、浏览器追踪、画像、指纹识别、provider 调用、生产数据库变更、导出写入、合约写入、钱包签名、奖励托管或发奖。",
    ),
    id: "campaigns.analytics.ingestion.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/analytics/ingestion-readiness",
    productionDependencies: dependenciesFor("analytics"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "analytics",
    summary: text("Inspect local analytics ingestion runtime readiness.", "检查本地 analytics ingestion runtime readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_summary",
    apiSkillId: "summarize_campaign",
    boundary,
    id: "campaigns.summary",
    method: "GET",
    path: "/api/campaigns/:campaignId/summary",
    productionDependencies: dependenciesFor("analytics"),
    readiness: "ready",
    riskLevel: "low",
    serviceGroup: "analytics",
    summary: text("Get a local campaign report-card summary.", "获取本地活动报告卡汇总。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "content_generation",
    apiSkillId: "generate_i18n_draft",
    boundary,
    id: "campaigns.i18n.generate",
    method: "POST",
    path: "/api/campaigns/:campaignId/i18n/generate",
    productionDependencies: dependenciesFor("i18n"),
    readiness: "local_only",
    riskLevel: "medium",
    serviceGroup: "i18n",
    summary: text("Generate local i18n draft for human review.", "生成人工审核用本地 i18n 草稿。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "content_generation",
    apiSkillId: "generate_campaign_posts",
    boundary,
    id: "campaigns.posts.generate",
    method: "POST",
    path: "/api/campaigns/:campaignId/posts/generate",
    productionDependencies: dependenciesFor("i18n"),
    readiness: "review_required",
    riskLevel: "medium",
    serviceGroup: "i18n",
    summary: text("Generate local campaign channel post drafts.", "生成本地活动渠道帖子草稿。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    apiSkillId: "export_winners",
    boundary,
    id: "campaigns.export.preview",
    method: "POST",
    path: "/api/campaigns/:campaignId/export",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("Preview local winners export.", "预览本地 winners 导出。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    apiSkillId: "get_campaign_export_readiness",
    boundary,
    id: "campaigns.export.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/export-readiness",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("Inspect local export confirmation readiness.", "检查本地导出确认 readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    boundary: text(
      "Local object storage export readiness review route. No live API, upload, object key creation, signed URL creation, download, provider call, contract write, wallet signature, reward custody, or reward distribution is performed.",
      "本地 object storage export readiness review route。不会执行实时 API、上传、object key 创建、signed URL 创建、下载、provider 调用、合约写入、钱包签名、奖励托管或发奖。",
    ),
    id: "campaigns.export.storage.readiness",
    method: "GET",
    path: "/api/campaigns/:campaignId/export/storage-readiness",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("Inspect local object storage export readiness.", "检查本地 object storage export readiness。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    boundary,
    id: "campaigns.export.artifacts.list",
    method: "GET",
    path: "/api/campaigns/:campaignId/export-artifacts",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("List local export artifact audit records.", "列出本地导出 artifact 审计记录。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    boundary,
    id: "campaigns.export.artifacts.detail",
    method: "GET",
    path: "/api/campaigns/:campaignId/export-artifacts/:artifactId",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("Get a local export artifact audit record.", "获取本地导出 artifact 审计记录。"),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "export",
    boundary,
    id: "campaigns.export.artifacts.file",
    method: "GET",
    path: "/api/campaigns/:campaignId/export-artifacts/:artifactId/file",
    productionDependencies: dependenciesFor("export"),
    readiness: "review_required",
    riskLevel: "high",
    serviceGroup: "export",
    summary: text("Return a local export artifact file handoff payload.", "返回本地导出 artifact 文件交接 payload。"),
    supportMode: "local_seeded",
  }),
] as const satisfies readonly ApiRuntimeRouteContract[];

export const participantCampaignRouteContracts = [
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "get_campaign_detail",
    boundary,
    id: "campaigns.owner.detail",
    method: "GET",
    path: "/api/owner/campaigns/:campaignId",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "blocked",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text(
      "Get repository Campaign detail through issued Owner authorization.",
      "通过 issued Owner authorization 获取 repository Campaign 详情。",
    ),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    apiSkillId: "list_campaigns",
    boundary,
    id: "campaigns.participant.list",
    method: "GET",
    path: "/api/participant/campaigns",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "blocked",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text(
      "List public and server-allowlisted Participant Campaigns.",
      "列出公开及 server allowlist 授权的 Participant Campaign。",
    ),
    supportMode: "local_seeded",
  }),
  route({
    apiGroup: "campaign_discovery",
    boundary,
    id: "campaigns.participant.journey",
    method: "GET",
    path: "/api/participant/campaigns/:campaignId/journey",
    productionDependencies: dependenciesFor("campaign"),
    readiness: "blocked",
    riskLevel: "medium",
    serviceGroup: "campaign",
    summary: text(
      "Get an issued Participant Campaign journey projection.",
      "获取 issued Participant Campaign journey projection。",
    ),
    supportMode: "local_seeded",
  }),
] as const satisfies readonly ApiRuntimeRouteContract[];

export const apiRuntimeContractRoutes = [
  ...apiRuntimeRoutes,
  ...participantCampaignRouteContracts,
] as const satisfies readonly ApiRuntimeRouteContract[];

export const ADMIN_API_PATH_PARAMETER_MAX_LENGTH = 160;

export interface AdminApiRouteAuthContract {
  allowedRoles: readonly CampaignOsAdminOperatorRoleId[];
  anonymous: false;
  enforcementStatus: "local_enforced";
  membershipRequired: true;
  policyId: string;
  requestedRoleHeader: "x-campaign-os-roles";
  requestedRoleRequired: true;
  sessionRequired: true;
}

export interface AdminApiRequestFieldContract {
  allowedValues?: readonly string[];
  maxLength?: number;
  minLength?: number;
  name: string;
  pattern?: string;
  required: boolean;
}

export interface AdminApiRequestBodyContract {
  allowedFields: readonly string[];
  contentType: "application/json";
  fields: readonly AdminApiRequestFieldContract[];
  required: true;
  requiredFields: readonly string[];
}

export interface AdminApiRouteRequestContract {
  body?: AdminApiRequestBodyContract;
  headers: readonly AdminApiRequestFieldContract[];
  query: readonly string[];
  range: "forbidden" | "not_applicable";
}

export interface AdminApiRuntimeRouteDefinition {
  apiGroup: ApiRuntimeRouteContract["apiGroup"];
  auth: AdminApiRouteAuthContract;
  boundary: LocalizedText;
  id: string;
  method: string;
  operationId: string;
  path: string;
  productionDependencies: ApiRuntimeRouteContract["productionDependencies"];
  readiness: ApiRuntimeRouteContract["readiness"];
  request: AdminApiRouteRequestContract;
  riskLevel: ApiRuntimeRouteContract["riskLevel"];
  serviceGroup: ApiRuntimeRouteContract["serviceGroup"];
  serviceOwner: "campaign-service" | "export-service";
  summary: LocalizedText;
  supportMode: ApiRuntimeRouteContract["supportMode"];
}

export interface AdminApiRuntimeRouteContract
  extends Omit<AdminApiRuntimeRouteDefinition, "id" | "method">,
    ApiRuntimeRouteContract {
  auth: AdminApiRouteAuthContract & { policyId: AdminOperatorRouteId };
  id: AdminOperatorRouteId;
  method: ApiRuntimeRouteContract["method"];
}

type AdminApiRouteInput = Pick<
  AdminApiRuntimeRouteContract,
  "id" | "method" | "operationId" | "path" | "request" | "serviceGroup" | "summary"
> & { serviceGroup: "campaign" | "export" };

const adminOperatorRoles = Object.freeze([
  "internal_operator",
  "review_operator",
] as const satisfies readonly CampaignOsAdminOperatorRoleId[]);
const adminRuntimeBoundary = text(
  "Authenticated Admin transport backed only by configured durable PostgreSQL review state. No live API, provider call, wallet signature, contract write, object storage write, reward custody, or reward distribution is performed.",
  "仅限认证 Admin transport，并且只使用已配置的 durable PostgreSQL review state。不会执行实时 API、provider 调用、钱包签名、合约写入、对象存储写入、奖励托管或发奖。",
);
const noRequestFields = Object.freeze([] as const);
const noQueryParameters = Object.freeze([] as const);

const adminAuth = (policyId: AdminOperatorRouteId): AdminApiRuntimeRouteContract["auth"] =>
  Object.freeze({
    allowedRoles: adminOperatorRoles,
    anonymous: false,
    enforcementStatus: "local_enforced",
    membershipRequired: true,
    policyId,
    requestedRoleHeader: "x-campaign-os-roles",
    requestedRoleRequired: true,
    sessionRequired: true,
  });

const adminRoute = <TRoute extends AdminApiRouteInput>(
  contract: TRoute,
): AdminApiRuntimeRouteContract & TRoute => ({
  apiGroup: contract.serviceGroup === "export" ? "export" : "campaign_discovery",
  auth: adminAuth(contract.id),
  boundary: adminRuntimeBoundary,
  productionDependencies: dependenciesFor(contract.serviceGroup),
  readiness: "review_required",
  riskLevel: "high",
  serviceOwner: contract.serviceGroup === "export" ? "export-service" : "campaign-service",
  supportMode: "local_seeded",
  ...contract,
});

const adminRequest = ({
  body,
  headers = noRequestFields,
  query = noQueryParameters,
  range = "not_applicable",
}: Partial<AdminApiRouteRequestContract> = {}): AdminApiRouteRequestContract => Object.freeze({
  ...(body ? { body } : {}),
  headers,
  query,
  range,
});

const sha256RequestField = (name: string, required: boolean): AdminApiRequestFieldContract =>
  Object.freeze({
    maxLength: 64,
    minLength: 64,
    name,
    pattern: "^[a-f0-9]{64}$",
    required,
  });

const decisionBody = Object.freeze({
  allowedFields: Object.freeze(["decision", "note", "reasonCode", "snapshotFingerprint"] as const),
  contentType: "application/json" as const,
  fields: Object.freeze([
    Object.freeze({
      allowedValues: Object.freeze(["approved", "rejected", "needs_review"] as const),
      name: "decision",
      required: true,
    }),
    Object.freeze({ maxLength: 1_000, name: "note", required: false }),
    Object.freeze({
      maxLength: 64,
      minLength: 1,
      name: "reasonCode",
      pattern: "^[a-z0-9_:-]+$",
      required: true,
    }),
    sha256RequestField("snapshotFingerprint", true),
  ]),
  required: true as const,
  requiredFields: Object.freeze(["decision", "reasonCode", "snapshotFingerprint"] as const),
}) satisfies AdminApiRequestBodyContract;

const artifactGenerateBody = Object.freeze({
  allowedFields: Object.freeze(["format", "expectedSourceFingerprint"] as const),
  contentType: "application/json" as const,
  fields: Object.freeze([
    Object.freeze({
      allowedValues: Object.freeze(["csv", "json"] as const),
      name: "format",
      required: true,
    }),
    sha256RequestField("expectedSourceFingerprint", false),
  ]),
  required: true as const,
  requiredFields: Object.freeze(["format"] as const),
}) satisfies AdminApiRequestBodyContract;

const idempotencyKeyHeader = Object.freeze({
  maxLength: 128,
  minLength: 8,
  name: "Idempotency-Key",
  pattern: "^[A-Za-z0-9._:-]+$",
  required: true,
}) satisfies AdminApiRequestFieldContract;

export const adminApiRuntimeRoutes = [
  adminRoute({
    id: "admin.campaigns.list",
    method: "GET",
    operationId: "listAdminCampaigns",
    path: "/api/admin/campaigns",
    request: adminRequest({ query: Object.freeze(["limit"] as const) }),
    serviceGroup: "campaign",
    summary: text("List Campaigns visible to the authenticated Admin operator.", "列出认证 Admin operator 可见的 Campaign。"),
  }),
  adminRoute({
    id: "admin.reviews.list",
    method: "GET",
    operationId: "listParticipantReviews",
    path: "/api/admin/campaigns/:campaignId/reviews",
    request: adminRequest({ query: Object.freeze(["limit", "state"] as const) }),
    serviceGroup: "campaign",
    summary: text("List the durable Participant review queue.", "列出 durable Participant review queue。"),
  }),
  adminRoute({
    id: "admin.reviews.detail",
    method: "GET",
    operationId: "getParticipantReview",
    path: "/api/admin/campaigns/:campaignId/reviews/:participantId",
    request: adminRequest(),
    serviceGroup: "campaign",
    summary: text("Get a durable Participant review snapshot and history.", "获取 durable Participant review snapshot 与历史。"),
  }),
  adminRoute({
    id: "admin.reviews.decide",
    method: "POST",
    operationId: "submitParticipantReviewDecision",
    path: "/api/admin/campaigns/:campaignId/reviews/:participantId/decisions",
    request: adminRequest({
      body: decisionBody,
      headers: Object.freeze([idempotencyKeyHeader] as const),
    }),
    serviceGroup: "campaign",
    summary: text("Append an idempotent Participant review decision.", "追加幂等 Participant review decision。"),
  }),
  adminRoute({
    id: "admin.winners.list",
    method: "GET",
    operationId: "listCurrentWinners",
    path: "/api/admin/campaigns/:campaignId/winners",
    request: adminRequest({ query: Object.freeze(["limit"] as const) }),
    serviceGroup: "campaign",
    summary: text("List the current approved winner projection.", "列出 current approved winner projection。"),
  }),
  adminRoute({
    id: "admin.artifacts.generate",
    method: "POST",
    operationId: "generateAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts",
    request: adminRequest({ body: artifactGenerateBody }),
    serviceGroup: "export",
    summary: text("Generate or replay an immutable durable export artifact.", "生成或重放 immutable durable export artifact。"),
  }),
  adminRoute({
    id: "admin.artifacts.list",
    method: "GET",
    operationId: "listAdminArtifacts",
    path: "/api/admin/campaigns/:campaignId/artifacts",
    request: adminRequest({ query: Object.freeze(["limit", "format"] as const) }),
    serviceGroup: "export",
    summary: text("List durable export artifact audit records.", "列出 durable export artifact 审计记录。"),
  }),
  adminRoute({
    id: "admin.artifacts.detail",
    method: "GET",
    operationId: "getAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts/:artifactId",
    request: adminRequest(),
    serviceGroup: "export",
    summary: text("Get durable export artifact metadata.", "获取 durable export artifact metadata。"),
  }),
  adminRoute({
    id: "admin.artifacts.download",
    method: "GET",
    operationId: "downloadAdminArtifact",
    path: "/api/admin/campaigns/:campaignId/artifacts/:artifactId/download",
    request: adminRequest({ range: "forbidden" }),
    serviceGroup: "export",
    summary: text("Download exact stored durable artifact content.", "下载 exact stored durable artifact content。"),
  }),
] as const satisfies readonly AdminApiRuntimeRouteContract[];

export type AdminApiRuntimeRouteId = (typeof adminApiRuntimeRoutes)[number]["id"];

export const adminApiRuntimeRouteById = Object.freeze(Object.fromEntries(
  adminApiRuntimeRoutes.map((runtimeRoute) => [runtimeRoute.id, runtimeRoute]),
)) as Readonly<Record<AdminApiRuntimeRouteId, (typeof adminApiRuntimeRoutes)[number]>>;

export const apiRuntimeRouteCatalog = [
  ...apiRuntimeContractRoutes,
  ...adminApiRuntimeRoutes,
] as const satisfies readonly ApiRuntimeRouteContract[];

export const createAdminApiRuntimeRouteInventory = (
  routes: readonly AdminApiRuntimeRouteDefinition[] = adminApiRuntimeRoutes,
) => {
  const readiness: Record<string, number> = {};

  for (const runtimeRoute of routes) {
    readiness[runtimeRoute.readiness] = (readiness[runtimeRoute.readiness] ?? 0) + 1;
  }

  return {
    operationIds: routes.map((runtimeRoute) => runtimeRoute.operationId),
    readiness,
    routeCount: routes.length,
    routeIds: routes.map((runtimeRoute) => runtimeRoute.id),
  };
};

export type AdminApiRouteCatalogIssueCode =
  | "AMBIGUOUS_ROUTE_MATCHER"
  | "DUPLICATE_METHOD_PATH"
  | "DUPLICATE_OPERATION_ID"
  | "DUPLICATE_QUERY_PARAMETER"
  | "DUPLICATE_ROUTE_ID"
  | "INVALID_ADMIN_AUTH_METADATA"
  | "INVALID_SERVICE_OWNERSHIP"
  | "MALFORMED_ROUTE_PATH"
  | "UNKNOWN_ROUTE_METHOD";

export interface AdminApiRouteCatalogIssue {
  code: AdminApiRouteCatalogIssueCode;
  routeId: string;
}

export interface AdminApiRouteCatalogValidation {
  issues: AdminApiRouteCatalogIssue[];
  valid: boolean;
}

const routeTemplateSegments = (path: string) => path.split("/").slice(1);
const isRouteParameter = (segment: string) => segment.startsWith(":");
const routeSpecificity = (route: AdminApiRuntimeRouteDefinition) =>
  routeTemplateSegments(route.path).filter((segment) => !isRouteParameter(segment)).length;

const malformedRoutePath = (path: string) => {
  if (
    !path.startsWith("/api/admin/")
    || path.endsWith("/")
    || path.includes("//")
    || path.includes("?")
    || path.includes("#")
    || path.includes("\\")
    || path.includes("%")
  ) {
    return true;
  }

  const parameterNames = new Set<string>();

  for (const segment of routeTemplateSegments(path)) {
    if (segment === "." || segment === "..") {
      return true;
    }

    if (!isRouteParameter(segment)) {
      if (!/^[A-Za-z0-9._~-]+$/.test(segment)) {
        return true;
      }
      continue;
    }

    if (!/^:[A-Za-z][A-Za-z0-9_]*$/.test(segment)) {
      return true;
    }

    const parameterName = segment.slice(1);
    if (parameterNames.has(parameterName)) {
      return true;
    }
    parameterNames.add(parameterName);
  }

  return false;
};

const routeTemplatesOverlap = (
  left: AdminApiRuntimeRouteDefinition,
  right: AdminApiRuntimeRouteDefinition,
) => {
  const leftSegments = routeTemplateSegments(left.path);
  const rightSegments = routeTemplateSegments(right.path);

  return leftSegments.length === rightSegments.length
    && leftSegments.every((segment, index) =>
      segment === rightSegments[index]
      || isRouteParameter(segment)
      || isRouteParameter(rightSegments[index]),
    );
};

export const validateAdminApiRouteCatalog = (
  routes: readonly AdminApiRuntimeRouteDefinition[] = adminApiRuntimeRoutes,
): AdminApiRouteCatalogValidation => {
  const issues: AdminApiRouteCatalogIssue[] = [];
  const routeIds = new Set<string>();
  const operationIds = new Set<string>();

  for (const runtimeRoute of routes) {
    if (routeIds.has(runtimeRoute.id)) {
      issues.push({ code: "DUPLICATE_ROUTE_ID", routeId: runtimeRoute.id });
    }
    routeIds.add(runtimeRoute.id);

    if (operationIds.has(runtimeRoute.operationId)) {
      issues.push({ code: "DUPLICATE_OPERATION_ID", routeId: runtimeRoute.id });
    }
    operationIds.add(runtimeRoute.operationId);

    if (runtimeRoute.method !== "GET" && runtimeRoute.method !== "POST") {
      issues.push({ code: "UNKNOWN_ROUTE_METHOD", routeId: runtimeRoute.id });
    }
    if (malformedRoutePath(runtimeRoute.path)) {
      issues.push({ code: "MALFORMED_ROUTE_PATH", routeId: runtimeRoute.id });
    }
    if (
      runtimeRoute.auth.policyId !== runtimeRoute.id
      || runtimeRoute.auth.anonymous
      || runtimeRoute.auth.enforcementStatus !== "local_enforced"
      || !runtimeRoute.auth.membershipRequired
      || !runtimeRoute.auth.requestedRoleRequired
      || !runtimeRoute.auth.sessionRequired
      || runtimeRoute.auth.allowedRoles.length === 0
    ) {
      issues.push({ code: "INVALID_ADMIN_AUTH_METADATA", routeId: runtimeRoute.id });
    }
    if (
      (runtimeRoute.serviceGroup === "campaign" && runtimeRoute.serviceOwner !== "campaign-service")
      || (runtimeRoute.serviceGroup === "export" && runtimeRoute.serviceOwner !== "export-service")
      || (runtimeRoute.serviceGroup !== "campaign" && runtimeRoute.serviceGroup !== "export")
    ) {
      issues.push({ code: "INVALID_SERVICE_OWNERSHIP", routeId: runtimeRoute.id });
    }
    if (new Set(runtimeRoute.request.query).size !== runtimeRoute.request.query.length) {
      issues.push({ code: "DUPLICATE_QUERY_PARAMETER", routeId: runtimeRoute.id });
    }
  }

  for (let leftIndex = 0; leftIndex < routes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < routes.length; rightIndex += 1) {
      const left = routes[leftIndex];
      const right = routes[rightIndex];

      if (left.method !== right.method) {
        continue;
      }
      if (left.path === right.path) {
        issues.push({ code: "DUPLICATE_METHOD_PATH", routeId: right.id });
        continue;
      }
      if (
        routeSpecificity(left) === routeSpecificity(right)
        && routeTemplatesOverlap(left, right)
      ) {
        issues.push({ code: "AMBIGUOUS_ROUTE_MATCHER", routeId: right.id });
      }
    }
  }

  return { issues, valid: issues.length === 0 };
};

interface ParsedAdminRequestTarget {
  decodedSegments: string[];
  query: string;
  rawSegments: string[];
}

const malformedPercentEncoding = /%(?![0-9A-Fa-f]{2})/;
const unsafeDecodedPathCharacter = /[\u0000-\u001f\u007f-\u009f]/;

const parseAdminRequestTarget = (requestTarget: string): ParsedAdminRequestTarget | undefined => {
  if (
    !requestTarget.startsWith("/")
    || requestTarget.includes("#")
    || requestTarget.includes("\\")
    || malformedPercentEncoding.test(requestTarget)
  ) {
    return undefined;
  }

  const queryIndex = requestTarget.indexOf("?");
  const rawPathname = queryIndex === -1 ? requestTarget : requestTarget.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : requestTarget.slice(queryIndex + 1);
  const pathname = rawPathname.length > 1 && rawPathname.endsWith("/")
    ? rawPathname.slice(0, -1)
    : rawPathname;

  if (!pathname || pathname.includes("//") || pathname.endsWith("/")) {
    return undefined;
  }

  const rawSegments = pathname.split("/").slice(1);
  const decodedSegments: string[] = [];

  try {
    for (const rawSegment of rawSegments) {
      const decodedSegment = decodeURIComponent(rawSegment);

      if (
        decodedSegment.length === 0
        || decodedSegment.length > ADMIN_API_PATH_PARAMETER_MAX_LENGTH
        || decodedSegment === "."
        || decodedSegment === ".."
        || decodedSegment.includes("/")
        || decodedSegment.includes("\\")
        || unsafeDecodedPathCharacter.test(decodedSegment)
      ) {
        return undefined;
      }
      decodedSegments.push(decodedSegment);
    }
  } catch {
    return undefined;
  }

  return { decodedSegments, query, rawSegments };
};

const matchAdminRoutePath = (
  route: AdminApiRuntimeRouteDefinition,
  target: ParsedAdminRequestTarget,
): Record<string, string> | undefined => {
  const templateSegments = routeTemplateSegments(route.path);

  if (templateSegments.length !== target.rawSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < templateSegments.length; index += 1) {
    const templateSegment = templateSegments[index];

    if (isRouteParameter(templateSegment)) {
      params[templateSegment.slice(1)] = target.decodedSegments[index];
      continue;
    }
    if (templateSegment !== target.rawSegments[index]) {
      return undefined;
    }
  }

  return params;
};

export type AdminApiRouteResolution =
  | Readonly<{
      matched: true;
      params: Record<string, string>;
      query: Record<string, string>;
      route: AdminApiRuntimeRouteDefinition;
    }>
  | Readonly<{
      matched: false;
      reason: "malformed_path" | "route_not_found";
    }>
  | Readonly<{
      allowedMethods: string[];
      matched: false;
      reason: "method_not_allowed";
    }>
  | Readonly<{
      matched: false;
      queryParameter: string;
      reason: "duplicate_query_parameter" | "query_not_allowed";
    }>;

export const resolveAdminApiRoute = (
  method: string,
  requestTarget: string,
  routes: readonly AdminApiRuntimeRouteDefinition[] = adminApiRuntimeRoutes,
): AdminApiRouteResolution => {
  const target = parseAdminRequestTarget(requestTarget);

  if (!target) {
    return { matched: false, reason: "malformed_path" };
  }

  const pathMatches = routes
    .map((runtimeRoute, index) => ({
      index,
      params: matchAdminRoutePath(runtimeRoute, target),
      route: runtimeRoute,
      specificity: routeSpecificity(runtimeRoute),
    }))
    .filter((candidate): candidate is typeof candidate & { params: Record<string, string> } =>
      candidate.params !== undefined,
    );

  if (pathMatches.length === 0) {
    return { matched: false, reason: "route_not_found" };
  }

  const highestSpecificity = Math.max(...pathMatches.map((candidate) => candidate.specificity));
  const precedenceMatches = pathMatches
    .filter((candidate) => candidate.specificity === highestSpecificity)
    .sort((left, right) => left.index - right.index);
  const normalizedMethod = method.trim().toUpperCase();
  const methodMatch = precedenceMatches.find((candidate) => candidate.route.method === normalizedMethod);

  if (!methodMatch) {
    return {
      allowedMethods: [...new Set(precedenceMatches.map((candidate) => candidate.route.method))],
      matched: false,
      reason: "method_not_allowed",
    };
  }

  const query: Record<string, string> = {};
  const allowedQuery = new Set(methodMatch.route.request.query);

  for (const [name, value] of new URLSearchParams(target.query)) {
    if (Object.prototype.hasOwnProperty.call(query, name)) {
      return { matched: false, queryParameter: name, reason: "duplicate_query_parameter" };
    }
    if (!allowedQuery.has(name)) {
      return { matched: false, queryParameter: name, reason: "query_not_allowed" };
    }
    query[name] = value;
  }

  return {
    matched: true,
    params: methodMatch.params,
    query,
    route: methodMatch.route,
  };
};

export const matchAdminApiRoute = (
  method: string,
  requestTarget: string,
  routes: readonly AdminApiRuntimeRouteDefinition[] = adminApiRuntimeRoutes,
) => {
  const resolution = resolveAdminApiRoute(method, requestTarget, routes);
  return resolution.matched ? resolution : undefined;
};

export type ApiRuntimeRouteId = (typeof apiRuntimeRoutes)[number]["id"];
export type ParticipantCampaignRouteId = (typeof participantCampaignRouteContracts)[number]["id"];
export type ApiRuntimeContractRouteId =
  | ApiRuntimeRouteId
  | ParticipantCampaignRouteId
  | AdminApiRuntimeRouteId;

export const apiRuntimeRouteById = Object.fromEntries(
  apiRuntimeRouteCatalog.map((runtimeRoute) => [runtimeRoute.id, runtimeRoute]),
) as Record<ApiRuntimeContractRouteId, ApiRuntimeRouteContract>;

export const createApiRuntimeContractCoverage = (): ApiRuntimeContractCoverage => {
  const coveredSkillIdSet = new Set(
    apiRuntimeRoutes
      .map((runtimeRoute) => runtimeRoute.apiSkillId)
      .filter((skillId): skillId is ApiSkillId => Boolean(skillId)),
  );
  const coveredSkillIds = requiredApiSkillIds.filter((skillId) => coveredSkillIdSet.has(skillId));

  return {
    coveredSkillIds,
    deferredSkillIds: requiredApiSkillIds.filter((skillId) => !coveredSkillIdSet.has(skillId)),
    routeCount: apiRuntimeRoutes.length,
    routeIds: apiRuntimeRoutes.map((runtimeRoute) => runtimeRoute.id),
  };
};
