import type { ApiRuntimeCapabilityId } from "./contracts";
import {
  createApiFoundationRegistry,
  type ApiFoundationRegistry,
} from "./apiFoundation";
import {
  backendServiceBoundaries,
  type BackendServiceBoundaryId,
} from "./topology";

export type ApiServicePortId =
  | "ai-ops-port"
  | "campaign-port"
  | "eligibility-port"
  | "export-port"
  | "i18n-content-port"
  | "points-ranking-port"
  | "referral-port"
  | "runtime-observability-port"
  | "service-registry-port"
  | "task-template-port"
  | "verification-port"
  | "wallet-session-port";
export type ApiServicePortAdapterStatus =
  | "deferred"
  | "disabled"
  | "local_metadata_only"
  | "local_seeded";

export interface ApiServicePort {
  deferredCapabilities: ApiRuntimeCapabilityId[];
  futureAttachPoints: string[];
  id: ApiServicePortId;
  localAdapter: string;
  notes: string;
  productionAdapterStatus: ApiServicePortAdapterStatus;
  requiresExternalNetwork: boolean;
  requiresSecret: boolean;
  routeIds: string[];
  serviceId: BackendServiceBoundaryId;
}

export type ApiServicePortValidationIssueCode =
  | "DUPLICATE_ROUTE_OWNER"
  | "ENABLED_PRODUCTION_ADAPTER"
  | "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK"
  | "LOCAL_REVIEW_REQUIRES_SECRET"
  | "UNKNOWN_ROUTE_ID"
  | "UNKNOWN_SERVICE_ID"
  | "UNOWNED_ROUTE_ID";

export interface ApiServicePortValidationIssue {
  code: ApiServicePortValidationIssueCode;
  field: string;
  message: string;
}

export interface ApiServicePortValidationResult {
  issues: ApiServicePortValidationIssue[];
  valid: boolean;
}

export interface ApiServicePortCoverage {
  deferredPortCount: number;
  localMetadataOnlyPortCount: number;
  localSeededPortCount: number;
  portCount: number;
  routeOwnershipCount: number;
  validationIssueCount: number;
}

export interface ApiServicePortReport {
  coverage: ApiServicePortCoverage;
  ports: ApiServicePort[];
  validation: ApiServicePortValidationResult;
}

export interface ApiServicePortReportOptions {
  foundation?: ApiFoundationRegistry;
  ports?: readonly ApiServicePort[];
}

const servicePort = (port: ApiServicePort): ApiServicePort => port;

export const apiServicePorts = [
  servicePort({
    deferredCapabilities: [],
    futureAttachPoints: [
      "src/server/observabilityExporter.ts readiness foundation",
      "production observability exporter",
      "metrics sink registration",
      "structured log sink",
      "trace collector",
      "alert routing policy",
      "src/server/queueProviderDriver.ts readiness projection",
      "src/server/queueProviderSdkBinding.ts readiness projection",
      "src/server/queueProviderPackageBinding.ts readiness projection",
      "src/server/redisBrokerConnectionReadiness.ts readiness metadata",
      "contract metadata publisher",
    ],
    id: "runtime-observability-port",
    localAdapter: "src/server/handlers.ts runtime health/contracts handlers",
    notes: "Local runtime, contract metadata, analytics summary, analytics ingestion readiness, and observability exporter readiness are available; live analytics SDK execution, warehouse writes, telemetry export, metrics sink writes, logs, traces, alerts, and retry/dead-letter delivery remain disabled.",
    productionAdapterStatus: "local_metadata_only",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: [
      "runtime.health",
      "runtime.contracts",
      "campaigns.analytics",
      "campaigns.analytics.ingestion.readiness",
      "campaigns.summary",
    ],
    serviceId: "runtime-observability",
  }),
  servicePort({
    deferredCapabilities: ["provider_adapters"],
    futureAttachPoints: [
      "feature flag registry",
      "third-party service maintenance registry",
      "service degradation notifier",
    ],
    id: "service-registry-port",
    localAdapter: "src/domain/serviceRegistry.ts local registry",
    notes: "Local service readiness metadata exists; production registry resolution is deferred.",
    productionAdapterStatus: "local_metadata_only",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["runtime.services"],
    serviceId: "service-registry",
  }),
  servicePort({
    deferredCapabilities: ["auth_session", "production_database"],
    futureAttachPoints: [
      "src/server/walletSessionRepository.ts sanitized wallet session repository",
      "src/server/walletSessionDurableStore.ts durable-test wallet session store",
      "wallet signature verification",
      "production session repository adapter",
      "RBAC guard",
    ],
    id: "wallet-session-port",
    localAdapter: "src/server/handlers.ts wallet.session.create with src/server/walletSessionRepository.ts",
    notes: "Normalized local wallet sessions are stored in a sanitized repository-backed local session store; live wallet verification, JWT/cookie issuing, signing keys, secret manager, RBAC, and production session storage are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["wallet.session.create"],
    serviceId: "wallet-session-service",
  }),
  servicePort({
    deferredCapabilities: ["auth_session", "production_database"],
    futureAttachPoints: [
      "campaign repository",
      "src/server/campaignDbRepository.ts campaign participant repository/read model",
      "src/server/campaignDbRepository.ts campaign referral binding read model",
      "project owner authorization",
      "publish checklist persistence",
      "lifecycle transition audit log",
      "publish readiness repository",
      "delivery readiness evidence repository",
      "companion contract review repository",
      "contract transparency reviewer workflow",
      "future Campaign DB participant table service",
      "future Campaign DB referral binding table service",
    ],
    id: "campaign-port",
    localAdapter: "src/domain/campaignService.ts campaign local handlers",
    notes: "Campaign discovery, draft creation, lifecycle operation inspection, launch readiness inspection, delivery readiness inspection, publish delivery joint review bridge inspection, companion contract readiness inspection, contract transparency inspection, campaign participant repository/read model metadata, and campaign referral binding read model metadata use local deterministic or durable-test read models; production DB migration, mutation audit, scheduler handoff, auth, wallet SDK calls, provider risk calls, contract writes, storage writes, reward custody, and reward distribution are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: [
      "campaigns.list",
      "campaigns.create",
      "campaigns.detail",
      "campaigns.lifecycle",
      "campaigns.launch.readiness",
      "campaigns.delivery.readiness",
      "campaigns.publish.delivery.review",
      "campaigns.companion.contract.readiness",
      "campaigns.contract.transparency",
    ],
    serviceId: "campaign-service",
  }),
  servicePort({
    deferredCapabilities: ["production_database", "provider_adapters"],
    futureAttachPoints: [
      "task template repository",
      "dApp template provider catalog",
      "wallet compatibility rules engine",
    ],
    id: "task-template-port",
    localAdapter: "src/domain/campaignService.ts add_campaign_task local handler",
    notes: "Task drafts are local; live provider-backed template catalogs are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.tasks.add"],
    serviceId: "task-template-service",
  }),
  servicePort({
    deferredCapabilities: ["provider_adapters", "worker_queue"],
    futureAttachPoints: [
      "verification worker enqueueing",
      "BullMQ Redis-compatible package binding metadata",
      "Redis broker connection readiness metadata",
      "Redis broker endpoint reference",
      "queue provider SDK package installation",
      "queue provider package binding registration",
      "queue provider SDK binding registration",
      "real broker connection",
      "live worker execution gate",
      "AeFinder/AelfScan adapter",
      "dApp/social provider adapters",
      "manual review queue",
      "provider readiness registry",
    ],
    id: "verification-port",
    localAdapter: "src/domain/campaignService.ts verify_task local handler",
    notes: "Seeded verification and provider readiness inspection exist; provider evidence, BullMQ Redis-compatible package binding metadata, Redis broker readiness metadata, Redis broker reference, queue provider SDK package installation, real broker connection, package/SDK binding registration, and async live worker execution are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["tasks.verify", "campaigns.provider.readiness"],
    serviceId: "verification-service",
  }),
  servicePort({
    deferredCapabilities: ["production_database", "provider_adapters"],
    futureAttachPoints: [
      "src/server/campaignDbRepository.ts campaign participant repository/read model",
      "src/server/campaignDbRepository.ts campaign referral binding read model",
      "eligibility repository",
      "risk signal reader",
      "chain evidence reader",
      "future Campaign DB participant table service",
      "future Campaign DB referral binding table service",
    ],
    id: "eligibility-port",
    localAdapter: "src/domain/campaignService.ts check_eligibility local handler",
    notes: "Local eligibility checks use the campaign participant repository/read model and campaign referral binding read model in deterministic and durable-test modes; live wallet verification, production DB migration, live evidence, provider risk calls, and production risk stores are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.eligibility"],
    serviceId: "eligibility-service",
  }),
  servicePort({
    deferredCapabilities: ["production_database", "provider_adapters"],
    futureAttachPoints: [
      "i18n content repository",
      "AI provider draft generator",
      "human review workflow",
    ],
    id: "i18n-content-port",
    localAdapter: "src/domain/campaignService.ts generate_i18n_draft local handler",
    notes: "Local i18n drafts exist; AI provider and content DB are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.i18n.generate"],
    serviceId: "i18n-content-service",
  }),
  servicePort({
    deferredCapabilities: ["contract_writer", "object_storage_export"],
    futureAttachPoints: [
      "src/server/campaignDbRepository.ts participant-backed export projection",
      "src/server/campaignDbRepository.ts referral binding export projection",
      "src/server/exportArtifactRegistry.ts local artifact registry",
      "src/server/exportArtifactRegistry.ts local audit read model",
      "src/server/objectStorageExportRuntime.ts provider-neutral storage readiness",
      "export artifact store",
      "signed download broker",
      "eligibility root publisher",
      "contract writer approval gate",
      "export confirmation readiness store",
      "future Campaign DB participant table service",
      "future Campaign DB referral binding table service",
    ],
    id: "export-port",
    localAdapter: "src/domain/campaignService.ts export_winners local preview handler with src/server/exportArtifactRegistry.ts metadata attachment and src/server/objectStorageExportRuntime.ts storage readiness",
    notes: "Export preview, export artifact registry metadata, export artifact audit read metadata, export readiness inspection, object storage export readiness inspection, participant-backed export projection, and referral binding export projection are local; production DB migration, storage-backed files, signed downloads, live object keys, contract transaction, contract writes, provider risk calls, and reward distribution are deferred or disabled.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: [
      "campaigns.export.preview",
      "campaigns.export.readiness",
      "campaigns.export.storage.readiness",
      "campaigns.export.artifacts.list",
      "campaigns.export.artifacts.detail",
      "campaigns.export.artifacts.file",
    ],
    serviceId: "export-service",
  }),
  servicePort({
    deferredCapabilities: ["contract_writer", "production_database", "scheduler", "worker_queue"],
    futureAttachPoints: [
      "Pixiepoints backend ledger adapter",
      "points ledger repository",
      "ranking snapshot repository",
      "eligibility root publisher",
      "CampaignPointsLedgerV2 batch root writer",
      "reward distribution handoff",
    ],
    id: "points-ranking-port",
    localAdapter: "src/domain/pointsRankingLedgerRuntime.ts local review read model",
    notes: "Points ranking ledger runtime is local seeded review only; production Pixiepoints writes, backend ledger writes, contract root writes, export file writes, reward custody, and reward distribution are deferred or disabled.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.points.ranking.ledger.runtime"],
    serviceId: "points-ranking-service",
  }),
  servicePort({
    deferredCapabilities: ["production_database", "provider_adapters", "scheduler", "worker_queue"],
    futureAttachPoints: [
      "src/server/campaignDbRepository.ts campaign referral binding read model",
      "future Campaign DB referral binding table service",
      "risk event repository",
      "provider risk signal reader",
      "referral qualification worker handoff",
      "manual review queue",
      "dead-letter queue",
    ],
    id: "referral-port",
    localAdapter: "src/server/campaignDbRepository.ts referral binding repository/read model metadata",
    notes: "Wallet-aware referral binding metadata is local deterministic or durable-test only; production referral API routes, production DB migration, live wallet verification, provider risk calls, risk event ingestion, contract transactions, reward custody, and reward distribution are deferred or disabled.",
    productionAdapterStatus: "local_metadata_only",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: [],
    serviceId: "referral-service",
  }),
  servicePort({
    deferredCapabilities: ["auth_session", "provider_adapters", "scheduler", "worker_queue"],
    futureAttachPoints: [
      "Agent Skill wallet action approval workflow",
      "AI task generation provider adapter",
      "AI campaign post provider adapter",
      "AI Ops worker execution gate",
    ],
    id: "ai-ops-port",
    localAdapter: "src/domain/campaignService.ts AI Ops local skill handlers",
    notes: "AI Ops routes expose local contract metadata only; wallet action execution, live AI provider calls, scheduler handoff, queue execution, and worker execution remain disabled or deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["agent.wallet.action.review", "campaigns.tasks.generate", "campaigns.posts.generate"],
    serviceId: "ai-ops-service",
  }),
] as const satisfies readonly ApiServicePort[];

const createIssue = (
  code: ApiServicePortValidationIssueCode,
  field: string,
  message: string,
): ApiServicePortValidationIssue => ({ code, field, message });

const createIdSet = <TItem extends { id: string }>(items: readonly TItem[]) =>
  new Set(items.map((item) => item.id));

export const validateApiServicePorts = ({
  foundation = createApiFoundationRegistry(),
  ports = apiServicePorts,
}: ApiServicePortReportOptions = {}): ApiServicePortValidationResult => {
  const issues: ApiServicePortValidationIssue[] = [];
  const knownRouteIds = new Set(foundation.routes.map((route) => route.routeId));
  const knownServiceIds = createIdSet(backendServiceBoundaries);
  const routeOwnerById = new Map<string, string>();

  ports.forEach((port, portIndex) => {
    if (!knownServiceIds.has(port.serviceId)) {
      issues.push(
        createIssue(
          "UNKNOWN_SERVICE_ID",
          `ports[${portIndex}].serviceId`,
          "Service port references an undefined backend service boundary.",
        ),
      );
    }

    if (port.productionAdapterStatus === "disabled" || port.productionAdapterStatus === "deferred") {
      return;
    }

    if (port.requiresExternalNetwork) {
      issues.push(
        createIssue(
          "LOCAL_REVIEW_REQUIRES_EXTERNAL_NETWORK",
          `ports[${portIndex}].requiresExternalNetwork`,
          "Local service ports must not require external network calls.",
        ),
      );
    }

    if (port.requiresSecret) {
      issues.push(
        createIssue(
          "LOCAL_REVIEW_REQUIRES_SECRET",
          `ports[${portIndex}].requiresSecret`,
          "Local service ports must not require secrets.",
        ),
      );
    }

    port.routeIds.forEach((routeId, routeIndex) => {
      if (!knownRouteIds.has(routeId)) {
        issues.push(
          createIssue(
            "UNKNOWN_ROUTE_ID",
            `ports[${portIndex}].routeIds[${routeIndex}]`,
            "Service port references a route that is not defined by the API foundation registry.",
          ),
        );
      }

      const existingOwner = routeOwnerById.get(routeId);
      if (existingOwner) {
        issues.push(
          createIssue(
            "DUPLICATE_ROUTE_OWNER",
            `ports[${portIndex}].routeIds[${routeIndex}]`,
            `Route is already owned by ${existingOwner}.`,
          ),
        );
      } else {
        routeOwnerById.set(routeId, port.id);
      }
    });
  });

  for (const routeId of knownRouteIds) {
    if (!routeOwnerById.has(routeId)) {
      issues.push(
        createIssue(
          "UNOWNED_ROUTE_ID",
          `routes.${routeId}`,
          "Every current API foundation route must be owned by a local service port.",
        ),
      );
    }
  }

  return {
    issues,
    valid: issues.length === 0,
  };
};

const countPortsByStatus = (
  ports: readonly ApiServicePort[],
  status: ApiServicePortAdapterStatus,
) => ports.filter((port) => port.productionAdapterStatus === status).length;

export const createApiServicePortReport = ({
  foundation = createApiFoundationRegistry(),
  ports = apiServicePorts,
}: ApiServicePortReportOptions = {}): ApiServicePortReport => {
  const validation = validateApiServicePorts({ foundation, ports });
  const routeOwnershipCount = new Set(ports.flatMap((port) => port.routeIds)).size;

  return {
    coverage: {
      deferredPortCount: countPortsByStatus(ports, "deferred"),
      localMetadataOnlyPortCount: countPortsByStatus(ports, "local_metadata_only"),
      localSeededPortCount: countPortsByStatus(ports, "local_seeded"),
      portCount: ports.length,
      routeOwnershipCount,
      validationIssueCount: validation.issues.length,
    },
    ports: [...ports],
    validation,
  };
};
