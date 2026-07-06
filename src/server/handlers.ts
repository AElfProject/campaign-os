import {
  apiSkillContractRegistry,
  createApiSkillContractSurface,
} from "../domain/apiSkillContracts";
import {
  type AddTaskRequest,
  type CheckEligibilityRequest,
  type CreateCampaignRequest,
  type CreateWalletSessionRequest,
  type ExportWinnersRequest,
  type GenerateI18nDraftRequest,
  type GetCampaignAnalyticsRequest,
  type GetCampaignDetailRequest,
  type ListCampaignsRequest,
  type LocalServiceError,
  type LocalServiceResult,
  type VerifyTaskRequest,
} from "../domain/campaignService";
import {
  createServiceDegradationGovernance,
  createServiceRegistry,
} from "../domain/serviceRegistry";
import type { ApiRuntimeRouteId } from "./routes";
import { apiRuntimeRoutes, createApiRuntimeContractCoverage } from "./routes";
import { createRuntimeSafety } from "./envelope";
import {
  invalidCampaign,
  invalidRequest,
  invalidTask,
  unsupportedExportMode,
  unsupportedLocale,
} from "./errors";
import type { ApiRuntimeHandler, ApiRuntimeHandlerContext } from "./apiRuntime";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const bodyRecord = (context: ApiRuntimeHandlerContext): JsonRecord => {
  if (context.body === undefined) {
    return {};
  }

  if (!isRecord(context.body)) {
    throw invalidRequest("body", "Request body must be a JSON object.");
  }

  return context.body;
};

const optionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

const requiredString = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "string") {
    throw invalidRequest(field, `${field} must be a string.`);
  }

  return value;
};

const requiredNumber = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidRequest(field, `${field} must be a finite number.`);
  }

  return value;
};

const requiredBoolean = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "boolean") {
    throw invalidRequest(field, `${field} must be a boolean.`);
  }

  return value;
};

const requiredRecord = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (!isRecord(value)) {
    throw invalidRequest(field, `${field} must be a JSON object.`);
  }

  return value as Record<string, string | number | boolean>;
};

const localErrorToRuntimeError = (
  error: LocalServiceError,
  context: ApiRuntimeHandlerContext,
) => {
  const body = isRecord(context.body) ? context.body : {};
  const campaignId = optionalString(context.params.campaignId) ?? optionalString(body.campaignId);
  const taskId = optionalString(context.params.taskId) ?? optionalString(body.taskId);

  switch (error.code) {
    case "CAMPAIGN_NOT_FOUND":
      return invalidCampaign(campaignId ?? "unknown-campaign");
    case "TASK_NOT_FOUND":
      return invalidTask(taskId ?? "unknown-task");
    case "UNSUPPORTED_LOCALE":
      return unsupportedLocale(
        optionalString(body.targetLocale)
          ?? optionalString(body.sourceLocale)
          ?? optionalString(body.defaultLocale)
          ?? optionalString(context.query.locale)
          ?? "unknown-locale",
      );
    case "UNSUPPORTED_EXPORT_MODE":
      return unsupportedExportMode(
        optionalString(body.contractRootMode) ?? optionalString(body.format) ?? "unknown-export-mode",
      );
    default:
      return invalidRequest(error.field ?? "request", error.message["en-US"]);
  }
};

const unwrapLocalResult = <TPayload>(
  result: LocalServiceResult<TPayload>,
  context: ApiRuntimeHandlerContext,
) => {
  if (!result.ok) {
    throw localErrorToRuntimeError(result.error, context);
  }

  return {
    boundary: result.boundary,
    payload: result.payload,
  };
};

const createCampaignRequest = (context: ApiRuntimeHandlerContext): CreateCampaignRequest => {
  const body = bodyRecord(context);

  return {
    ...body,
    duration: requiredString(body, "duration"),
    endTime: requiredString(body, "endTime"),
    goal: requiredString(body, "goal"),
    ownerAddress: requiredString(body, "ownerAddress"),
    projectId: requiredString(body, "projectId"),
    rewardDescription: requiredString(body, "rewardDescription"),
    startTime: requiredString(body, "startTime"),
  } as CreateCampaignRequest;
};

const addTaskRequest = (context: ApiRuntimeHandlerContext): AddTaskRequest => {
  const body = bodyRecord(context);

  return {
    ...body,
    campaignId: context.params.campaignId,
    evidenceRule: requiredRecord(body, "evidenceRule"),
    points: requiredNumber(body, "points"),
    required: requiredBoolean(body, "required"),
    templateCode: requiredString(body, "templateCode"),
    verificationType: requiredString(body, "verificationType") as AddTaskRequest["verificationType"],
    walletCompatibility: requiredString(body, "walletCompatibility") as AddTaskRequest["walletCompatibility"],
  };
};

const verifyTaskRequest = (context: ApiRuntimeHandlerContext): VerifyTaskRequest => {
  const body = bodyRecord(context);

  return {
    accountType: requiredString(body, "accountType") as VerifyTaskRequest["accountType"],
    campaignId: requiredString(body, "campaignId"),
    taskId: context.params.taskId,
    walletAddress: requiredString(body, "walletAddress"),
    walletSource: requiredString(body, "walletSource") as VerifyTaskRequest["walletSource"],
  };
};

const listCampaignRequest = (context: ApiRuntimeHandlerContext): ListCampaignsRequest => ({
  consumerSurface: context.query.consumerSurface as ListCampaignsRequest["consumerSurface"],
  status: context.query.status as ListCampaignsRequest["status"],
  walletAddress: context.query.walletAddress,
});

const campaignDetailRequest = (context: ApiRuntimeHandlerContext): GetCampaignDetailRequest => ({
  ...listCampaignRequest(context),
  campaignId: context.params.campaignId,
});

const eligibilityRequest = (context: ApiRuntimeHandlerContext): CheckEligibilityRequest => {
  const walletAddress = context.query.walletAddress ?? context.query.address;

  if (!walletAddress) {
    throw invalidRequest("walletAddress", "Eligibility checks require walletAddress or address query.");
  }

  return {
    accountType: context.query.accountType as CheckEligibilityRequest["accountType"],
    campaignId: context.params.campaignId,
    walletAddress,
    walletSource: context.query.walletSource as CheckEligibilityRequest["walletSource"],
  };
};

const exportRequest = (context: ApiRuntimeHandlerContext): ExportWinnersRequest => {
  const body = bodyRecord(context);

  return {
    campaignId: context.params.campaignId,
    contractRootMode: (body.contractRootMode ?? "none") as ExportWinnersRequest["contractRootMode"],
    format: (body.format ?? "csv") as ExportWinnersRequest["format"],
    includeLocalePreference: body.includeLocalePreference !== false,
    includeRiskFlags: body.includeRiskFlags !== false,
    includeWalletType: body.includeWalletType !== false,
  };
};

const i18nDraftRequest = (context: ApiRuntimeHandlerContext): GenerateI18nDraftRequest => {
  const body = bodyRecord(context);

  return {
    campaignId: context.params.campaignId,
    contentKeys: Array.isArray(body.contentKeys)
      ? body.contentKeys.filter((key): key is string => typeof key === "string")
      : ["title", "description", "rewardDisclaimer"],
    sourceLocale: (body.sourceLocale ?? "en-US") as GenerateI18nDraftRequest["sourceLocale"],
    targetLocale: (body.targetLocale ?? context.query.locale) as GenerateI18nDraftRequest["targetLocale"],
  };
};

export const createApiRuntimeHandlers = (): Record<ApiRuntimeRouteId, ApiRuntimeHandler> => ({
  "runtime.health": (context) => {
    const coverage = context.service.getCoverageSummary();
    const services = createServiceDegradationGovernance();

    return {
      boundary: coverage.boundary,
      mode: "local_seeded",
      routeCount: apiRuntimeRoutes.length,
      safety: createRuntimeSafety(),
      serviceReadiness: coverage.ok
        ? {
            blockedCount: coverage.payload.blockedCount,
            localOnlyCount: coverage.payload.localOnlyCount,
            readyCount: coverage.payload.readyCount,
            reviewRequiredCount: coverage.payload.reviewRequiredCount,
            totalServices: coverage.payload.totalServices,
          }
        : undefined,
      serviceRegistry: services.summary,
      status: "ok",
      version: context.version,
    };
  },
  "runtime.contracts": () => ({
    apiSkillContracts: apiSkillContractRegistry,
    apiSkillSurface: createApiSkillContractSurface(),
    coverage: createApiRuntimeContractCoverage(),
    routes: apiRuntimeRoutes,
  }),
  "runtime.services": () => {
    const registry = createServiceRegistry();
    const governance = createServiceDegradationGovernance();

    return {
      boundary: governance.boundary,
      entries: registry.entries,
      governance,
      summary: governance.summary,
    };
  },
  "wallet.session.create": (context) =>
    unwrapLocalResult(
      context.service.createWalletSession(bodyRecord(context) as CreateWalletSessionRequest),
      context,
    ),
  "campaigns.list": (context) =>
    unwrapLocalResult(context.service.listCampaigns(listCampaignRequest(context)), context),
  "campaigns.create": (context) =>
    unwrapLocalResult(
      context.service.createCampaign(createCampaignRequest(context)),
      context,
    ),
  "campaigns.detail": (context) =>
    unwrapLocalResult(context.service.getCampaignDetail(campaignDetailRequest(context)), context),
  "campaigns.tasks.add": (context) =>
    unwrapLocalResult(
      context.service.addTask(addTaskRequest(context)),
      context,
    ),
  "tasks.verify": (context) =>
    unwrapLocalResult(
      context.service.verifyTask(verifyTaskRequest(context)),
      context,
    ),
  "campaigns.eligibility": (context) =>
    unwrapLocalResult(context.service.checkEligibility(eligibilityRequest(context)), context),
  "campaigns.analytics": (context) =>
    unwrapLocalResult(
      context.service.getCampaignAnalytics({
        campaignId: context.params.campaignId,
      } satisfies GetCampaignAnalyticsRequest),
      context,
    ),
  "campaigns.i18n.generate": (context) =>
    unwrapLocalResult(context.service.generateI18nDraft(i18nDraftRequest(context)), context),
  "campaigns.export.preview": (context) =>
    unwrapLocalResult(context.service.exportWinners(exportRequest(context)), context),
});
