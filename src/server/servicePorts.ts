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
  | "campaign-port"
  | "eligibility-port"
  | "export-port"
  | "i18n-content-port"
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
    notes: "Local runtime, contract metadata, and observability exporter readiness are available; live telemetry export, metrics sink writes, logs, traces, alerts, and retry/dead-letter delivery remain disabled.",
    productionAdapterStatus: "local_metadata_only",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["runtime.health", "runtime.contracts", "campaigns.analytics"],
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
      "wallet signature verification",
      "session repository",
      "RBAC guard",
    ],
    id: "wallet-session-port",
    localAdapter: "src/domain/campaignService.ts create_wallet_session local handler",
    notes: "Normalized local wallet sessions exist; production auth/session storage is deferred.",
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
      "project owner authorization",
      "publish checklist persistence",
    ],
    id: "campaign-port",
    localAdapter: "src/domain/campaignService.ts campaign local handlers",
    notes: "Campaign discovery and draft creation use local seeded data; durable storage and auth are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.list", "campaigns.create", "campaigns.detail"],
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
    ],
    id: "verification-port",
    localAdapter: "src/domain/campaignService.ts verify_task local handler",
    notes: "Seeded verification exists; provider evidence, BullMQ Redis-compatible package binding metadata, Redis broker readiness metadata, Redis broker reference, queue provider SDK package installation, real broker connection, package/SDK binding registration, and async live worker execution are deferred.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["tasks.verify"],
    serviceId: "verification-service",
  }),
  servicePort({
    deferredCapabilities: ["production_database", "provider_adapters"],
    futureAttachPoints: [
      "eligibility repository",
      "risk signal reader",
      "chain evidence reader",
    ],
    id: "eligibility-port",
    localAdapter: "src/domain/campaignService.ts check_eligibility local handler",
    notes: "Local eligibility checks exist; live evidence and risk stores are deferred.",
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
      "export artifact store",
      "signed download broker",
      "eligibility root publisher",
      "contract writer approval gate",
    ],
    id: "export-port",
    localAdapter: "src/domain/campaignService.ts export_winners local preview handler",
    notes: "Export preview is local; storage-backed files and contract writes are deferred or disabled.",
    productionAdapterStatus: "local_seeded",
    requiresExternalNetwork: false,
    requiresSecret: false,
    routeIds: ["campaigns.export.preview"],
    serviceId: "export-service",
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
