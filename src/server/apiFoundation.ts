import type {
  ApiRuntimeCapabilityId,
  ApiRuntimeMethod,
  ApiRuntimeSupportMode,
} from "./contracts";
import { apiRuntimeCapabilities } from "./capabilities";
import {
  apiRuntimeRouteById,
  apiRuntimeRoutes,
  type ApiRuntimeRouteId,
} from "./routes";
import {
  backendServiceBoundaries,
  type BackendServiceBoundaryId,
  type BackendTopology,
  backendTopology,
} from "./topology";

export type ApiRequestFieldLocation = "body" | "path" | "query";
export type ApiRequestFieldValueType = "array" | "boolean" | "enum" | "number" | "object" | "record" | "string";
export type BackendSurfaceReadinessState =
  | "implemented_local"
  | "not_yet_implemented"
  | "production_shaped_deferred";

export interface ApiRequestFieldContract {
  description: string;
  enumValues?: string[];
  id: string;
  location: ApiRequestFieldLocation;
  name: string;
  required: boolean;
  routeId: string;
  valueType: ApiRequestFieldValueType;
}

export interface ApiRequestContract {
  fieldIds: string[];
  id: string;
  routeId: string;
}

export interface ApiResponseEnvelopeContract {
  id: string;
  payloadField: string;
  routeIdField: string;
  serviceIdField: string;
  statusField: string;
  supportModeField: string;
  traceIdField: string;
}

export interface ApiErrorEnvelopeContract {
  codeField: string;
  diagnosticsField: string;
  id: string;
  messageField: string;
  routeIdField: string;
  serviceIdField: string;
  statusField: string;
  supportModeField: string;
  traceIdField: string;
}

export interface ApiFoundationRoute {
  apiGroup: string;
  description: string;
  errorEnvelopeId: string;
  method: ApiRuntimeMethod;
  operationId: string;
  path: string;
  productionDependencies: ApiRuntimeCapabilityId[];
  readiness: string;
  requestContractId: string;
  responseEnvelopeId: string;
  routeId: string;
  serviceId: BackendServiceBoundaryId;
  supportMode: ApiRuntimeSupportMode;
}

export interface BackendSurfaceReadiness {
  deferredDependencies: ApiRuntimeCapabilityId[];
  label: string;
  notes: string;
  routeIds: string[];
  serviceId: BackendServiceBoundaryId;
  state: BackendSurfaceReadinessState;
  surfaceId: string;
}

export interface ApiFoundationRegistry {
  errorEnvelopes: ApiErrorEnvelopeContract[];
  requestContracts: ApiRequestContract[];
  requestFields: ApiRequestFieldContract[];
  responseEnvelopes: ApiResponseEnvelopeContract[];
  routes: ApiFoundationRoute[];
  surfaces: BackendSurfaceReadiness[];
}

export type ApiFoundationValidationIssueCode =
  | "DUPLICATE_OPERATION_ID"
  | "MISSING_PATH_FIELD"
  | "UNASSIGNED_SURFACE"
  | "UNKNOWN_CAPABILITY_ID"
  | "UNKNOWN_ERROR_ENVELOPE"
  | "UNKNOWN_REQUEST_CONTRACT"
  | "UNKNOWN_ROUTE_ID"
  | "UNKNOWN_SERVICE_ID"
  | "UNKNOWN_SUCCESS_ENVELOPE";

export interface ApiFoundationValidationIssue {
  code: ApiFoundationValidationIssueCode;
  field: string;
  message: string;
}

export interface ApiFoundationValidationResult {
  issues: ApiFoundationValidationIssue[];
  valid: boolean;
}

export interface ApiFoundationCoverage {
  errorEnvelopeCount: number;
  implementedLocalCount: number;
  notYetImplementedCount: number;
  productionShapedDeferredCount: number;
  requestContractCount: number;
  requestFieldCount: number;
  responseEnvelopeCount: number;
  routeCount: number;
  surfaceCount: number;
  validationIssueCount: number;
}

export interface ApiFoundationReport extends ApiFoundationRegistry {
  coverage: ApiFoundationCoverage;
  generatedAt: string;
  validation: ApiFoundationValidationResult;
}

export interface ApiFoundationReportOptions {
  generatedAt?: string;
  registry?: ApiFoundationRegistry;
}

export interface ApiFoundationRegistryOptions {
  routes?: readonly typeof apiRuntimeRoutes[number][];
  topology?: BackendTopology;
}

type RouteFoundationMetadata = Pick<
  ApiFoundationRoute,
  "operationId" | "serviceId"
>;

const standardResponseEnvelopeId = "api.response.success.v1";
const standardErrorEnvelopeId = "api.response.error.v1";

const routeFoundationMetadata = {
  "campaigns.analytics": {
    operationId: "getCampaignAnalytics",
    serviceId: "runtime-observability",
  },
  "campaigns.create": {
    operationId: "createCampaign",
    serviceId: "campaign-service",
  },
  "campaigns.detail": {
    operationId: "getCampaignDetail",
    serviceId: "campaign-service",
  },
  "campaigns.eligibility": {
    operationId: "checkEligibility",
    serviceId: "eligibility-service",
  },
  "campaigns.export.preview": {
    operationId: "previewCampaignExport",
    serviceId: "export-service",
  },
  "campaigns.i18n.generate": {
    operationId: "generateI18nDraft",
    serviceId: "i18n-content-service",
  },
  "campaigns.list": {
    operationId: "listCampaigns",
    serviceId: "campaign-service",
  },
  "campaigns.tasks.add": {
    operationId: "addCampaignTask",
    serviceId: "task-template-service",
  },
  "runtime.contracts": {
    operationId: "runtimeContracts",
    serviceId: "runtime-observability",
  },
  "runtime.health": {
    operationId: "runtimeHealth",
    serviceId: "runtime-observability",
  },
  "runtime.services": {
    operationId: "runtimeServices",
    serviceId: "service-registry",
  },
  "tasks.verify": {
    operationId: "verifyTask",
    serviceId: "verification-service",
  },
  "wallet.session.create": {
    operationId: "createWalletSession",
    serviceId: "wallet-session-service",
  },
} as const satisfies Record<ApiRuntimeRouteId, RouteFoundationMetadata>;
const routeFoundationMetadataById: Record<string, RouteFoundationMetadata> = routeFoundationMetadata;

const field = (item: ApiRequestFieldContract): ApiRequestFieldContract => item;

const requestFieldContracts = [
  field({
    description: "Optional consumer surface filter for campaign discovery.",
    id: "campaigns.list.query.consumerSurface",
    location: "query",
    name: "consumerSurface",
    required: false,
    routeId: "campaigns.list",
    valueType: "string",
  }),
  field({
    description: "Optional campaign status filter.",
    id: "campaigns.list.query.status",
    location: "query",
    name: "status",
    required: false,
    routeId: "campaigns.list",
    valueType: "string",
  }),
  field({
    description: "Optional wallet address filter for user-facing campaign discovery.",
    id: "campaigns.list.query.walletAddress",
    location: "query",
    name: "walletAddress",
    required: false,
    routeId: "campaigns.list",
    valueType: "string",
  }),
  field({
    description: "Project identifier that owns the local campaign draft.",
    id: "campaigns.create.body.projectId",
    location: "body",
    name: "projectId",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Wallet address for the project owner creating the draft.",
    id: "campaigns.create.body.ownerAddress",
    location: "body",
    name: "ownerAddress",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Campaign goal used by the local campaign draft service.",
    id: "campaigns.create.body.goal",
    location: "body",
    name: "goal",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Reward description shown to campaign participants.",
    id: "campaigns.create.body.rewardDescription",
    location: "body",
    name: "rewardDescription",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Campaign start timestamp.",
    id: "campaigns.create.body.startTime",
    location: "body",
    name: "startTime",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Campaign end timestamp.",
    id: "campaigns.create.body.endTime",
    location: "body",
    name: "endTime",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Human-readable campaign duration.",
    id: "campaigns.create.body.duration",
    location: "body",
    name: "duration",
    required: true,
    routeId: "campaigns.create",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.detail.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.detail",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.tasks.add.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "string",
  }),
  field({
    description: "Task template code used by the campaign builder.",
    id: "campaigns.tasks.add.body.templateCode",
    location: "body",
    name: "templateCode",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "string",
  }),
  field({
    description: "Wallet compatibility policy for this campaign task.",
    enumValues: ["ANY", "AA_ONLY", "EOA_ONLY"],
    id: "campaigns.tasks.add.body.walletCompatibility",
    location: "body",
    name: "walletCompatibility",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "enum",
  }),
  field({
    description: "Task verification category.",
    enumValues: ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"],
    id: "campaigns.tasks.add.body.verificationType",
    location: "body",
    name: "verificationType",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "enum",
  }),
  field({
    description: "Points awarded for the task.",
    id: "campaigns.tasks.add.body.points",
    location: "body",
    name: "points",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "number",
  }),
  field({
    description: "Whether this task is required for eligibility.",
    id: "campaigns.tasks.add.body.required",
    location: "body",
    name: "required",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "boolean",
  }),
  field({
    description: "Local evidence rule object for task verification.",
    id: "campaigns.tasks.add.body.evidenceRule",
    location: "body",
    name: "evidenceRule",
    required: true,
    routeId: "campaigns.tasks.add",
    valueType: "record",
  }),
  field({
    description: "Task identifier path parameter.",
    id: "tasks.verify.path.taskId",
    location: "path",
    name: "taskId",
    required: true,
    routeId: "tasks.verify",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier for the verification request.",
    id: "tasks.verify.body.campaignId",
    location: "body",
    name: "campaignId",
    required: true,
    routeId: "tasks.verify",
    valueType: "string",
  }),
  field({
    description: "Participant wallet address being verified.",
    id: "tasks.verify.body.walletAddress",
    location: "body",
    name: "walletAddress",
    required: true,
    routeId: "tasks.verify",
    valueType: "string",
  }),
  field({
    description: "Normalized wallet account type for verification.",
    enumValues: ["AA", "EOA", "UNKNOWN"],
    id: "tasks.verify.body.accountType",
    location: "body",
    name: "accountType",
    required: true,
    routeId: "tasks.verify",
    valueType: "enum",
  }),
  field({
    description: "Normalized wallet source for verification.",
    enumValues: [
      "PORTKEY_AA",
      "PORTKEY_EOA_APP",
      "PORTKEY_EOA_EXTENSION",
      "NIGHTELF",
      "AGENT_SKILL",
      "OTHER",
    ],
    id: "tasks.verify.body.walletSource",
    location: "body",
    name: "walletSource",
    required: true,
    routeId: "tasks.verify",
    valueType: "enum",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.eligibility.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.eligibility",
    valueType: "string",
  }),
  field({
    description: "Participant wallet address query parameter.",
    id: "campaigns.eligibility.query.walletAddress",
    location: "query",
    name: "walletAddress",
    required: false,
    routeId: "campaigns.eligibility",
    valueType: "string",
  }),
  field({
    description: "Alternative participant address query parameter.",
    id: "campaigns.eligibility.query.address",
    location: "query",
    name: "address",
    required: false,
    routeId: "campaigns.eligibility",
    valueType: "string",
  }),
  field({
    description: "Optional normalized wallet account type.",
    enumValues: ["AA", "EOA", "UNKNOWN"],
    id: "campaigns.eligibility.query.accountType",
    location: "query",
    name: "accountType",
    required: false,
    routeId: "campaigns.eligibility",
    valueType: "enum",
  }),
  field({
    description: "Optional normalized wallet source.",
    enumValues: [
      "PORTKEY_AA",
      "PORTKEY_EOA_APP",
      "PORTKEY_EOA_EXTENSION",
      "NIGHTELF",
      "AGENT_SKILL",
      "OTHER",
    ],
    id: "campaigns.eligibility.query.walletSource",
    location: "query",
    name: "walletSource",
    required: false,
    routeId: "campaigns.eligibility",
    valueType: "enum",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.analytics.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.analytics",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.i18n.generate.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.i18n.generate",
    valueType: "string",
  }),
  field({
    description: "Source locale for local i18n generation.",
    id: "campaigns.i18n.generate.body.sourceLocale",
    location: "body",
    name: "sourceLocale",
    required: false,
    routeId: "campaigns.i18n.generate",
    valueType: "string",
  }),
  field({
    description: "Target locale for local i18n generation.",
    id: "campaigns.i18n.generate.body.targetLocale",
    location: "body",
    name: "targetLocale",
    required: false,
    routeId: "campaigns.i18n.generate",
    valueType: "string",
  }),
  field({
    description: "Content keys requested for local i18n draft generation.",
    id: "campaigns.i18n.generate.body.contentKeys",
    location: "body",
    name: "contentKeys",
    required: false,
    routeId: "campaigns.i18n.generate",
    valueType: "array",
  }),
  field({
    description: "Optional locale query fallback for i18n generation.",
    id: "campaigns.i18n.generate.query.locale",
    location: "query",
    name: "locale",
    required: false,
    routeId: "campaigns.i18n.generate",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.preview.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.preview",
    valueType: "string",
  }),
  field({
    description: "Export format for preview output.",
    enumValues: ["csv", "json"],
    id: "campaigns.export.preview.body.format",
    location: "body",
    name: "format",
    required: false,
    routeId: "campaigns.export.preview",
    valueType: "enum",
  }),
  field({
    description: "Whether risk flags are included in export preview.",
    id: "campaigns.export.preview.body.includeRiskFlags",
    location: "body",
    name: "includeRiskFlags",
    required: false,
    routeId: "campaigns.export.preview",
    valueType: "boolean",
  }),
  field({
    description: "Whether wallet account type columns are included in export preview.",
    id: "campaigns.export.preview.body.includeWalletType",
    location: "body",
    name: "includeWalletType",
    required: false,
    routeId: "campaigns.export.preview",
    valueType: "boolean",
  }),
  field({
    description: "Whether locale preference columns are included in export preview.",
    id: "campaigns.export.preview.body.includeLocalePreference",
    location: "body",
    name: "includeLocalePreference",
    required: false,
    routeId: "campaigns.export.preview",
    valueType: "boolean",
  }),
  field({
    description: "Contract root publication mode for export preview.",
    enumValues: ["none"],
    id: "campaigns.export.preview.body.contractRootMode",
    location: "body",
    name: "contractRootMode",
    required: false,
    routeId: "campaigns.export.preview",
    valueType: "enum",
  }),
  field({
    description: "Wallet address for normalized wallet session creation.",
    id: "wallet.session.create.body.address",
    location: "body",
    name: "address",
    required: true,
    routeId: "wallet.session.create",
    valueType: "string",
  }),
  field({
    description: "Wallet adapter name used to infer local wallet source.",
    id: "wallet.session.create.body.adapterName",
    location: "body",
    name: "adapterName",
    required: true,
    routeId: "wallet.session.create",
    valueType: "string",
  }),
  field({
    description: "aelf chain identifier for the local wallet session.",
    id: "wallet.session.create.body.chainId",
    location: "body",
    name: "chainId",
    required: true,
    routeId: "wallet.session.create",
    valueType: "string",
  }),
  field({
    description: "Network for the local wallet session.",
    enumValues: ["mainnet", "testnet"],
    id: "wallet.session.create.body.network",
    location: "body",
    name: "network",
    required: true,
    routeId: "wallet.session.create",
    valueType: "enum",
  }),
  field({
    description: "Optional wallet signature placeholder; raw signatures are not validated in local review.",
    id: "wallet.session.create.body.signature",
    location: "body",
    name: "signature",
    required: false,
    routeId: "wallet.session.create",
    valueType: "string",
  }),
] as const satisfies readonly ApiRequestFieldContract[];

const responseEnvelopeContracts = [
  {
    id: standardResponseEnvelopeId,
    payloadField: "payload",
    routeIdField: "routeId",
    serviceIdField: "serviceId",
    statusField: "ok",
    supportModeField: "supportMode",
    traceIdField: "traceId",
  },
] as const satisfies readonly ApiResponseEnvelopeContract[];

const errorEnvelopeContracts = [
  {
    codeField: "code",
    diagnosticsField: "diagnostics",
    id: standardErrorEnvelopeId,
    messageField: "message",
    routeIdField: "routeId",
    serviceIdField: "serviceId",
    statusField: "ok",
    supportModeField: "supportMode",
    traceIdField: "traceId",
  },
] as const satisfies readonly ApiErrorEnvelopeContract[];

const backendSurfaceReadiness = [
  {
    deferredDependencies: ["auth_session", "production_database"],
    label: "Wallet Session",
    notes: "Local normalized session creation exists; real signature/session persistence is deferred.",
    routeIds: ["wallet.session.create"],
    serviceId: "wallet-session-service",
    state: "implemented_local",
    surfaceId: "wallet-session",
  },
  {
    deferredDependencies: ["auth_session", "production_database", "scheduler", "worker_queue"],
    label: "Campaign",
    notes: "Local campaign discovery and draft creation exist; durable storage, owner auth, scheduler runtime, queue runtime lifecycle handoff, and queue provider adapter activation are deferred.",
    routeIds: ["campaigns.list", "campaigns.create", "campaigns.detail"],
    serviceId: "campaign-service",
    state: "implemented_local",
    surfaceId: "campaign",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters"],
    label: "Task Template",
    notes: "Local task draft creation exists; provider-backed template catalogs are deferred and disable_provider_task_templates is the fail-closed degradation.",
    routeIds: ["campaigns.tasks.add"],
    serviceId: "task-template-service",
    state: "implemented_local",
    surfaceId: "task-template",
  },
  {
    deferredDependencies: ["provider_adapters", "worker_queue"],
    label: "Verification",
    notes: "Local seeded verification exists; provider/indexer handoff, provider evidence, queue runtime, queue provider adapter activation, scheduler runtime, retry/backoff, idempotency store, worker lease store metadata, and dead-letter handling are deferred with pending/manual_review degradation.",
    routeIds: ["tasks.verify"],
    serviceId: "verification-service",
    state: "implemented_local",
    surfaceId: "verification",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters", "scheduler", "worker_queue"],
    label: "Eligibility",
    notes: "Local eligibility checks exist; live indexer/provider evidence stays pending or manual review while scheduler runtime, queue runtime, queue provider adapter activation, dead-letter queue, idempotency store, and risk stores are deferred.",
    routeIds: ["campaigns.eligibility"],
    serviceId: "eligibility-service",
    state: "implemented_local",
    surfaceId: "eligibility",
  },
  {
    deferredDependencies: ["production_database", "scheduler", "worker_queue"],
    label: "Analytics",
    notes: "Local analytics summary exists; warehouse-backed analytics ingestion, scheduler runtime, queue runtime, queue provider adapter activation, dead-letter queue, idempotency store, and observability exporter are deferred.",
    routeIds: ["campaigns.analytics"],
    serviceId: "runtime-observability",
    state: "implemented_local",
    surfaceId: "analytics",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters"],
    label: "i18n Content",
    notes: "Local i18n draft generation exists; provider generation and content DB are deferred.",
    routeIds: ["campaigns.i18n.generate"],
    serviceId: "i18n-content-service",
    state: "implemented_local",
    surfaceId: "i18n-content",
  },
  {
    deferredDependencies: ["object_storage_export", "contract_writer", "scheduler", "worker_queue"],
    label: "Export",
    notes: "Local export preview exists; object storage adapter fulfillment, export preparation scheduler runtime, queue runtime handoff, queue provider adapter activation, idempotency store, dead-letter queue, observability exporter, and contract root writes are deferred.",
    routeIds: ["campaigns.export.preview"],
    serviceId: "export-service",
    state: "implemented_local",
    surfaceId: "export",
  },
  {
    deferredDependencies: ["production_database", "contract_writer", "scheduler", "worker_queue"],
    label: "Points / Ranking",
    notes: "Topology exists; production ledger, ranking persistence, reward handoff scheduler runtime, queue runtime, queue provider adapter activation, idempotency store, dead-letter queue, observability exporter, and optional root publication are deferred.",
    routeIds: [],
    serviceId: "points-ranking-service",
    state: "production_shaped_deferred",
    surfaceId: "points-ranking",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters"],
    label: "Referral",
    notes: "Topology exists; wallet-aware referral persistence and risk signals are deferred.",
    routeIds: [],
    serviceId: "referral-service",
    state: "production_shaped_deferred",
    surfaceId: "referral",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters", "scheduler", "worker_queue"],
    label: "Risk Scoring",
    notes: "Topology exists; analytics warehouse adapter ingestion, stale review cleanup scheduler runtime, queue runtime, queue provider adapter activation, worker lease, dead-letter handling, and scoring workers are deferred.",
    routeIds: [],
    serviceId: "risk-scoring-service",
    state: "production_shaped_deferred",
    surfaceId: "risk-scoring",
  },
  {
    deferredDependencies: ["provider_adapters", "scheduler", "worker_queue"],
    label: "AI Ops",
    notes: "Topology exists; AI provider adapter calls, approval flow, scheduler runtime, queue runtime, queue provider adapter activation, observability exporter, and worker execution are deferred.",
    routeIds: [],
    serviceId: "ai-ops-service",
    state: "production_shaped_deferred",
    surfaceId: "ai-ops",
  },
  {
    deferredDependencies: ["provider_adapters"],
    label: "Service Registry",
    notes: "Local service readiness metadata exists; provider registry resolution, queue provider adapter readiness, and live adapter activation are deferred.",
    routeIds: ["runtime.services"],
    serviceId: "service-registry",
    state: "implemented_local",
    surfaceId: "service-registry",
  },
  {
    deferredDependencies: ["scheduler", "worker_queue"],
    label: "Runtime Observability",
    notes: "Local health, contracts, route coverage, topology reporting, and worker lease readiness metadata exist; contract sync handoff depends on deferred scheduler runtime, queue runtime, queue provider adapter readiness, worker lease store activation, idempotency store, dead-letter queue, and observability exporter.",
    routeIds: ["runtime.health", "runtime.contracts"],
    serviceId: "runtime-observability",
    state: "implemented_local",
    surfaceId: "runtime-observability",
  },
] as const satisfies readonly BackendSurfaceReadiness[];

const createIssue = (
  code: ApiFoundationValidationIssueCode,
  fieldName: string,
  message: string,
): ApiFoundationValidationIssue => ({ code, field: fieldName, message });

const createIdSet = <TItem extends { id: string }>(items: readonly TItem[]) =>
  new Set(items.map((item) => item.id));

const extractPathParams = (path: string) =>
  [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);

const createRequestContracts = (
  routes: readonly typeof apiRuntimeRoutes[number][],
  fields: readonly ApiRequestFieldContract[],
): ApiRequestContract[] => {
  const fieldsByRoute = new Map<string, string[]>();

  for (const fieldContract of fields) {
    fieldsByRoute.set(fieldContract.routeId, [
      ...(fieldsByRoute.get(fieldContract.routeId) ?? []),
      fieldContract.id,
    ]);
  }

  return routes.map((route) => ({
    fieldIds: fieldsByRoute.get(route.id) ?? [],
    id: `${route.id}.request`,
    routeId: route.id,
  }));
};

const createFoundationRoutes = (
  routes: readonly typeof apiRuntimeRoutes[number][],
): ApiFoundationRoute[] =>
  routes.map((route) => {
    const metadata = routeFoundationMetadataById[route.id];

    return {
      apiGroup: route.apiGroup,
      description: route.summary["en-US"],
      errorEnvelopeId: standardErrorEnvelopeId,
      method: route.method,
      operationId: metadata.operationId,
      path: route.path,
      productionDependencies: [...route.productionDependencies],
      readiness: route.readiness,
      requestContractId: `${route.id}.request`,
      responseEnvelopeId: standardResponseEnvelopeId,
      routeId: route.id,
      serviceId: metadata.serviceId,
      supportMode: route.supportMode,
    };
  });

export const createApiFoundationRegistry = ({
  routes = apiRuntimeRoutes,
}: ApiFoundationRegistryOptions = {}): ApiFoundationRegistry => ({
  errorEnvelopes: [...errorEnvelopeContracts],
  requestContracts: createRequestContracts(routes, requestFieldContracts),
  requestFields: [...requestFieldContracts],
  responseEnvelopes: [...responseEnvelopeContracts],
  routes: createFoundationRoutes(routes),
  surfaces: [...backendSurfaceReadiness],
});

export const validateApiFoundationRegistry = (
  registry: ApiFoundationRegistry = createApiFoundationRegistry(),
  { topology = backendTopology }: { topology?: BackendTopology } = {},
): ApiFoundationValidationResult => {
  const issues: ApiFoundationValidationIssue[] = [];
  const knownRouteIds = createIdSet(apiRuntimeRoutes);
  const knownServiceIds = createIdSet(topology.services);
  const capabilityIds = createIdSet(apiRuntimeCapabilities);
  const requestContractIds = createIdSet(registry.requestContracts);
  const responseEnvelopeIds = createIdSet(registry.responseEnvelopes);
  const errorEnvelopeIds = createIdSet(registry.errorEnvelopes);
  const fieldIds = createIdSet(registry.requestFields);
  const requestFieldsByRoute = new Map<string, ApiRequestFieldContract[]>();
  const operationIds = new Set<string>();
  const duplicateOperationIds = new Set<string>();

  for (const requestField of registry.requestFields) {
    if (!knownRouteIds.has(requestField.routeId)) {
      issues.push(
        createIssue(
          "UNKNOWN_ROUTE_ID",
          `requestFields.${requestField.id}.routeId`,
          "Request field references a route that is not defined by the runtime route catalog.",
        ),
      );
    }

    if (requestField.required && requestField.description.trim().length === 0) {
      issues.push(
        createIssue(
          "UNKNOWN_REQUEST_CONTRACT",
          `requestFields.${requestField.id}.description`,
          "Required request field must include a readable description.",
        ),
      );
    }

    if (requestField.valueType === "enum" && (!requestField.enumValues || requestField.enumValues.length === 0)) {
      issues.push(
        createIssue(
          "UNKNOWN_REQUEST_CONTRACT",
          `requestFields.${requestField.id}.enumValues`,
          "Enum request field must define allowed values.",
        ),
      );
    }

    requestFieldsByRoute.set(requestField.routeId, [
      ...(requestFieldsByRoute.get(requestField.routeId) ?? []),
      requestField,
    ]);
  }

  for (const requestContract of registry.requestContracts) {
    if (!knownRouteIds.has(requestContract.routeId)) {
      issues.push(
        createIssue(
          "UNKNOWN_ROUTE_ID",
          `requestContracts.${requestContract.id}.routeId`,
          "Request contract references a route that is not defined by the runtime route catalog.",
        ),
      );
    }

    for (const fieldId of requestContract.fieldIds) {
      if (!fieldIds.has(fieldId)) {
        issues.push(
          createIssue(
            "UNKNOWN_REQUEST_CONTRACT",
            `requestContracts.${requestContract.id}.fieldIds`,
            "Request contract references an undefined request field.",
          ),
        );
      }
    }
  }

  for (const route of registry.routes) {
    if (!knownRouteIds.has(route.routeId)) {
      issues.push(
        createIssue(
          "UNKNOWN_ROUTE_ID",
          `routes.${route.routeId}.routeId`,
          "Foundation route references a route that is not defined by the runtime route catalog.",
        ),
      );
    }

    if (!knownServiceIds.has(route.serviceId)) {
      issues.push(
        createIssue(
          "UNKNOWN_SERVICE_ID",
          `routes.${route.routeId}.serviceId`,
          "Foundation route references an undefined backend service boundary.",
        ),
      );
    }

    if (!requestContractIds.has(route.requestContractId)) {
      issues.push(
        createIssue(
          "UNKNOWN_REQUEST_CONTRACT",
          `routes.${route.routeId}.requestContractId`,
          "Foundation route references an undefined request contract.",
        ),
      );
    }

    if (!responseEnvelopeIds.has(route.responseEnvelopeId)) {
      issues.push(
        createIssue(
          "UNKNOWN_SUCCESS_ENVELOPE",
          `routes.${route.routeId}.responseEnvelopeId`,
          "Foundation route references an undefined success envelope contract.",
        ),
      );
    }

    if (!errorEnvelopeIds.has(route.errorEnvelopeId)) {
      issues.push(
        createIssue(
          "UNKNOWN_ERROR_ENVELOPE",
          `routes.${route.routeId}.errorEnvelopeId`,
          "Foundation route references an undefined error envelope contract.",
        ),
      );
    }

    for (const capabilityId of route.productionDependencies) {
      if (!capabilityIds.has(capabilityId)) {
        issues.push(
          createIssue(
            "UNKNOWN_CAPABILITY_ID",
            `routes.${route.routeId}.productionDependencies`,
            "Foundation route references an undefined runtime capability.",
          ),
        );
      }
    }

    if (operationIds.has(route.operationId)) {
      duplicateOperationIds.add(route.operationId);
    }
    operationIds.add(route.operationId);

    const runtimeRoute = apiRuntimeRouteById[route.routeId as ApiRuntimeRouteId];
    if (runtimeRoute) {
      const pathFields = requestFieldsByRoute.get(route.routeId) ?? [];
      for (const pathParam of extractPathParams(runtimeRoute.path)) {
        const hasField = pathFields.some((requestField) =>
          requestField.location === "path" && requestField.name === pathParam && requestField.required
        );

        if (!hasField) {
          issues.push(
            createIssue(
              "MISSING_PATH_FIELD",
              `routes.${route.routeId}.path`,
              `Route path parameter "${pathParam}" must have a required path request field contract.`,
            ),
          );
        }
      }
    }
  }

  for (const duplicateOperationId of duplicateOperationIds) {
    issues.push(
      createIssue(
        "DUPLICATE_OPERATION_ID",
        `routes.operationId.${duplicateOperationId}`,
        "Foundation route operation IDs must be unique.",
      ),
    );
  }

  for (const service of backendServiceBoundaries) {
    const matchingSurfaces = registry.surfaces.filter((surface) => surface.serviceId === service.id);
    if (service.productionRequired && matchingSurfaces.length === 0) {
      issues.push(
        createIssue(
          "UNASSIGNED_SURFACE",
          `surfaces.${service.id}`,
          "Every production-required backend service must have API foundation surface readiness.",
        ),
      );
    }
  }

  for (const surface of registry.surfaces) {
    if (!knownServiceIds.has(surface.serviceId)) {
      issues.push(
        createIssue(
          "UNKNOWN_SERVICE_ID",
          `surfaces.${surface.surfaceId}.serviceId`,
          "Backend surface references an undefined backend service boundary.",
        ),
      );
    }

    for (const routeId of surface.routeIds) {
      if (!knownRouteIds.has(routeId)) {
        issues.push(
          createIssue(
            "UNKNOWN_ROUTE_ID",
            `surfaces.${surface.surfaceId}.routeIds`,
            "Backend surface references a route that is not defined by the runtime route catalog.",
          ),
        );
      }
    }

    for (const capabilityId of surface.deferredDependencies) {
      if (!capabilityIds.has(capabilityId)) {
        issues.push(
          createIssue(
            "UNKNOWN_CAPABILITY_ID",
            `surfaces.${surface.surfaceId}.deferredDependencies`,
            "Backend surface references an undefined runtime capability.",
          ),
        );
      }
    }

    if (surface.state === "implemented_local" && surface.routeIds.length === 0) {
      issues.push(
        createIssue(
          "UNASSIGNED_SURFACE",
          `surfaces.${surface.surfaceId}.routeIds`,
          "Implemented-local backend surfaces must cite at least one current local route.",
        ),
      );
    }
  }

  return {
    issues,
    valid: issues.length === 0,
  };
};

const countSurfacesByState = (
  surfaces: readonly BackendSurfaceReadiness[],
  state: BackendSurfaceReadinessState,
) => surfaces.filter((surface) => surface.state === state).length;

export const createApiFoundationReport = ({
  generatedAt = new Date(0).toISOString(),
  registry = createApiFoundationRegistry(),
}: ApiFoundationReportOptions = {}): ApiFoundationReport => {
  const validation = validateApiFoundationRegistry(registry);

  return {
    ...registry,
    coverage: {
      errorEnvelopeCount: registry.errorEnvelopes.length,
      implementedLocalCount: countSurfacesByState(registry.surfaces, "implemented_local"),
      notYetImplementedCount: countSurfacesByState(registry.surfaces, "not_yet_implemented"),
      productionShapedDeferredCount: countSurfacesByState(registry.surfaces, "production_shaped_deferred"),
      requestContractCount: registry.requestContracts.length,
      requestFieldCount: registry.requestFields.length,
      responseEnvelopeCount: registry.responseEnvelopes.length,
      routeCount: registry.routes.length,
      surfaceCount: registry.surfaces.length,
      validationIssueCount: validation.issues.length,
    },
    generatedAt,
    validation,
  };
};
