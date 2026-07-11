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
  "agent.wallet.action.review": {
    operationId: "reviewAgentWalletAction",
    serviceId: "ai-ops-service",
  },
  "backend.production-database.handoff-readiness": {
    operationId: "getProductionDatabaseHandoffReadiness",
    serviceId: "runtime-observability",
  },
  "campaigns.analytics": {
    operationId: "getCampaignAnalytics",
    serviceId: "runtime-observability",
  },
  "campaigns.analytics.ingestion.readiness": {
    operationId: "getCampaignAnalyticsIngestionReadiness",
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
  "campaigns.delivery.readiness": {
    operationId: "getCampaignDeliveryReadiness",
    serviceId: "campaign-service",
  },
  "campaigns.publish.delivery.review": {
    operationId: "getCampaignPublishDeliveryReview",
    serviceId: "campaign-service",
  },
  "campaigns.points.ranking.ledger.runtime": {
    operationId: "getCampaignPointsRankingLedgerRuntime",
    serviceId: "points-ranking-service",
  },
  "campaigns.companion.contract.readiness": {
    operationId: "getCampaignCompanionContractReadiness",
    serviceId: "campaign-service",
  },
  "campaigns.contract.writer.readiness": {
    operationId: "getCampaignContractWriterReadiness",
    serviceId: "campaign-service",
  },
  "campaigns.reward.distribution.handoff.readiness": {
    operationId: "getCampaignRewardDistributionHandoffReadiness",
    serviceId: "campaign-service",
  },
  "campaigns.reward.funding-proof.review": {
    operationId: "getCampaignRewardFundingProofReview",
    serviceId: "campaign-service",
  },
  "campaigns.reward.funding-proof.review.submit": {
    operationId: "submitCampaignRewardFundingProofReview",
    serviceId: "campaign-service",
  },
  "campaigns.contract.transparency": {
    operationId: "getCampaignContractTransparency",
    serviceId: "campaign-service",
  },
  "campaigns.eligibility": {
    operationId: "checkEligibility",
    serviceId: "eligibility-service",
  },
  "campaigns.export.readiness": {
    operationId: "getCampaignExportReadiness",
    serviceId: "export-service",
  },
  "campaigns.export.storage.readiness": {
    operationId: "getCampaignObjectStorageExportReadiness",
    serviceId: "export-service",
  },
  "campaigns.export.artifacts.detail": {
    operationId: "getCampaignExportArtifact",
    serviceId: "export-service",
  },
  "campaigns.export.artifacts.file": {
    operationId: "getCampaignExportArtifactFileHandoff",
    serviceId: "export-service",
  },
  "campaigns.export.artifacts.list": {
    operationId: "listCampaignExportArtifacts",
    serviceId: "export-service",
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
  "campaigns.lifecycle": {
    operationId: "getCampaignLifecycle",
    serviceId: "campaign-service",
  },
  "campaigns.launch.readiness": {
    operationId: "getCampaignLaunchReadiness",
    serviceId: "campaign-service",
  },
  "campaigns.posts.generate": {
    operationId: "generateCampaignPosts",
    serviceId: "ai-ops-service",
  },
  "campaigns.provider.readiness": {
    operationId: "getCampaignProviderReadiness",
    serviceId: "verification-service",
  },
  "campaigns.summary": {
    operationId: "summarizeCampaign",
    serviceId: "runtime-observability",
  },
  "campaigns.tasks.add": {
    operationId: "addCampaignTask",
    serviceId: "task-template-service",
  },
  "campaigns.tasks.generate": {
    operationId: "generateCampaignTasks",
    serviceId: "ai-ops-service",
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
    description: "Internal Agent Skill identifier requesting wallet action readiness.",
    id: "agent.wallet.action.review.body.agentId",
    location: "body",
    name: "agentId",
    required: true,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
  field({
    description: "Operator role responsible for the review path.",
    id: "agent.wallet.action.review.body.operatorRole",
    location: "body",
    name: "operatorRole",
    required: true,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
  field({
    description: "Wallet action intent reviewed without execution.",
    id: "agent.wallet.action.review.body.actionIntent",
    location: "body",
    name: "actionIntent",
    required: true,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
  field({
    description: "Campaign associated with the reviewed wallet action.",
    id: "agent.wallet.action.review.body.campaignId",
    location: "body",
    name: "campaignId",
    required: true,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
  field({
    description: "Task associated with the reviewed wallet action.",
    id: "agent.wallet.action.review.body.taskId",
    location: "body",
    name: "taskId",
    required: true,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
  field({
    description: "Human approval state for the future execution design.",
    id: "agent.wallet.action.review.body.humanApprovalState",
    location: "body",
    name: "humanApprovalState",
    required: false,
    routeId: "agent.wallet.action.review",
    valueType: "string",
  }),
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
    id: "campaigns.lifecycle.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.lifecycle",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.launch.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.launch.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.delivery.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.delivery.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the publish delivery joint review bridge.",
    id: "campaigns.publish.delivery.review.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.publish.delivery.review",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the points ranking ledger runtime review payload.",
    id: "campaigns.points.ranking.ledger.runtime.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.points.ranking.ledger.runtime",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.companion.contract.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.companion.contract.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the contract writer runtime readiness review payload.",
    id: "campaigns.contract.writer.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.contract.writer.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the reward distribution handoff readiness review payload.",
    id: "campaigns.reward.distribution.handoff.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.reward.distribution.handoff.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the project owner funding proof review bridge.",
    id: "campaigns.reward.funding-proof.review.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.reward.funding-proof.review",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter for the project owner funding proof review metadata normalization route.",
    id: "campaigns.reward.funding-proof.review.submit.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.reward.funding-proof.review.submit",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.contract.transparency.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.contract.transparency",
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
    description: "Campaign identifier path parameter.",
    id: "campaigns.tasks.generate.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.tasks.generate",
    valueType: "string",
  }),
  field({
    description: "Campaign objective used to select generated task templates.",
    id: "campaigns.tasks.generate.body.goal",
    location: "body",
    name: "goal",
    required: true,
    routeId: "campaigns.tasks.generate",
    valueType: "string",
  }),
  field({
    description: "Audience segment for generated campaign tasks.",
    id: "campaigns.tasks.generate.body.targetUsers",
    location: "body",
    name: "targetUsers",
    required: true,
    routeId: "campaigns.tasks.generate",
    valueType: "string",
  }),
  field({
    description: "aelf ecosystem product used by local task generation.",
    id: "campaigns.tasks.generate.body.product",
    location: "body",
    name: "product",
    required: true,
    routeId: "campaigns.tasks.generate",
    valueType: "string",
  }),
  field({
    description: "Wallet policy used for generated task compatibility.",
    enumValues: ["ANY", "AA_ONLY", "EOA_ONLY"],
    id: "campaigns.tasks.generate.body.walletPolicy",
    location: "body",
    name: "walletPolicy",
    required: true,
    routeId: "campaigns.tasks.generate",
    valueType: "enum",
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
    description: "Campaign identifier path parameter for the analytics ingestion readiness review route.",
    id: "campaigns.analytics.ingestion.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.analytics.ingestion.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.summary.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.summary",
    valueType: "string",
  }),
  field({
    description: "Summary period used by the local campaign report card.",
    enumValues: ["daily", "weekly"],
    id: "campaigns.summary.query.period",
    location: "query",
    name: "period",
    required: false,
    routeId: "campaigns.summary",
    valueType: "enum",
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
    id: "campaigns.posts.generate.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.posts.generate",
    valueType: "string",
  }),
  field({
    description: "Distribution channel for local campaign post generation.",
    id: "campaigns.posts.generate.body.channel",
    location: "body",
    name: "channel",
    required: true,
    routeId: "campaigns.posts.generate",
    valueType: "string",
  }),
  field({
    description: "Source locale for local campaign post generation.",
    id: "campaigns.posts.generate.body.sourceLocale",
    location: "body",
    name: "sourceLocale",
    required: true,
    routeId: "campaigns.posts.generate",
    valueType: "string",
  }),
  field({
    description: "Target locales requested for local campaign post generation.",
    id: "campaigns.posts.generate.body.targetLocales",
    location: "body",
    name: "targetLocales",
    required: false,
    routeId: "campaigns.posts.generate",
    valueType: "array",
  }),
  field({
    description: "Content keys requested for local campaign post generation.",
    id: "campaigns.posts.generate.body.contentKeys",
    location: "body",
    name: "contentKeys",
    required: true,
    routeId: "campaigns.posts.generate",
    valueType: "array",
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
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.storage.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.storage.readiness",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.artifacts.list.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.artifacts.list",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.artifacts.detail.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.artifacts.detail",
    valueType: "string",
  }),
  field({
    description: "Export artifact identifier path parameter.",
    id: "campaigns.export.artifacts.detail.path.artifactId",
    location: "path",
    name: "artifactId",
    required: true,
    routeId: "campaigns.export.artifacts.detail",
    valueType: "string",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.export.artifacts.file.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.export.artifacts.file",
    valueType: "string",
  }),
  field({
    description: "Export artifact identifier path parameter.",
    id: "campaigns.export.artifacts.file.path.artifactId",
    location: "path",
    name: "artifactId",
    required: true,
    routeId: "campaigns.export.artifacts.file",
    valueType: "string",
  }),
  field({
    description: "Optional local export file handoff format. Defaults to the registered artifact format.",
    enumValues: ["csv", "json"],
    id: "campaigns.export.artifacts.file.query.format",
    location: "query",
    name: "format",
    required: false,
    routeId: "campaigns.export.artifacts.file",
    valueType: "enum",
  }),
  field({
    description: "Optional deterministic review timestamp for local retention validation tests.",
    id: "campaigns.export.artifacts.file.query.now",
    location: "query",
    name: "now",
    required: false,
    routeId: "campaigns.export.artifacts.file",
    valueType: "string",
  }),
  field({
    description: "Optional export batch identifier filter for local artifact audit records.",
    id: "campaigns.export.artifacts.list.query.batchId",
    location: "query",
    name: "batchId",
    required: false,
    routeId: "campaigns.export.artifacts.list",
    valueType: "string",
  }),
  field({
    description: "Optional export artifact identifier filter for local artifact audit records.",
    id: "campaigns.export.artifacts.list.query.artifactId",
    location: "query",
    name: "artifactId",
    required: false,
    routeId: "campaigns.export.artifacts.list",
    valueType: "string",
  }),
  field({
    description: "Optional runtime trace identifier filter for local artifact audit records.",
    id: "campaigns.export.artifacts.list.query.traceId",
    location: "query",
    name: "traceId",
    required: false,
    routeId: "campaigns.export.artifacts.list",
    valueType: "string",
  }),
  field({
    description: "Optional export artifact format filter.",
    enumValues: ["csv", "json"],
    id: "campaigns.export.artifacts.list.query.format",
    location: "query",
    name: "format",
    required: false,
    routeId: "campaigns.export.artifacts.list",
    valueType: "enum",
  }),
  field({
    description: "Optional retention state filter for local artifact audit records.",
    enumValues: ["active", "expired"],
    id: "campaigns.export.artifacts.list.query.retentionState",
    location: "query",
    name: "retentionState",
    required: false,
    routeId: "campaigns.export.artifacts.list",
    valueType: "enum",
  }),
  field({
    description: "Campaign identifier path parameter.",
    id: "campaigns.provider.readiness.path.campaignId",
    location: "path",
    name: "campaignId",
    required: true,
    routeId: "campaigns.provider.readiness",
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
    enumValues: ["none", "eligibility_root"],
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
    notes: "Local normalized session creation writes sanitized records to the wallet session repository; live signature verification, production auth/session storage, signing keys, and secret manager integration are deferred.",
    routeIds: ["wallet.session.create"],
    serviceId: "wallet-session-service",
    state: "implemented_local",
    surfaceId: "wallet-session",
  },
  {
    deferredDependencies: ["auth_session", "contract_writer", "production_database", "scheduler", "worker_queue"],
    label: "Campaign",
    notes: "Local campaign discovery, draft creation, lifecycle operation inspection, launch readiness inspection, delivery readiness inspection, publish delivery joint review bridge inspection, companion contract readiness inspection, contract writer runtime readiness inspection, contract transparency inspection, campaign participant repository/read model metadata, and campaign referral binding read model metadata exist in deterministic and durable-test modes; durable storage, owner auth, production DB migration to the future Campaign DB participant table service and future Campaign DB referral binding table service, scheduler runtime, queue runtime lifecycle handoff, contract writer, wallet SDK, storage write, reward custody, reward distribution, and queue provider adapter activation are deferred.",
    routeIds: [
      "campaigns.list",
      "campaigns.create",
      "campaigns.detail",
      "campaigns.lifecycle",
      "campaigns.launch.readiness",
      "campaigns.delivery.readiness",
      "campaigns.publish.delivery.review",
      "campaigns.companion.contract.readiness",
      "campaigns.contract.writer.readiness",
      "campaigns.reward.distribution.handoff.readiness",
      "campaigns.reward.funding-proof.review",
      "campaigns.reward.funding-proof.review.submit",
      "campaigns.contract.transparency",
    ],
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
    notes: "Local seeded verification and provider readiness inspection exist; provider/indexer handoff, provider evidence, queue runtime, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, Redis broker reference, queue provider SDK binding, scheduler runtime, retry/backoff, worker idempotency store readiness metadata, worker lease store metadata, and dead-letter handling are deferred with pending/manual_review degradation.",
    routeIds: ["tasks.verify", "campaigns.provider.readiness"],
    serviceId: "verification-service",
    state: "implemented_local",
    surfaceId: "verification",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters", "scheduler", "worker_queue"],
    label: "Eligibility",
    notes: "Local eligibility checks read the campaign participant repository/read model and campaign referral binding read model in deterministic or durable-test mode; live wallet verification, live indexer/provider evidence, production DB migration, scheduler runtime, queue runtime, queue provider adapter activation, dead-letter queue, worker idempotency store readiness metadata, and production risk stores are deferred.",
    routeIds: ["campaigns.eligibility"],
    serviceId: "eligibility-service",
    state: "implemented_local",
    surfaceId: "eligibility",
  },
  {
    deferredDependencies: ["production_database", "scheduler", "worker_queue"],
    label: "Analytics",
    notes: "Local analytics summary and analytics ingestion readiness inspection exist; live analytics SDK, warehouse-backed analytics ingestion, scheduler runtime, queue runtime, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, queue provider SDK binding, dead-letter queue, worker idempotency store readiness metadata, and observability exporter are deferred.",
    routeIds: ["campaigns.analytics", "campaigns.analytics.ingestion.readiness"],
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
    notes: "Local export preview, export readiness inspection, object storage export readiness inspection, export artifact audit read metadata, and participant-backed export projection read the campaign participant repository/read model and campaign referral binding read model; no production DB migration, contract transaction, storage upload, signed URL, download, or reward distribution runs are enabled while object storage adapter fulfillment, export preparation scheduler runtime, queue runtime handoff, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, queue provider SDK binding, worker idempotency store readiness metadata, dead-letter queue, observability exporter, and contract root writes are deferred.",
    routeIds: [
      "campaigns.export.preview",
      "campaigns.export.readiness",
      "campaigns.export.storage.readiness",
      "campaigns.export.artifacts.list",
      "campaigns.export.artifacts.detail",
      "campaigns.export.artifacts.file",
    ],
    serviceId: "export-service",
    state: "implemented_local",
    surfaceId: "export",
  },
  {
    deferredDependencies: ["production_database", "contract_writer", "scheduler", "worker_queue"],
    label: "Points / Ranking",
    notes: "Local points ranking ledger runtime review route exposes seeded ledger events, ranking snapshots, and eligibility root preview; production ledger, ranking persistence, reward handoff scheduler runtime, queue runtime, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, queue provider SDK binding, worker idempotency store readiness metadata, dead-letter queue, observability exporter, and optional root publication are deferred.",
    routeIds: ["campaigns.points.ranking.ledger.runtime"],
    serviceId: "points-ranking-service",
    state: "implemented_local",
    surfaceId: "points-ranking",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters"],
    label: "Referral",
    notes: "Local Campaign DB referral binding read model metadata exists for wallet-aware invitee/referrer binding counts, qualification state, and export projection handoff; production referral API routes, production DB migration, live wallet verification, provider risk signals, risk event ingestion, contract transactions, reward custody, and reward distribution are deferred.",
    routeIds: [],
    serviceId: "referral-service",
    state: "production_shaped_deferred",
    surfaceId: "referral",
  },
  {
    deferredDependencies: ["production_database", "provider_adapters", "scheduler", "worker_queue"],
    label: "Risk Scoring",
    notes: "Topology exists; analytics warehouse adapter ingestion, stale review cleanup scheduler runtime, queue runtime, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, queue provider SDK binding, worker idempotency store readiness metadata, worker lease, dead-letter handling, and scoring workers are deferred.",
    routeIds: [],
    serviceId: "risk-scoring-service",
    state: "production_shaped_deferred",
    surfaceId: "risk-scoring",
  },
  {
    deferredDependencies: ["provider_adapters", "scheduler", "worker_queue"],
    label: "AI Ops",
    notes: "Local AI Ops route contracts exist for Agent Skill wallet action readiness, task generation, and post generation; AI provider adapter calls, approval flow execution, scheduler runtime, queue runtime, queue provider adapter activation, BullMQ Redis-compatible package binding, Redis broker readiness metadata, queue provider SDK binding, worker idempotency store readiness metadata, observability exporter, and worker execution are deferred.",
    routeIds: ["agent.wallet.action.review", "campaigns.tasks.generate", "campaigns.posts.generate"],
    serviceId: "ai-ops-service",
    state: "implemented_local",
    surfaceId: "ai-ops",
  },
  {
    deferredDependencies: ["provider_adapters"],
    label: "Service Registry",
    notes: "Local service readiness metadata exists; provider registry resolution, queue provider adapter readiness, BullMQ Redis-compatible package binding readiness, Redis broker readiness metadata, queue provider SDK binding readiness, worker idempotency store readiness metadata, and live adapter activation are deferred.",
    routeIds: ["runtime.services"],
    serviceId: "service-registry",
    state: "implemented_local",
    surfaceId: "service-registry",
  },
  {
    deferredDependencies: ["scheduler", "worker_queue", "sensitive_material_boundary"],
    label: "Runtime Observability",
    notes: "Local health, contracts, production database handoff readiness, route coverage, topology reporting, BullMQ Redis-compatible package binding readiness metadata, Redis broker readiness metadata, queue provider SDK binding readiness metadata, worker idempotency store readiness metadata, worker lease readiness metadata, and observability exporter readiness metadata exist; live broker health-check, live broker connection, worker execution, live telemetry export, metrics sink writes, structured logs, traces, alerts, live database connection, DB client construction, query, write, transaction, migration execution, secret reveal, and retry/dead-letter delivery remain disabled while contract sync handoff depends on deferred scheduler runtime, queue runtime, queue provider adapter readiness, queue provider package binding, queue provider SDK binding, worker idempotency store activation, worker lease store activation, dead-letter queue, observability exporter, and future production database activation.",
    routeIds: ["runtime.health", "runtime.contracts", "backend.production-database.handoff-readiness", "campaigns.summary"],
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
