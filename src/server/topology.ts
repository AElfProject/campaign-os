import type { ApiRuntimeCapabilityId } from "./contracts";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";

export type BackendTopologyReadiness = "ready" | "local_only" | "review_required" | "deferred" | "disabled";
export type BackendDomainArea =
  | "ai_ops"
  | "analytics"
  | "campaign"
  | "content"
  | "export"
  | "operations"
  | "points"
  | "referral"
  | "risk"
  | "runtime"
  | "task"
  | "verification"
  | "wallet";
export type BackendDataStoreMode = "seeded" | "local_json" | "memory" | "deferred" | "external";
export type BackendProductionStoreMode = "relational_db" | "object_storage" | "indexer" | "warehouse";
export type BackendAdapterCategory =
  | "wallet_auth"
  | "indexer"
  | "dapp_api"
  | "social_api"
  | "manual_review"
  | "ai_provider"
  | "analytics"
  | "storage"
  | "contract_reader"
  | "contract_writer"
  | "analytics"
  | "internal";
export type BackendAdapterStatus = "local_stub" | "deferred" | "disabled" | "required_for_production";
export type BackendAdapterConfigurationMode = "none" | "env" | "secret_manager" | "service_registry";
export type BackendDeploymentImplementation = "vite-node-local" | "source-topology-only" | "deferred";
export type BackendDeploymentRuntimeStatus = "local" | "deferred" | "blocked";
export type BackendProductionTarget =
  | "api_service"
  | "contract_ops_service"
  | "scheduled_runner"
  | "static_web_app"
  | "worker_service";

export type BackendServiceBoundaryId =
  | "campaign-service"
  | "task-template-service"
  | "wallet-session-service"
  | "verification-service"
  | "points-ranking-service"
  | "referral-service"
  | "eligibility-service"
  | "export-service"
  | "risk-scoring-service"
  | "i18n-content-service"
  | "ai-ops-service"
  | "service-registry"
  | "runtime-observability";
export type BackendDataStoreId =
  | "campaign-db"
  | "wallet-session-db"
  | "task-evidence-db"
  | "i18n-content-db"
  | "risk-event-db"
  | "points-ledger"
  | "export-artifact-store"
  | "analytics-warehouse"
  | "contract-index";
export type BackendAdapterGroupId =
  | "wallet-auth-session"
  | "aefinder-aelfscan-indexers"
  | "dapp-api-adapters"
  | "social-api-adapters"
  | "manual-review"
  | "ai-provider-adapters"
  | "analytics-warehouse-adapter"
  | "object-storage-adapter"
  | "contract-reader-adapter"
  | "contract-writer-adapter";
export type BackendRuntimeProfileId = "local-review" | "staging-ready" | "production-required";
export type BackendDeploymentUnitId =
  | "web-app"
  | "api-runtime"
  | "worker-runtime"
  | "scheduler-runtime"
  | "contract-ops-runtime";

export interface BackendServiceBoundary {
  adapterGroups: BackendAdapterGroupId[];
  dataStores: BackendDataStoreId[];
  deploymentUnit: BackendDeploymentUnitId;
  description: string;
  domainArea: BackendDomainArea;
  futureRouteGroups: string[];
  id: BackendServiceBoundaryId;
  name: string;
  productionRequired: boolean;
  readiness: BackendTopologyReadiness;
  risks: string[];
  routeIds: string[];
  runtimeProfiles: BackendRuntimeProfileId[];
}

export interface BackendDataStore {
  containsSensitiveData: boolean;
  currentMode: BackendDataStoreMode;
  id: BackendDataStoreId;
  migrationRequired: boolean;
  name: string;
  ownerServiceId: BackendServiceBoundaryId;
  productionMode: BackendProductionStoreMode;
  records: string[];
  retentionRisk: string;
}

export interface BackendAdapterGroup {
  category: BackendAdapterCategory;
  configurationMode: BackendAdapterConfigurationMode;
  failureMode: string;
  forbiddenInLocalReview: boolean;
  id: BackendAdapterGroupId;
  name: string;
  serviceIds: BackendServiceBoundaryId[];
  status: BackendAdapterStatus;
}

export interface BackendRuntimeProfile {
  allowedSupportModes: string[];
  deferredCapabilities: ApiRuntimeCapabilityId[];
  deploymentUnits: BackendDeploymentUnitId[];
  description: string;
  disabledCapabilities: ApiRuntimeCapabilityId[];
  externalNetworkAllowed: boolean;
  id: BackendRuntimeProfileId;
  label: string;
  requiredCapabilities: ApiRuntimeCapabilityId[];
  secretRequired: boolean;
}

export interface BackendDeploymentUnit {
  attachPointPath?: string;
  currentImplementation: BackendDeploymentImplementation;
  currentStatus?: BackendDeploymentRuntimeStatus;
  entrypoint: string;
  id: BackendDeploymentUnitId;
  localReviewRuntimePolicy?: {
    cloudSchedulerPackageInstalled: false;
    cronPackageInstalled: false;
    liveCronExecutionEnabled: false;
    liveSchedulerExecutionEnabled: false;
  };
  name: string;
  productionRequiredBlockerIds?: string[];
  productionTarget: BackendProductionTarget;
  runtimeProfileIds: BackendRuntimeProfileId[];
  serviceIds: BackendServiceBoundaryId[];
}

export interface BackendTopology {
  adapterGroups: BackendAdapterGroup[];
  dataStores: BackendDataStore[];
  deploymentUnits: BackendDeploymentUnit[];
  runtimeProfiles: BackendRuntimeProfile[];
  services: BackendServiceBoundary[];
}

export type BackendTopologyIssueCode =
  | "LOCAL_REVIEW_FORBIDDEN_ADAPTER_ENABLED"
  | "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK"
  | "LOCAL_REVIEW_REQUIRES_SECRET"
  | "PRODUCTION_SERVICE_WITHOUT_DEPLOYMENT"
  | "UNKNOWN_ADAPTER_GROUP_ID"
  | "UNKNOWN_DATA_STORE_ID"
  | "UNKNOWN_DEPLOYMENT_UNIT"
  | "UNKNOWN_ROUTE_ID"
  | "UNKNOWN_RUNTIME_PROFILE"
  | "UNKNOWN_SERVICE_ID";

export interface BackendTopologyValidationIssue {
  code: BackendTopologyIssueCode;
  field: string;
  message: string;
}

export interface BackendTopologyValidationResult {
  issues: BackendTopologyValidationIssue[];
  valid: boolean;
}

export interface BackendTopologyCoverage {
  adapterGroupCount: number;
  dataStoreCount: number;
  deploymentUnitCount: number;
  invalidReferenceCount: number;
  runtimeProfileCount: number;
  serviceCount: number;
  unassignedRouteIds: string[];
}

export interface BackendRuntimeProfileReadiness {
  disabledCapabilityCount: number;
  externalNetworkAllowed: boolean;
  requiredCapabilityCount: number;
  secretRequired: boolean;
}

export interface BackendTopologyReport extends BackendTopology {
  coverage: BackendTopologyCoverage;
  generatedAt: string;
  profileReadiness: Record<BackendRuntimeProfileId, BackendRuntimeProfileReadiness>;
  validation: BackendTopologyValidationResult;
}

export interface BackendTopologyReportOptions {
  generatedAt?: string;
  knownRouteIds?: readonly string[];
  topology?: BackendTopology;
}

const productionProfiles: BackendRuntimeProfileId[] = ["local-review", "staging-ready", "production-required"];
const productionRequiredProfiles: BackendRuntimeProfileId[] = ["staging-ready", "production-required"];

const service = (item: BackendServiceBoundary): BackendServiceBoundary => item;
const dataStore = (item: BackendDataStore): BackendDataStore => item;
const adapterGroup = (item: BackendAdapterGroup): BackendAdapterGroup => item;
const runtimeProfile = (item: BackendRuntimeProfile): BackendRuntimeProfile => item;
const deploymentUnit = (item: BackendDeploymentUnit): BackendDeploymentUnit => item;
const topologySafeQueueProviderBlockerId = (id: string): string =>
  id === "queue-provider-credentials" ? "queue-provider-auth" : id;

export const backendServiceBoundaries = [
  service({
    adapterGroups: [],
    dataStores: ["campaign-db"],
    deploymentUnit: "api-runtime",
    description: "Campaign lifecycle, publish checklist, wallet policy, locale, and contract mode boundary.",
    domainArea: "campaign",
    futureRouteGroups: ["campaigns", "publish-checks"],
    id: "campaign-service",
    name: "Campaign Service",
    productionRequired: true,
    readiness: "local_only",
    risks: [
      "Production persistence and auth/session are deferred.",
      "Campaign lifecycle transitions require the deferred scheduler runtime, worker queue, and worker lease before production.",
    ],
    routeIds: ["campaigns.list", "campaigns.create", "campaigns.detail"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["dapp-api-adapters"],
    dataStores: ["campaign-db"],
    deploymentUnit: "api-runtime",
    description: "Task template and wallet compatibility boundary for campaign builders.",
    domainArea: "task",
    futureRouteGroups: ["task-templates", "task-builder"],
    id: "task-template-service",
    name: "Task Template Service",
    productionRequired: true,
    readiness: "local_only",
    risks: ["Live dApp template providers are deferred."],
    routeIds: ["campaigns.tasks.add"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["wallet-auth-session"],
    dataStores: ["wallet-session-db"],
    deploymentUnit: "api-runtime",
    description: "Normalized AA/EOA wallet session boundary.",
    domainArea: "wallet",
    futureRouteGroups: ["wallet-session", "wallet-signature"],
    id: "wallet-session-service",
    name: "Wallet Session Service",
    productionRequired: true,
    readiness: "local_only",
    risks: ["Auth/session wallet proof is local-only; live wallet verification and RBAC are deferred."],
    routeIds: ["wallet.session.create"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: [
      "wallet-auth-session",
      "aefinder-aelfscan-indexers",
      "dapp-api-adapters",
      "social-api-adapters",
      "manual-review",
    ],
    dataStores: ["task-evidence-db"],
    deploymentUnit: "worker-runtime",
    description: "Task evidence verification boundary across chain, dApp, social, and manual sources.",
    domainArea: "verification",
    futureRouteGroups: ["task-verification", "evidence-ingestion"],
    id: "verification-service",
    name: "Verification Service",
    productionRequired: true,
    readiness: "review_required",
    risks: [
      "Live providers, worker queue, scheduler runtime, retry/backoff, idempotency store, and worker lease are deferred.",
      "Queue runtime activation requires provider selection, dead-letter handling, lease, idempotency, and observability before production verification workers.",
      "Provider/indexer handoff degrades to pending or manual review while live calls are deferred.",
    ],
    routeIds: ["tasks.verify"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["contract-reader-adapter"],
    dataStores: ["points-ledger", "analytics-warehouse"],
    deploymentUnit: "api-runtime",
    description: "Points ledger and leaderboard boundary for off-chain MVP and future transparent roots.",
    domainArea: "points",
    futureRouteGroups: ["points", "ranking"],
    id: "points-ranking-service",
    name: "Points / Ranking Service",
    productionRequired: true,
    readiness: "deferred",
    risks: [
      "Production ledger and optional contract transparency are deferred.",
      "Reward distribution handoff requires the deferred worker queue, idempotency store, observability exporter, and contract writer before production.",
    ],
    routeIds: [],
    runtimeProfiles: productionRequiredProfiles,
  }),
  service({
    adapterGroups: [],
    dataStores: ["campaign-db", "risk-event-db"],
    deploymentUnit: "api-runtime",
    description: "Wallet-aware referral relationship and self-referral risk boundary.",
    domainArea: "referral",
    futureRouteGroups: ["referrals"],
    id: "referral-service",
    name: "Referral Service",
    productionRequired: true,
    readiness: "deferred",
    risks: ["Referral persistence and risk signals are deferred."],
    routeIds: [],
    runtimeProfiles: productionRequiredProfiles,
  }),
  service({
    adapterGroups: ["aefinder-aelfscan-indexers", "manual-review"],
    dataStores: ["campaign-db", "task-evidence-db", "risk-event-db"],
    deploymentUnit: "api-runtime",
    description: "Wallet-aware eligibility decision boundary.",
    domainArea: "verification",
    futureRouteGroups: ["eligibility"],
    id: "eligibility-service",
    name: "Eligibility Service",
    productionRequired: true,
    readiness: "local_only",
    risks: [
      "Live evidence and risk stores are deferred; unavailable provider evidence stays pending or manual review.",
      "Eligibility refresh handoff requires the deferred queue runtime, scheduler runtime, idempotency store, dead-letter queue, and provider handoff before production.",
    ],
    routeIds: ["campaigns.eligibility"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["object-storage-adapter", "contract-writer-adapter"],
    dataStores: ["export-artifact-store"],
    deploymentUnit: "api-runtime",
    description: "Winner export, artifact storage, and optional root publication boundary.",
    domainArea: "export",
    futureRouteGroups: ["exports"],
    id: "export-service",
    name: "Export Service",
    productionRequired: true,
    readiness: "review_required",
    risks: [
      "Storage-backed exports and contract writes are disabled/deferred.",
      "Export preparation handoff requires the deferred queue runtime, idempotency store, dead-letter queue, and observability exporter before production.",
    ],
    routeIds: ["campaigns.export.preview"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["analytics-warehouse-adapter"],
    dataStores: ["risk-event-db", "analytics-warehouse"],
    deploymentUnit: "worker-runtime",
    description: "Risk scoring and suspicious cluster analysis boundary.",
    domainArea: "risk",
    futureRouteGroups: ["risk-scoring"],
    id: "risk-scoring-service",
    name: "Risk Scoring Service",
    productionRequired: true,
    readiness: "deferred",
    risks: [
      "Risk event ingestion and warehouse integrations are deferred.",
      "Risk cleanup and scoring handoffs require the deferred scheduler runtime, queue runtime, worker lease, idempotency store, and dead-letter handling before production.",
    ],
    routeIds: [],
    runtimeProfiles: productionRequiredProfiles,
  }),
  service({
    adapterGroups: ["ai-provider-adapters"],
    dataStores: ["i18n-content-db"],
    deploymentUnit: "api-runtime",
    description: "Campaign copy, locale drafts, human review, and immutable content revision boundary.",
    domainArea: "content",
    futureRouteGroups: ["i18n-content"],
    id: "i18n-content-service",
    name: "i18n Content Service",
    productionRequired: true,
    readiness: "local_only",
    risks: ["AI generation provider and content DB are deferred."],
    routeIds: ["campaigns.i18n.generate"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: ["ai-provider-adapters"],
    dataStores: ["analytics-warehouse"],
    deploymentUnit: "worker-runtime",
    description: "AI campaign planning, content packs, optimization reports, and operator summaries.",
    domainArea: "ai_ops",
    futureRouteGroups: ["ai-ops"],
    id: "ai-ops-service",
    name: "AI Ops Service",
    productionRequired: true,
    readiness: "deferred",
    risks: [
      "AI provider, approval flow, scheduler runtime, queue runtime, observability, and worker execution are deferred.",
    ],
    routeIds: [],
    runtimeProfiles: productionRequiredProfiles,
  }),
  service({
    adapterGroups: [],
    dataStores: [],
    deploymentUnit: "api-runtime",
    description: "External service readiness registry and graceful degradation metadata.",
    domainArea: "operations",
    futureRouteGroups: ["service-registry"],
    id: "service-registry",
    name: "Service Registry",
    productionRequired: true,
    readiness: "local_only",
    risks: ["Production service registry is metadata-only in local review; provider registry activation remains blocked."],
    routeIds: ["runtime.services"],
    runtimeProfiles: productionProfiles,
  }),
  service({
    adapterGroups: [],
    dataStores: [],
    deploymentUnit: "api-runtime",
    description: "Runtime health, route contracts, safety flags, and topology observability.",
    domainArea: "runtime",
    futureRouteGroups: ["runtime"],
    id: "runtime-observability",
    name: "Runtime Observability",
    productionRequired: true,
    readiness: "ready",
    risks: [
      "Production observability backend is not selected yet.",
      "Analytics ingestion and contract sync handoffs require deferred queue runtime, scheduler runtime, idempotency store, dead-letter queue, and observability exporter before production.",
    ],
    routeIds: ["runtime.health", "runtime.contracts", "campaigns.analytics"],
    runtimeProfiles: productionProfiles,
  }),
] as const satisfies readonly BackendServiceBoundary[];

export const backendDataStores = [
  dataStore({
    containsSensitiveData: false,
    currentMode: "seeded",
    id: "campaign-db",
    migrationRequired: true,
    name: "Campaign DB",
    ownerServiceId: "campaign-service",
    productionMode: "relational_db",
    records: ["campaigns", "campaign_tasks", "campaign_publish_checks", "referral_rules"],
    retentionRisk: "Campaign configuration and task records need explicit retention before production.",
  }),
  dataStore({
    containsSensitiveData: true,
    currentMode: "memory",
    id: "wallet-session-db",
    migrationRequired: true,
    name: "Wallet Session DB",
    ownerServiceId: "wallet-session-service",
    productionMode: "relational_db",
    records: ["wallet_sessions", "account_type_evidence", "session_audit"],
    retentionRisk: "Wallet session metadata needs privacy and expiry rules before production.",
  }),
  dataStore({
    containsSensitiveData: true,
    currentMode: "deferred",
    id: "task-evidence-db",
    migrationRequired: true,
    name: "Task Evidence DB",
    ownerServiceId: "verification-service",
    productionMode: "relational_db",
    records: ["verification_attempts", "task_evidence", "manual_review_queue"],
    retentionRisk: "Task evidence can contain wallet and provider metadata.",
  }),
  dataStore({
    containsSensitiveData: false,
    currentMode: "seeded",
    id: "i18n-content-db",
    migrationRequired: true,
    name: "i18n Content DB",
    ownerServiceId: "i18n-content-service",
    productionMode: "relational_db",
    records: ["localized_campaign_copy", "ai_drafts", "reviewed_revisions"],
    retentionRisk: "Draft and approved copy need immutable revision rules.",
  }),
  dataStore({
    containsSensitiveData: true,
    currentMode: "deferred",
    id: "risk-event-db",
    migrationRequired: true,
    name: "Risk Event DB",
    ownerServiceId: "risk-scoring-service",
    productionMode: "relational_db",
    records: ["risk_events", "referral_clusters", "manual_flags"],
    retentionRisk: "Risk flags need review, appeal, and retention policy before production.",
  }),
  dataStore({
    containsSensitiveData: false,
    currentMode: "deferred",
    id: "points-ledger",
    migrationRequired: true,
    name: "Points Ledger",
    ownerServiceId: "points-ranking-service",
    productionMode: "relational_db",
    records: ["points_events", "ranking_snapshots", "eligibility_roots"],
    retentionRisk: "Points records need reconciliation with Pixiepoints and optional companion contracts.",
  }),
  dataStore({
    containsSensitiveData: true,
    currentMode: "deferred",
    id: "export-artifact-store",
    migrationRequired: false,
    name: "Export Artifact Store",
    ownerServiceId: "export-service",
    productionMode: "object_storage",
    records: ["winner_exports", "export_manifests"],
    retentionRisk: "Winner export artifacts need expiry and access review before production.",
  }),
  dataStore({
    containsSensitiveData: false,
    currentMode: "deferred",
    id: "analytics-warehouse",
    migrationRequired: false,
    name: "Analytics Warehouse",
    ownerServiceId: "runtime-observability",
    productionMode: "warehouse",
    records: ["campaign_metrics", "wallet_locale_metrics", "funnel_events"],
    retentionRisk: "Warehouse ingestion needs anonymization and aggregation rules.",
  }),
  dataStore({
    containsSensitiveData: false,
    currentMode: "external",
    id: "contract-index",
    migrationRequired: false,
    name: "Contract Index",
    ownerServiceId: "verification-service",
    productionMode: "indexer",
    records: ["contract_events", "eligibility_root_events", "points_root_events"],
    retentionRisk: "Indexer availability and replay behavior need production SLOs.",
  }),
] as const satisfies readonly BackendDataStore[];

export const backendAdapterGroups = [
  adapterGroup({
    category: "wallet_auth",
    configurationMode: "service_registry",
    failureMode: "local_only",
    forbiddenInLocalReview: false,
    id: "wallet-auth-session",
    name: "Wallet/Auth Session Handoff",
    serviceIds: ["wallet-session-service"],
    status: "local_stub",
  }),
  adapterGroup({
    category: "indexer",
    configurationMode: "service_registry",
    failureMode: "mark_verification_pending_or_manual_review",
    forbiddenInLocalReview: true,
    id: "aefinder-aelfscan-indexers",
    name: "AeFinder / AelfScan Indexers",
    serviceIds: ["verification-service", "eligibility-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "dapp_api",
    configurationMode: "service_registry",
    failureMode: "disable_provider_task_templates",
    forbiddenInLocalReview: true,
    id: "dapp-api-adapters",
    name: "dApp API Adapters",
    serviceIds: ["task-template-service", "verification-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "social_api",
    configurationMode: "service_registry",
    failureMode: "route_to_manual_review",
    forbiddenInLocalReview: true,
    id: "social-api-adapters",
    name: "Social API Adapters",
    serviceIds: ["verification-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "manual_review",
    configurationMode: "none",
    failureMode: "manual_review",
    forbiddenInLocalReview: false,
    id: "manual-review",
    name: "Manual Review Fallback",
    serviceIds: ["verification-service", "eligibility-service"],
    status: "local_stub",
  }),
  adapterGroup({
    category: "ai_provider",
    configurationMode: "service_registry",
    failureMode: "require_human_draft_or_disable_ai_generation",
    forbiddenInLocalReview: true,
    id: "ai-provider-adapters",
    name: "AI Provider Adapters",
    serviceIds: ["i18n-content-service", "ai-ops-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "analytics",
    configurationMode: "service_registry",
    failureMode: "show_local_metrics_only",
    forbiddenInLocalReview: true,
    id: "analytics-warehouse-adapter",
    name: "Analytics Warehouse Adapter",
    serviceIds: ["risk-scoring-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "storage",
    configurationMode: "service_registry",
    failureMode: "keep_export_preview_only",
    forbiddenInLocalReview: true,
    id: "object-storage-adapter",
    name: "Object Storage Adapter",
    serviceIds: ["export-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "contract_reader",
    configurationMode: "service_registry",
    failureMode: "return_contract_read_unavailable",
    forbiddenInLocalReview: true,
    id: "contract-reader-adapter",
    name: "Contract Reader Adapter",
    serviceIds: ["points-ranking-service"],
    status: "deferred",
  }),
  adapterGroup({
    category: "contract_writer",
    configurationMode: "service_registry",
    failureMode: "manual_review_required",
    forbiddenInLocalReview: true,
    id: "contract-writer-adapter",
    name: "Contract Writer Adapter",
    serviceIds: ["export-service"],
    status: "disabled",
  }),
] as const satisfies readonly BackendAdapterGroup[];

export const backendRuntimeProfiles = [
  runtimeProfile({
    allowedSupportModes: ["local_seeded"],
    deferredCapabilities: [
      "local_persistence_adapter",
      "production_database",
      "auth_session",
      "provider_adapters",
      "worker_queue",
      "scheduler",
      "object_storage_export",
    ],
    deploymentUnits: ["web-app", "api-runtime"],
    description: "Deterministic local review profile with seeded data and no external dependencies.",
    disabledCapabilities: [
      "migration_runner",
      "contract_writer",
      "reward_custody",
      "reward_distribution",
      "sensitive_material_boundary",
    ],
    externalNetworkAllowed: false,
    id: "local-review",
    label: "Local Review",
    requiredCapabilities: ["local_api_runtime"],
    secretRequired: false,
  }),
  runtimeProfile({
    allowedSupportModes: ["configured_staging"],
    deferredCapabilities: ["contract_writer", "reward_custody", "reward_distribution"],
    deploymentUnits: ["web-app", "api-runtime", "worker-runtime", "scheduler-runtime"],
    description: "Future staging profile for non-production DB, auth, providers, workers, and storage validation.",
    disabledCapabilities: ["reward_custody", "reward_distribution"],
    externalNetworkAllowed: true,
    id: "staging-ready",
    label: "Staging Ready",
    requiredCapabilities: [
      "local_api_runtime",
      "production_database",
      "migration_runner",
      "auth_session",
      "provider_adapters",
      "worker_queue",
      "scheduler",
      "object_storage_export",
    ],
    secretRequired: true,
  }),
  runtimeProfile({
    allowedSupportModes: ["production"],
    deferredCapabilities: [],
    deploymentUnits: [
      "web-app",
      "api-runtime",
      "worker-runtime",
      "scheduler-runtime",
      "contract-ops-runtime",
    ],
    description: "Future production profile requiring durable services and approved external integrations.",
    disabledCapabilities: ["reward_custody", "reward_distribution"],
    externalNetworkAllowed: true,
    id: "production-required",
    label: "Production Required",
    requiredCapabilities: [
      "local_api_runtime",
      "production_database",
      "migration_runner",
      "auth_session",
      "provider_adapters",
      "worker_queue",
      "scheduler",
      "contract_writer",
      "object_storage_export",
    ],
    secretRequired: true,
  }),
] as const satisfies readonly BackendRuntimeProfile[];

export const backendDeploymentUnits = [
  deploymentUnit({
    currentImplementation: "vite-node-local",
    entrypoint: "src/main.tsx",
    id: "web-app",
    name: "Web App",
    productionTarget: "static_web_app",
    runtimeProfileIds: ["local-review", "staging-ready", "production-required"],
    serviceIds: [],
  }),
  deploymentUnit({
    currentImplementation: "vite-node-local",
    entrypoint: "src/server/server.ts",
    id: "api-runtime",
    name: "API Runtime",
    productionTarget: "api_service",
    runtimeProfileIds: ["local-review", "staging-ready", "production-required"],
    serviceIds: [
      "campaign-service",
      "task-template-service",
      "wallet-session-service",
      "eligibility-service",
      "export-service",
      "i18n-content-service",
      "service-registry",
      "runtime-observability",
      "points-ranking-service",
      "referral-service",
    ],
  }),
  deploymentUnit({
    attachPointPath: "src/server/queueProviderAdapter.ts",
    currentImplementation: "source-topology-only",
    currentStatus: "local",
    entrypoint: "src/server/queueRuntime.ts",
    id: "worker-runtime",
    name: "Worker Runtime",
    productionRequiredBlockerIds: queueProviderAdapterProductionPreconditions.map((precondition) =>
      topologySafeQueueProviderBlockerId(precondition.id)
    ),
    productionTarget: "worker_service",
    runtimeProfileIds: ["staging-ready", "production-required"],
    serviceIds: ["verification-service", "risk-scoring-service", "ai-ops-service"],
  }),
  deploymentUnit({
    attachPointPath: "src/server/schedulerRuntime.ts",
    currentImplementation: "source-topology-only",
    currentStatus: "local",
    entrypoint: "src/server/schedulerRuntime.ts",
    id: "scheduler-runtime",
    localReviewRuntimePolicy: {
      cloudSchedulerPackageInstalled: false,
      cronPackageInstalled: false,
      liveCronExecutionEnabled: false,
      liveSchedulerExecutionEnabled: false,
    },
    name: "Scheduler Runtime",
    productionRequiredBlockerIds: schedulerRuntimeProductionPreconditions.map((precondition) => precondition.id),
    productionTarget: "scheduled_runner",
    runtimeProfileIds: ["staging-ready", "production-required"],
    serviceIds: [
      "campaign-service",
      "eligibility-service",
      "export-service",
      "risk-scoring-service",
      "ai-ops-service",
      "runtime-observability",
      "points-ranking-service",
    ],
  }),
  deploymentUnit({
    currentImplementation: "deferred",
    entrypoint: "src/server/topology.ts",
    id: "contract-ops-runtime",
    name: "Contract Ops Runtime",
    productionTarget: "contract_ops_service",
    runtimeProfileIds: ["production-required"],
    serviceIds: [],
  }),
] as const satisfies readonly BackendDeploymentUnit[];

export const backendTopology: BackendTopology = {
  adapterGroups: [...backendAdapterGroups],
  dataStores: [...backendDataStores],
  deploymentUnits: [...backendDeploymentUnits],
  runtimeProfiles: [...backendRuntimeProfiles],
  services: [...backendServiceBoundaries],
};

const createIssue = (
  code: BackendTopologyIssueCode,
  field: string,
  message: string,
): BackendTopologyValidationIssue => ({ code, field, message });

const createIdSet = <T extends { id: string }>(items: readonly T[]) => new Set(items.map((item) => item.id));

export const validateBackendTopology = (
  topology: BackendTopology = backendTopology,
  { knownRouteIds = [] }: { knownRouteIds?: readonly string[] } = {},
): BackendTopologyValidationResult => {
  const issues: BackendTopologyValidationIssue[] = [];
  const serviceIds = createIdSet(topology.services);
  const dataStoreIds = createIdSet(topology.dataStores);
  const adapterGroupIds = createIdSet(topology.adapterGroups);
  const deploymentUnitIds = createIdSet(topology.deploymentUnits);
  const runtimeProfileIds = createIdSet(topology.runtimeProfiles);
  const knownRouteIdSet = new Set(knownRouteIds);

  topology.services.forEach((serviceItem, serviceIndex) => {
    if (serviceItem.productionRequired && !serviceItem.deploymentUnit) {
      issues.push(
        createIssue(
          "PRODUCTION_SERVICE_WITHOUT_DEPLOYMENT",
          `services[${serviceIndex}].deploymentUnit`,
          "Production-required service must map to a deployment unit.",
        ),
      );
    }

    if (!deploymentUnitIds.has(serviceItem.deploymentUnit)) {
      issues.push(
        createIssue(
          "UNKNOWN_DEPLOYMENT_UNIT",
          `services[${serviceIndex}].deploymentUnit`,
          "Service deployment unit is not defined.",
        ),
      );
    }

    serviceItem.dataStores.forEach((dataStoreId, dataStoreIndex) => {
      if (!dataStoreIds.has(dataStoreId)) {
        issues.push(
          createIssue(
            "UNKNOWN_DATA_STORE_ID",
            `services[${serviceIndex}].dataStores[${dataStoreIndex}]`,
            "Service data store is not defined.",
          ),
        );
      }
    });

    serviceItem.adapterGroups.forEach((adapterGroupId, adapterIndex) => {
      if (!adapterGroupIds.has(adapterGroupId)) {
        issues.push(
          createIssue(
            "UNKNOWN_ADAPTER_GROUP_ID",
            `services[${serviceIndex}].adapterGroups[${adapterIndex}]`,
            "Service adapter group is not defined.",
          ),
        );
      }
    });

    serviceItem.runtimeProfiles.forEach((profileId, profileIndex) => {
      if (!runtimeProfileIds.has(profileId)) {
        issues.push(
          createIssue(
            "UNKNOWN_RUNTIME_PROFILE",
            `services[${serviceIndex}].runtimeProfiles[${profileIndex}]`,
            "Service runtime profile is not defined.",
          ),
        );
      }
    });

    serviceItem.routeIds.forEach((routeId, routeIndex) => {
      if (knownRouteIdSet.size > 0 && !knownRouteIdSet.has(routeId)) {
        issues.push(
          createIssue(
            "UNKNOWN_ROUTE_ID",
            `services[${serviceIndex}].routeIds[${routeIndex}]`,
            "Service route ID is not defined by the runtime route catalog.",
          ),
        );
      }
    });
  });

  topology.dataStores.forEach((storeItem, storeIndex) => {
    if (!serviceIds.has(storeItem.ownerServiceId)) {
      issues.push(
        createIssue(
          "UNKNOWN_SERVICE_ID",
          `dataStores[${storeIndex}].ownerServiceId`,
          "Data store owner service is not defined.",
        ),
      );
    }
  });

  topology.adapterGroups.forEach((adapterItem, adapterIndex) => {
    adapterItem.serviceIds.forEach((serviceId, serviceIndex) => {
      if (!serviceIds.has(serviceId)) {
        issues.push(
          createIssue(
            "UNKNOWN_SERVICE_ID",
            `adapterGroups[${adapterIndex}].serviceIds[${serviceIndex}]`,
            "Adapter service reference is not defined.",
          ),
        );
      }
    });

    if (
      adapterItem.forbiddenInLocalReview
      && adapterItem.status !== "deferred"
      && adapterItem.status !== "disabled"
    ) {
      issues.push(
        createIssue(
          "LOCAL_REVIEW_FORBIDDEN_ADAPTER_ENABLED",
          `adapterGroups[${adapterIndex}].status`,
          "Adapter forbidden in local review must be deferred or disabled.",
        ),
      );
    }
  });

  topology.runtimeProfiles.forEach((profile, profileIndex) => {
    profile.deploymentUnits.forEach((deploymentUnitId, deploymentIndex) => {
      if (!deploymentUnitIds.has(deploymentUnitId)) {
        issues.push(
          createIssue(
            "UNKNOWN_DEPLOYMENT_UNIT",
            `runtimeProfiles[${profileIndex}].deploymentUnits[${deploymentIndex}]`,
            "Runtime profile deployment unit is not defined.",
          ),
        );
      }
    });

    if (profile.id === "local-review" && profile.externalNetworkAllowed) {
      issues.push(
        createIssue(
          "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK",
          `runtimeProfiles[${profileIndex}].externalNetworkAllowed`,
          "Local review must not allow external network calls.",
        ),
      );
    }

    if (profile.id === "local-review" && profile.secretRequired) {
      issues.push(
        createIssue(
          "LOCAL_REVIEW_REQUIRES_SECRET",
          `runtimeProfiles[${profileIndex}].secretRequired`,
          "Local review must not require secrets.",
        ),
      );
    }
  });

  topology.deploymentUnits.forEach((unit, unitIndex) => {
    unit.serviceIds.forEach((serviceId, serviceIndex) => {
      if (!serviceIds.has(serviceId)) {
        issues.push(
          createIssue(
            "UNKNOWN_SERVICE_ID",
            `deploymentUnits[${unitIndex}].serviceIds[${serviceIndex}]`,
            "Deployment unit service reference is not defined.",
          ),
        );
      }
    });

    unit.runtimeProfileIds.forEach((profileId, profileIndex) => {
      if (!runtimeProfileIds.has(profileId)) {
        issues.push(
          createIssue(
            "UNKNOWN_RUNTIME_PROFILE",
            `deploymentUnits[${unitIndex}].runtimeProfileIds[${profileIndex}]`,
            "Deployment unit runtime profile is not defined.",
          ),
        );
      }
    });
  });

  return {
    issues,
    valid: issues.length === 0,
  };
};

const createProfileReadiness = (
  profiles: readonly BackendRuntimeProfile[],
): Record<BackendRuntimeProfileId, BackendRuntimeProfileReadiness> =>
  Object.fromEntries(
    profiles.map((profile) => [
      profile.id,
      {
        disabledCapabilityCount: profile.disabledCapabilities.length,
        externalNetworkAllowed: profile.externalNetworkAllowed,
        requiredCapabilityCount: profile.requiredCapabilities.length,
        secretRequired: profile.secretRequired,
      },
    ]),
  ) as Record<BackendRuntimeProfileId, BackendRuntimeProfileReadiness>;

const findUnassignedRouteIds = (topology: BackendTopology, knownRouteIds: readonly string[]) => {
  const assignedRouteIds = new Set(topology.services.flatMap((serviceItem) => serviceItem.routeIds));

  return knownRouteIds.filter((routeId) => !assignedRouteIds.has(routeId));
};

export const createBackendTopologyReport = ({
  generatedAt = new Date(0).toISOString(),
  knownRouteIds = [],
  topology = backendTopology,
}: BackendTopologyReportOptions = {}): BackendTopologyReport => {
  const validation = validateBackendTopology(topology, { knownRouteIds });
  const unassignedRouteIds = findUnassignedRouteIds(topology, knownRouteIds);

  return {
    adapterGroups: [...topology.adapterGroups],
    coverage: {
      adapterGroupCount: topology.adapterGroups.length,
      dataStoreCount: topology.dataStores.length,
      deploymentUnitCount: topology.deploymentUnits.length,
      invalidReferenceCount: validation.issues.length,
      runtimeProfileCount: topology.runtimeProfiles.length,
      serviceCount: topology.services.length,
      unassignedRouteIds,
    },
    dataStores: [...topology.dataStores],
    deploymentUnits: [...topology.deploymentUnits],
    generatedAt,
    profileReadiness: createProfileReadiness(topology.runtimeProfiles),
    runtimeProfiles: [...topology.runtimeProfiles],
    services: [...topology.services],
    validation: {
      issues: validation.issues,
      valid: validation.valid && unassignedRouteIds.length === 0,
    },
  };
};
