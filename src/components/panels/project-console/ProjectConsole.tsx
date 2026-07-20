import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
} from "react";
import {
  createProjectOwnerCampaignApiBridge,
  type AddOwnerCampaignTaskInput,
  type CreateOwnerCampaignInput,
  type GenerateOwnerTaskPreviewInput,
  type OwnerCampaignDetailResult,
  type OwnerCampaignFailure,
  type OwnerCampaignListResult,
  type OwnerCampaignResult,
  type OwnerSessionContext,
  type OwnerTaskPreviewResult,
  type OwnerTaskPreviewSuggestion,
  type OwnerTaskResult,
  type ProjectOwnerCampaignApiBridge,
} from "../../../api/projectOwnerCampaignApiBridge";
import type { TaskTemplateCatalogApiBridge } from "../../../api/taskTemplateCatalogApiBridge";
import {
  backendRuntimeReadinessApiBoundary,
  createBackendRuntimeReadinessApiLoadingState,
  loadBackendRuntimeReadinessApiBridgeState,
  seededBackendRuntimePersistencePosture,
  seededBackendRuntimeReadinessSummary,
  type BackendRuntimeReadinessApiBridgeState,
  type BackendRuntimePersistencePostureStatus,
} from "../../../api/backendRuntimeReadinessApiBridge";
import {
  createPublishDeliveryReviewApiLoadingState,
  createPublishDeliveryReviewApiSeededFallbackState,
  loadPublishDeliveryReviewApiBridgeState,
  type PublishDeliveryReviewApiBridgeState,
} from "../../../api/publishDeliveryReviewApiBridge";
import {
  createPointsRankingLedgerRuntimeApiLoadingState,
  createPointsRankingLedgerRuntimeApiSeededFallbackState,
  loadPointsRankingLedgerRuntimeApiBridgeState,
  type PointsRankingLedgerRuntimeApiBridgeState,
} from "../../../api/pointsRankingLedgerRuntimeApiBridge";
import {
  createObjectStorageExportRuntimeApiLoadingState,
  createObjectStorageExportRuntimeApiSeededFallbackState,
  loadObjectStorageExportRuntimeApiBridgeState,
  type ObjectStorageExportRuntimeApiBridgeState,
} from "../../../api/objectStorageExportRuntimeApiBridge";
import {
  createRepositoryCampaignWorkflowLoadingState,
  createRepositoryCampaignWorkflowSeededFallbackState,
  loadRepositoryCampaignWorkflowBridgeState,
  type RepositoryCampaignWorkflowBridgeState,
} from "../../../api/repositoryCampaignWorkflowApiBridge";
import {
  createAnalyticsIngestionRuntimeApiLoadingState,
  createAnalyticsIngestionRuntimeApiSeededFallbackState,
  loadAnalyticsIngestionRuntimeApiBridgeState,
  type AnalyticsIngestionRuntimeApiBridgeState,
} from "../../../api/analyticsIngestionRuntimeApiBridge";
import {
  createContractWriterRuntimeApiLoadingState,
  createContractWriterRuntimeApiSeededFallbackState,
  loadContractWriterRuntimeApiBridgeState,
  type ContractWriterRuntimeApiBridgeState,
} from "../../../api/contractWriterRuntimeApiBridge";
import {
  createRewardDistributionHandoffRuntimeApiLoadingState,
  createRewardDistributionHandoffRuntimeApiSeededFallbackState,
  loadRewardDistributionHandoffRuntimeApiBridgeState,
  type RewardDistributionHandoffRuntimeApiBridgeState,
} from "../../../api/rewardDistributionHandoffRuntimeApiBridge";
import {
  createProjectOwnerFundingProofReviewBridgeApiLoadingState,
  createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState,
  loadProjectOwnerFundingProofReviewBridgeApiState,
  type ProjectOwnerFundingProofReviewBridgeApiState,
} from "../../../api/projectOwnerFundingProofReviewBridgeApiBridge";
import {
  createProductionDatabaseHandoffReadinessApiSeededFallbackState,
  loadProductionDatabaseHandoffReadinessApiState,
  type ProductionDatabaseHandoffReadinessApiState,
} from "../../../api/productionDatabaseHandoffReadinessApiBridge";
import {
  createExportArtifactDeliveryApiLoadingState,
  createExportArtifactDeliverySeededFallbackState,
  sanitizeExportArtifactDeliveryApiText,
  submitExportArtifactDeliveryApiReview,
  type ExportArtifactDeliveryApiBridgeState,
  type ExportArtifactDeliveryApiSource,
  type ExportArtifactDeliveryApiStatus,
  type ExportArtifactDeliveryRequest,
} from "../../../api/exportArtifactDeliveryApiBridge";
import {
  createAiContentPackWorkbench,
  createApiSkillContractSurface,
  createCampaignOsLocalService,
  createCampaignTemplatePack,
  campaignDetail,
  createCampaignSettingsReadiness,
  createAwakenSwapLiquidityTaskReadiness,
  createDaippAgentCoinTaskReadiness,
  createEbridgeTaskReadiness,
  createForestNftTaskReadiness,
  createSchrodingerNftTaskReadiness,
  createForecastCampaignTaskReadiness,
  createPayCampaignTaskReadiness,
  createTmrwdaoGovernanceTaskReadiness,
  createLocaleAnalyticsReadiness,
  createLocalCampaignDraft,
  createParticipantOperationsReadModel,
  createPostCampaignCloseout,
  createProjectCampaignCommandCenter,
  createLiveWalletConnectorBoundary,
  createStateComponentsDeliveryGallery,
  createVerificationCoverageSummary,
  createVerificationRulesWorkspace,
  generateLocalAiDraftOutline,
  getLocalizedText,
  seededCampaignDraft,
  taskTemplateLibrary,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type AiContentReleaseActionState,
  type AiOpsKpiReadiness,
  type AelfWebLoginAdapterLiveEvidenceStatus,
  type AelfWebLoginAdapterReadiness,
  type AdvancedAnalyticsReadinessState,
  type ApiUsagePrerequisiteState,
  type ApiUsageReadinessState,
  type ApiSkillContractReadiness,
  type BuilderCreationMode,
  type CampaignObjective,
  type CampaignTemplatePreset,
  type CampaignLifecycleOperation,
  type CampaignLifecycleOperationState,
  type CampaignLifecycleStatus,
  type CampaignTemplateReadiness,
  type CampaignShellDetail,
  type CampaignSettingsReadinessState,
  type ExportReadinessState,
  type AwakenSwapLiquidityTaskOwnerRole,
  type AwakenSwapLiquidityTaskProviderState,
  type AwakenSwapLiquidityTaskReadinessState,
  type DaippAgentCoinTaskOwnerRole,
  type DaippAgentCoinTaskProviderState,
  type DaippAgentCoinTaskReadinessState,
  type EbridgeTaskOwnerRole,
  type EbridgeTaskProviderState,
  type EbridgeTaskReadinessState,
  type ForestNftTaskOwnerRole,
  type ForestNftTaskProviderState,
  type ForestNftTaskReadinessState,
  type SchrodingerNftTaskOwnerRole,
  type SchrodingerNftTaskProviderState,
  type SchrodingerNftTaskReadinessState,
  type ForecastCampaignTaskOwnerRole,
  type ForecastCampaignTaskProviderState,
  type ForecastCampaignTaskReadinessState,
  type PayCampaignTaskOwnerRole,
  type PayCampaignTaskProviderState,
  type PayCampaignTaskReadinessState,
  type TmrwdaoGovernanceTaskOwnerRole,
  type TmrwdaoGovernanceTaskProviderState,
  type TmrwdaoGovernanceTaskReadinessState,
  type LaunchConsoleBundleOwnerRole,
  type LaunchConsoleBundleStage,
  type LaunchConsoleBundleStatus,
  type LaunchConsoleGateState,
  type LaunchConsoleHandoffReviewState,
  type LaunchConsoleTaskCategory,
  type LocaleStatus,
  type LocalizedText,
  type LiveWalletConnectorLiveEvidenceStatus,
  type LiveWalletConnectorReadiness,
  type OwnerRole,
  type ParticipantOperationsExportStatus,
  type PointsRankingReferralReadinessState,
  type PostCampaignCloseoutOwnerRole,
  type PostCampaignCloseoutStatus,
  type ProjectPortfolioCommercialOwnerRole,
  type PublishState,
  type StateComponentReadiness,
  type SupportedLocale,
  type VerificationLiveEvidenceStatus,
  type VerificationProviderReadiness,
  type VerificationReleaseImpact,
  type VerificationSeededCoverageStatus,
  type WalletPolicy,
  type NormalizedWalletSession,
  walletPolicyOptions,
} from "../../../domain";
import {
  Badge,
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  ReviewSeverityBadge,
  WalletCompatibilityBadge,
} from "../../badges/Badges";
import { CampaignBuilderPanel } from "./builder/CampaignBuilderPanel";
import { I18nContractReadiness } from "./builder/I18nContractReadiness";
import { PublishGateDecisionCenter } from "./builder/PublishGateDecisionCenter";
import { PublishReadinessPanel } from "./builder/PublishReadinessPanel";
import { RewardsEligibilityBuilder } from "./builder/RewardsEligibilityBuilder";
import { TaskTemplateLibrary } from "./builder/TaskTemplateLibrary";
import type { TaskTemplateCatalogFeatureMode } from "./builder/useTaskTemplateCatalog";
import { BackendRuntimeReadinessPanel } from "./BackendRuntimeReadinessPanel";
import { AnalyticsIngestionRuntimePanel } from "./AnalyticsIngestionRuntimePanel";
import { ContractWriterRuntimePanel } from "./ContractWriterRuntimePanel";
import { ObjectStorageExportRuntimePanel } from "./ObjectStorageExportRuntimePanel";
import { PointsRankingLedgerRuntimePanel } from "./PointsRankingLedgerRuntimePanel";
import { RewardDistributionHandoffRuntimePanel } from "./RewardDistributionHandoffRuntimePanel";
import { ProjectOwnerFundingProofReviewPanel } from "./ProjectOwnerFundingProofReviewPanel";
import { ProductionDatabaseHandoffReadinessPanel } from "./ProductionDatabaseHandoffReadinessPanel";
import { RepositoryCampaignWorkflowPanel } from "./RepositoryCampaignWorkflowPanel";
import {
  canCreateOwnerCampaign,
  createOwnerCampaignAddPendingTargetKey,
  createOwnerCampaignAdoptPendingTargetKey,
  createOwnerCampaignRequestToken,
  createOwnerCampaignWorkflowState,
  createOwnerSessionKey,
  createUnexpectedOwnerCampaignFailure,
  ownerCampaignGeneratePendingTargetKey,
  ownerCampaignCommandsDisabled,
  ownerCampaignRequestTokenMatches,
  ownerCampaignWorkflowReducer,
  type OwnerCampaignBuilderIntentContract,
  type OwnerCampaignRequestOperation,
  type OwnerCampaignRequestToken,
  type OwnerCampaignTaskIntentContract,
  type OwnerCampaignTaskPendingTargetKey,
  type OwnerCampaignWorkflowEvent,
  type OwnerCampaignWorkflowState,
} from "./ownerCampaignWorkflow";
import { projectConsoleCopy } from "./copy";
import { PublishDeliveryReviewPanel } from "./PublishDeliveryReviewPanel";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;
type EditableCampaignLocale = Extract<SupportedLocale, "en-US" | "zh-CN" | "zh-TW">;

interface DraftComposerState {
  aiPrompt: string;
  aiReviewedByHuman: boolean;
  campaignName: string;
  creationMode: BuilderCreationMode;
  endDate: string;
  objective: CampaignObjective;
  projectName: string;
  selectedTaskTemplateIds: string[];
  startDate: string;
  supportedLocales: EditableCampaignLocale[];
  targetUsers: string;
  walletPolicy: WalletPolicy;
}

export interface ProjectConsoleProps {
  locale: BusinessContentLocale;
  campaign?: CampaignShellDetail;
  activeCampaignId?: string | null;
  activeWorkspace?: ProjectWorkspaceKey;
  onActiveCampaignIdChange?: (campaignId: string | null) => void;
  onOwnerReconnect?: () => void;
  onWorkspaceChange?: (workspace: ProjectWorkspaceKey) => void;
  ownerCampaignBridge?: ProjectOwnerCampaignApiBridge;
  ownerSession?: NormalizedWalletSession | null;
  ownerSessionReady?: boolean;
  projectId?: string;
  stageReviewMode?: boolean;
  taskTemplateCatalogBridge?: TaskTemplateCatalogApiBridge;
  taskTemplateCatalogMode?: TaskTemplateCatalogFeatureMode;
  taskTemplateCatalogSessionKey?: string | null;
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 16,
  maxWidth: "100%",
  minWidth: 0,
  padding: 18,
};

const headingRowStyle: CSSProperties = {
  alignItems: "start",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 6,
  minWidth: 0,
  minHeight: 104,
  padding: 14,
};

const statLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const statValueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.1,
  margin: 0,
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  minWidth: 0,
};

const compactSectionGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  minWidth: 0,
};

const builderDetailsStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const workflowStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  minHeight: 172,
  padding: 16,
};

const actionButtonStyle: CSSProperties = {
  alignSelf: "end",
  background: "#071426",
  border: "1px solid #071426",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 38,
  padding: "0 12px",
  width: "fit-content",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
};

const listItemStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
  listStyle: "none",
};

const compactListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  margin: 0,
  padding: 0,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  width: "100%",
};

const chipStyle: CSSProperties = {
  background: "#eef6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  listStyle: "none",
  padding: "6px 8px",
  wordBreak: "break-word",
};

const boundaryStyle: CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  color: "#9a3412",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
};

const wrapTextStyle: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const formControlStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #b8c7da",
  borderRadius: 8,
  boxSizing: "border-box",
  color: "#071426",
  fontSize: 14,
  fontWeight: 700,
  minHeight: 40,
  padding: "8px 10px",
  width: "100%",
};

const textareaStyle: CSSProperties = {
  ...formControlStyle,
  fontFamily: "inherit",
  lineHeight: 1.45,
  minHeight: 116,
  resize: "vertical",
};

const fieldStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const controlLabelStyle: CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1.2,
};

const ghostButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#071426",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 38,
  padding: "0 12px",
};

const selectedButtonStyle: CSSProperties = {
  ...ghostButtonStyle,
  background: "#071426",
  border: "1px solid #071426",
  color: "#ffffff",
};

const checkboxRowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  minWidth: 0,
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const editableCampaignLocales = ["en-US", "zh-CN", "zh-TW"] as const satisfies readonly EditableCampaignLocale[];

const toDateInputValue = (value: string) => value.slice(0, 10);

const toUtcDateTime = (value: string) => (value ? `${value}T00:00:00Z` : "");

const createSeededDraftComposerState = (includeSeededTaskTemplates = true): DraftComposerState => ({
  aiPrompt: seededCampaignDraft.aiPrompt.prompt,
  aiReviewedByHuman: seededCampaignDraft.aiPrompt.reviewedByHuman,
  campaignName: seededCampaignDraft.campaignName["en-US"],
  creationMode: seededCampaignDraft.creationMode,
  endDate: toDateInputValue(seededCampaignDraft.timePeriod.endTime),
  objective: seededCampaignDraft.objective,
  projectName: seededCampaignDraft.projectName,
  selectedTaskTemplateIds: includeSeededTaskTemplates
    ? [...seededCampaignDraft.selectedTaskTemplateIds]
    : [],
  startDate: toDateInputValue(seededCampaignDraft.timePeriod.startTime),
  supportedLocales: editableCampaignLocales.filter((supportedLocale) =>
    seededCampaignDraft.supportedLocales.includes(supportedLocale),
  ),
  targetUsers: seededCampaignDraft.targetUsers.join(", "),
  walletPolicy: seededCampaignDraft.walletPolicy,
});

const campaignObjectiveOptions = [
  "acquisition",
  "activation",
  "trading",
  "nft",
  "dao",
  "launch",
] as const satisfies readonly CampaignObjective[];

const commandStatusLabel = (
  status: CampaignShellDetail["status"],
  labels: {
    active: string;
    commandEnded: string;
    commandExported: string;
    commandScheduledDraft: string;
  },
) => {
  const reviewLabels: Partial<Record<CampaignShellDetail["status"], string>> = {
    ai_draft: "AI Draft",
    human_review: "Human Review",
  };

  if (reviewLabels[status]) {
    return reviewLabels[status];
  }

  if (status === "live") {
    return labels.active;
  }

  if (status === "ended") {
    return labels.commandEnded;
  }

  if (status === "exported") {
    return labels.commandExported;
  }

  if (status === "scheduled" || status === "draft") {
    return labels.commandScheduledDraft;
  }

  return status.replace(/_/g, " ");
};

const contractModeLabel = (
  mode: CampaignShellDetail["contractMode"],
  labels: { contractModeOffChain: string },
) => {
  if (mode === "OFF_CHAIN_MVP") {
    return labels.contractModeOffChain;
  }

  return mode.replace(/_/g, " ");
};

const reviewStatusLabel = (
  status: string | undefined,
  labels: { approved: string; open: string },
) => {
  if (status === "approved") {
    return labels.approved;
  }

  if (status === "open") {
    return labels.open;
  }

  return status?.replace(/_/g, " ") ?? labels.open;
};

const localeStatusLabel = (
  status: LocaleStatus,
  labels: { aiDraft: string; fallback: string; published: string; reviewed: string },
) => {
  if (status === "ai_draft") {
    return labels.aiDraft;
  }

  if (status === "reviewed") {
    return labels.reviewed;
  }

  if (status === "fallback") {
    return labels.fallback;
  }

  return labels.published;
};

const campaignTemplateReadinessLabel = (
  readiness: CampaignTemplateReadiness,
  labels: {
    campaignTemplatePackReady: string;
    campaignTemplatePackReviewRequired: string;
  },
) => readiness === "ready" ? labels.campaignTemplatePackReady : labels.campaignTemplatePackReviewRequired;

const campaignTemplateReadinessState = (readiness: CampaignTemplateReadiness) =>
  readiness === "ready" ? "ready" : "warning";

const campaignTemplateOwnerLabel = (
  ownerRole: CampaignTemplatePreset["ownerRole"],
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      contract_reviewer: "Contract reviewer",
      internal_operator: "Internal operator",
      project_owner: "Project owner",
    },
    "zh-CN": {
      contract_reviewer: "合约审核人",
      internal_operator: "内部运营",
      project_owner: "项目方",
    },
    "zh-TW": {
      contract_reviewer: "合約審核人",
      internal_operator: "內部營運",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<CampaignTemplatePreset["ownerRole"], string>>;

  return labels[locale][ownerRole];
};

const daippTaskReadinessBadgeState = (
  state: DaippAgentCoinTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const daippTaskReadinessLabel = (
  state: DaippAgentCoinTaskReadinessState,
  labels: {
    daippTaskBlocked: string;
    daippTaskReady: string;
    daippTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.daippTaskReady;
  }

  return state === "review_required"
    ? labels.daippTaskReviewRequired
    : labels.daippTaskBlocked;
};

const daippTaskProviderStateLabel = (
  state: DaippAgentCoinTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<DaippAgentCoinTaskProviderState, string>>;

  return labels[locale][state];
};

const daippTaskOwnerLabel = (
  ownerRole: DaippAgentCoinTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      content_reviewer: "Content reviewer",
      daipp_provider_reviewer: "daipp provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
    },
    "zh-CN": {
      content_reviewer: "内容审核人",
      daipp_provider_reviewer: "daipp provider 审核人",
      operator: "运营",
      project_owner: "项目方",
    },
    "zh-TW": {
      content_reviewer: "內容審核人",
      daipp_provider_reviewer: "daipp provider 審核人",
      operator: "營運",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<DaippAgentCoinTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const forestTaskReadinessBadgeState = (
  state: ForestNftTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const forestTaskReadinessLabel = (
  state: ForestNftTaskReadinessState,
  labels: {
    forestTaskBlocked: string;
    forestTaskReady: string;
    forestTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.forestTaskReady;
  }

  return state === "review_required"
    ? labels.forestTaskReviewRequired
    : labels.forestTaskBlocked;
};

const forestTaskProviderStateLabel = (
  state: ForestNftTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<ForestNftTaskProviderState, string>>;

  return labels[locale][state];
};

const forestTaskOwnerLabel = (
  ownerRole: ForestNftTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      forest_provider_reviewer: "Forest provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
    },
    "zh-CN": {
      forest_provider_reviewer: "Forest provider 审核人",
      operator: "运营",
      project_owner: "项目方",
    },
    "zh-TW": {
      forest_provider_reviewer: "Forest provider 審核人",
      operator: "營運",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<ForestNftTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const ebridgeTaskReadinessBadgeState = (
  state: EbridgeTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const ebridgeTaskReadinessLabel = (
  state: EbridgeTaskReadinessState,
  labels: {
    ebridgeTaskBlocked: string;
    ebridgeTaskReady: string;
    ebridgeTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.ebridgeTaskReady;
  }

  return state === "review_required"
    ? labels.ebridgeTaskReviewRequired
    : labels.ebridgeTaskBlocked;
};

const ebridgeTaskProviderStateLabel = (
  state: EbridgeTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<EbridgeTaskProviderState, string>>;

  return labels[locale][state];
};

const ebridgeTaskOwnerLabel = (
  ownerRole: EbridgeTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      bridge_provider_reviewer: "Bridge provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
      risk_reviewer: "Risk reviewer",
    },
    "zh-CN": {
      bridge_provider_reviewer: "Bridge provider 审核人",
      operator: "运营",
      project_owner: "项目方",
      risk_reviewer: "风险审核人",
    },
    "zh-TW": {
      bridge_provider_reviewer: "Bridge provider 審核人",
      operator: "營運",
      project_owner: "專案方",
      risk_reviewer: "風險審核人",
    },
  } satisfies Record<BusinessContentLocale, Record<EbridgeTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const awakenTaskReadinessBadgeState = (
  state: AwakenSwapLiquidityTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const awakenTaskReadinessLabel = (
  state: AwakenSwapLiquidityTaskReadinessState,
  labels: {
    awakenTaskBlocked: string;
    awakenTaskReady: string;
    awakenTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.awakenTaskReady;
  }

  return state === "review_required"
    ? labels.awakenTaskReviewRequired
    : labels.awakenTaskBlocked;
};

const awakenTaskProviderStateLabel = (
  state: AwakenSwapLiquidityTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<AwakenSwapLiquidityTaskProviderState, string>>;

  return labels[locale][state];
};

const awakenTaskOwnerLabel = (
  ownerRole: AwakenSwapLiquidityTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      awaken_provider_reviewer: "Awaken provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
      risk_reviewer: "Risk reviewer",
    },
    "zh-CN": {
      awaken_provider_reviewer: "Awaken provider 审核人",
      operator: "运营",
      project_owner: "项目方",
      risk_reviewer: "风险审核人",
    },
    "zh-TW": {
      awaken_provider_reviewer: "Awaken provider 審核人",
      operator: "營運",
      project_owner: "專案方",
      risk_reviewer: "風險審核人",
    },
  } satisfies Record<BusinessContentLocale, Record<AwakenSwapLiquidityTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const schrodingerTaskReadinessBadgeState = (
  state: SchrodingerNftTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const schrodingerTaskReadinessLabel = (
  state: SchrodingerNftTaskReadinessState,
  labels: {
    schrodingerTaskBlocked: string;
    schrodingerTaskReady: string;
    schrodingerTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.schrodingerTaskReady;
  }

  return state === "review_required"
    ? labels.schrodingerTaskReviewRequired
    : labels.schrodingerTaskBlocked;
};

const schrodingerTaskProviderStateLabel = (
  state: SchrodingerNftTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<SchrodingerNftTaskProviderState, string>>;

  return labels[locale][state];
};

const schrodingerTaskOwnerLabel = (
  ownerRole: SchrodingerNftTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      operator: "Operator",
      project_owner: "Project owner",
      schrodinger_provider_reviewer: "Schrödinger provider reviewer",
    },
    "zh-CN": {
      operator: "运营",
      project_owner: "项目方",
      schrodinger_provider_reviewer: "Schrödinger provider 审核人",
    },
    "zh-TW": {
      operator: "營運",
      project_owner: "專案方",
      schrodinger_provider_reviewer: "Schrödinger provider 審核人",
    },
  } satisfies Record<BusinessContentLocale, Record<SchrodingerNftTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const forecastTaskReadinessBadgeState = (
  state: ForecastCampaignTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const forecastTaskReadinessLabel = (
  state: ForecastCampaignTaskReadinessState,
  labels: {
    forecastTaskBlocked: string;
    forecastTaskReady: string;
    forecastTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.forecastTaskReady;
  }

  return state === "review_required"
    ? labels.forecastTaskReviewRequired
    : labels.forecastTaskBlocked;
};

const forecastTaskProviderStateLabel = (
  state: ForecastCampaignTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      not_connected: "Not connected",
      ready: "Ready",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      not_connected: "未连接",
      ready: "就绪",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      not_connected: "未連接",
      ready: "就緒",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<ForecastCampaignTaskProviderState, string>>;

  return labels[locale][state];
};

const forecastTaskOwnerLabel = (
  ownerRole: ForecastCampaignTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      forecast_provider_reviewer: "Forecast provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
    },
    "zh-CN": {
      forecast_provider_reviewer: "Forecast provider 审核人",
      operator: "运营",
      project_owner: "项目方",
    },
    "zh-TW": {
      forecast_provider_reviewer: "Forecast provider 審核人",
      operator: "營運",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<ForecastCampaignTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const payTaskReadinessBadgeState = (
  state: PayCampaignTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const payTaskReadinessLabel = (
  state: PayCampaignTaskReadinessState,
  labels: {
    payTaskBlocked: string;
    payTaskReady: string;
    payTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.payTaskReady;
  }

  return state === "review_required"
    ? labels.payTaskReviewRequired
    : labels.payTaskBlocked;
};

const payTaskProviderStateLabel = (
  state: PayCampaignTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<PayCampaignTaskProviderState, string>>;

  return labels[locale][state];
};

const payTaskOwnerLabel = (
  ownerRole: PayCampaignTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      operator: "Operator",
      pay_provider_reviewer: "Pay provider reviewer",
      project_owner: "Project owner",
    },
    "zh-CN": {
      operator: "运营",
      pay_provider_reviewer: "Pay provider 审核人",
      project_owner: "项目方",
    },
    "zh-TW": {
      operator: "營運",
      pay_provider_reviewer: "Pay provider 審核人",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<PayCampaignTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const tmrwdaoTaskReadinessBadgeState = (
  state: TmrwdaoGovernanceTaskReadinessState,
) => state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const tmrwdaoTaskReadinessLabel = (
  state: TmrwdaoGovernanceTaskReadinessState,
  labels: {
    tmrwdaoTaskBlocked: string;
    tmrwdaoTaskReady: string;
    tmrwdaoTaskReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.tmrwdaoTaskReady;
  }

  return state === "review_required"
    ? labels.tmrwdaoTaskReviewRequired
    : labels.tmrwdaoTaskBlocked;
};

const tmrwdaoTaskProviderStateLabel = (
  state: TmrwdaoGovernanceTaskProviderState,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      blocked: "Blocked",
      not_connected: "Not connected",
      review_required: "Review required",
      seeded_preview: "Seeded preview",
    },
    "zh-CN": {
      blocked: "阻断",
      not_connected: "未连接",
      review_required: "需要审核",
      seeded_preview: "Seeded 预览",
    },
    "zh-TW": {
      blocked: "阻斷",
      not_connected: "未連接",
      review_required: "需要審核",
      seeded_preview: "Seeded 預覽",
    },
  } satisfies Record<BusinessContentLocale, Record<TmrwdaoGovernanceTaskProviderState, string>>;

  return labels[locale][state];
};

const tmrwdaoTaskOwnerLabel = (
  ownerRole: TmrwdaoGovernanceTaskOwnerRole,
  locale: BusinessContentLocale,
) => {
  const labels = {
    "en-US": {
      dao_provider_reviewer: "DAO provider reviewer",
      operator: "Operator",
      project_owner: "Project owner",
    },
    "zh-CN": {
      dao_provider_reviewer: "DAO provider 审核人",
      operator: "运营",
      project_owner: "项目方",
    },
    "zh-TW": {
      dao_provider_reviewer: "DAO provider 審核人",
      operator: "營運",
      project_owner: "專案方",
    },
  } satisfies Record<BusinessContentLocale, Record<TmrwdaoGovernanceTaskOwnerRole, string>>;

  return labels[locale][ownerRole];
};

const readinessState = (readiness: ApiSkillContractReadiness) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const advancedAnalyticsReadinessState = (readiness: AdvancedAnalyticsReadinessState) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const readinessLabel = (
  readiness: ApiSkillContractReadiness,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessLocalOnly: string;
    apiSkillReadinessReady: string;
    apiSkillReadinessReviewRequired: string;
  },
) => {
  if (readiness === "ready") {
    return labels.apiSkillReadinessReady;
  }

  if (readiness === "local_only") {
    return labels.apiSkillReadinessLocalOnly;
  }

  return readiness === "review_required"
    ? labels.apiSkillReadinessReviewRequired
    : labels.apiSkillReadinessBlocked;
};

const advancedAnalyticsReadinessLabel = (
  readiness: AdvancedAnalyticsReadinessState,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessLocalOnly: string;
    apiSkillReadinessReady: string;
    apiSkillReadinessReviewRequired: string;
  },
) => readinessLabel(readiness, labels);

const apiUsageReadinessBadgeState = (readiness: ApiUsageReadinessState) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "local_ready" ? "ready" : "warning";
};

const apiUsagePrerequisiteBadgeState = (state: ApiUsagePrerequisiteState) => {
  if (state === "blocked") {
    return "blocker";
  }

  return state === "local_ready" ? "ready" : "warning";
};

const apiUsageReadinessLabel = (
  readiness: ApiUsageReadinessState,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessReviewRequired: string;
    apiUsageLocalReady: string;
  },
) => {
  if (readiness === "local_ready") {
    return labels.apiUsageLocalReady;
  }

  return readiness === "review_required"
    ? labels.apiSkillReadinessReviewRequired
    : labels.apiSkillReadinessBlocked;
};

const apiUsagePrerequisiteLabel = (
  state: ApiUsagePrerequisiteState,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessReviewRequired: string;
    apiUsageLocalReady: string;
    apiUsageNotStarted: string;
  },
) => {
  if (state === "local_ready") {
    return labels.apiUsageLocalReady;
  }

  return state === "not_started"
    ? labels.apiUsageNotStarted
    : state === "review_required"
      ? labels.apiSkillReadinessReviewRequired
      : labels.apiSkillReadinessBlocked;
};

const serviceApiGroupLabel = (group: string) => {
  if (group === "task_verification") {
    return "task verification";
  }

  if (group === "content_generation") {
    return "content";
  }

  if (group === "campaign_summary") {
    return "summary";
  }

  if (group === "wallet_session") {
    return "wallet session";
  }

  return group.replace(/_/g, " ");
};

const serviceFieldGroupLabel = (group: string) => {
  if (group === "wallet") {
    return "wallet field";
  }

  return group;
};

const readableCode = (value: string) => value.replace(/_/g, " ");

const exportArtifactDeliveryApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const backendRuntimeReadinessApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const publishDeliveryReviewApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const pointsRankingLedgerRuntimeApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const objectStorageExportRuntimeApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const repositoryCampaignWorkflowApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const analyticsIngestionRuntimeApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const contractWriterRuntimeApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const rewardDistributionHandoffRuntimeApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const projectOwnerFundingProofReviewApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const productionDatabaseHandoffReadinessApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const createPublishDeliveryReviewSeededFallbackState = (
  campaignId: string,
): PublishDeliveryReviewApiBridgeState => ({
  ...createPublishDeliveryReviewApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local publish delivery review API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 publish delivery review API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 publish delivery review API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createPointsRankingLedgerRuntimeSeededFallbackState = (
  campaignId: string,
): PointsRankingLedgerRuntimeApiBridgeState => ({
  ...createPointsRankingLedgerRuntimeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local points ranking ledger runtime API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 points ranking ledger runtime API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 points ranking ledger runtime API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createObjectStorageExportRuntimeSeededFallbackState = (
  campaignId: string,
): ObjectStorageExportRuntimeApiBridgeState => ({
  ...createObjectStorageExportRuntimeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local object storage export readiness API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 object storage export readiness API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 object storage export readiness API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createAnalyticsIngestionRuntimeSeededFallbackState = (
  campaignId: string,
): AnalyticsIngestionRuntimeApiBridgeState => ({
  ...createAnalyticsIngestionRuntimeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local analytics ingestion readiness API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 analytics ingestion readiness API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 analytics ingestion readiness API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createContractWriterRuntimeSeededFallbackState = (
  campaignId: string,
): ContractWriterRuntimeApiBridgeState => ({
  ...createContractWriterRuntimeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local contract writer readiness API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 contract writer readiness API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 contract writer readiness API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createRewardDistributionHandoffRuntimeSeededFallbackState = (
  campaignId: string,
): RewardDistributionHandoffRuntimeApiBridgeState => ({
  ...createRewardDistributionHandoffRuntimeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local reward distribution handoff readiness API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地 reward distribution handoff readiness API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地 reward distribution handoff readiness API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createProjectOwnerFundingProofReviewSeededFallbackState = (
  campaignId: string,
): ProjectOwnerFundingProofReviewBridgeApiState => ({
  ...createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState(campaignId),
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local project owner funding proof review API base URL is configured, so seeded review data is shown.",
        "zh-CN": "未配置本地项目方资金证明 review API base URL，因此显示 seeded review 数据。",
        "zh-TW": "未設定本地專案方資金證明 review API base URL，因此顯示 seeded review 資料。",
      },
      severity: "info",
    },
  ],
});

const createProductionDatabaseHandoffReadinessSeededFallbackState =
  (): ProductionDatabaseHandoffReadinessApiState => ({
    ...createProductionDatabaseHandoffReadinessApiSeededFallbackState(),
    diagnostics: [
      {
        code: "API_BASE_URL_MISSING",
        message: {
          "en-US": "No local production database handoff API base URL is configured, so seeded review data is shown.",
          "zh-CN": "未配置本地 production database handoff API base URL，因此显示 seeded review 数据。",
          "zh-TW": "未設定本地 production database handoff API base URL，因此顯示 seeded review 資料。",
        },
        severity: "info",
      },
    ],
  });

const createBackendRuntimeReadinessSeededFallbackState = (): BackendRuntimeReadinessApiBridgeState => ({
  boundary: backendRuntimeReadinessApiBoundary,
  configured: false,
  diagnostics: [
    {
      code: "API_BASE_URL_MISSING",
      message: {
        "en-US": "No local backend readiness API base URL is configured, so seeded readiness is shown.",
        "zh-CN": "未配置本地 backend readiness API base URL，因此显示 seeded readiness。",
        "zh-TW": "未設定本地 backend readiness API base URL，因此顯示 seeded readiness。",
      },
      severity: "info",
    },
  ],
  loading: false,
  persistencePosture: seededBackendRuntimePersistencePosture,
  source: "seeded_fallback",
  status: "fallback",
  summary: seededBackendRuntimeReadinessSummary,
});

const publishDeliveryReviewStateWithBackendReleaseScope = (
  publishState: PublishDeliveryReviewApiBridgeState,
  backendState: BackendRuntimeReadinessApiBridgeState,
): PublishDeliveryReviewApiBridgeState => {
  if (publishState.source !== "api_runtime" || backendState.source !== "api_runtime") {
    return publishState;
  }

  const backendSummary = backendState.summary;
  const publishReleaseScope = publishState.releaseScopeSummary;
  const shouldUseBackendFutureScope = publishReleaseScope.futureProductionBlockerIds.length === 0
    && backendSummary.futureProductionBlockerIds.length > 0;
  const shouldUseBackendMvpScope = publishReleaseScope.mvpReleaseBlockerIds.length === 0
    && publishReleaseScope.mvpReleaseReady !== backendSummary.mvpReleaseReady;

  if (!shouldUseBackendFutureScope && !shouldUseBackendMvpScope) {
    return publishState;
  }

  return {
    ...publishState,
    releaseScopeSummary: {
      ...publishReleaseScope,
      futureProductionBlockerCount: shouldUseBackendFutureScope
        ? backendSummary.futureProductionBlockerIds.length
        : publishReleaseScope.futureProductionBlockerCount,
      futureProductionBlockerIds: shouldUseBackendFutureScope
        ? [...backendSummary.futureProductionBlockerIds]
        : publishReleaseScope.futureProductionBlockerIds,
      mvpReleaseBlockerCount: shouldUseBackendMvpScope
        ? backendSummary.mvpReleaseBlockerIds.length
        : publishReleaseScope.mvpReleaseBlockerCount,
      mvpReleaseBlockerIds: shouldUseBackendMvpScope
        ? [...backendSummary.mvpReleaseBlockerIds]
        : publishReleaseScope.mvpReleaseBlockerIds,
      mvpReleaseReady: shouldUseBackendMvpScope
        ? backendSummary.mvpReleaseReady && backendSummary.mvpReleaseBlockerIds.length === 0
        : publishReleaseScope.mvpReleaseReady,
      productionBlockerCount: Math.max(
        publishReleaseScope.productionBlockerCount,
        backendSummary.productionDependencyBlockers.length,
      ),
    },
  };
};

const persistencePostureBadgeState = (
  status: BackendRuntimePersistencePostureStatus,
): "blocker" | "ready" | "warning" => {
  if (status === "durable_local") {
    return "ready";
  }

  return status === "unavailable" ? "blocker" : "warning";
};

const BackendRuntimePersistencePostureSurface = ({
  locale,
  state,
}: {
  locale: BusinessContentLocale;
  state: BackendRuntimeReadinessApiBridgeState;
}) => {
  const posture = state.persistencePosture ?? seededBackendRuntimePersistencePosture;
  const latestRecords = posture.latestRecords.length > 0
    ? posture.latestRecords
    : [{ kind: "No persisted review records" }];
  const disabledBoundaries = [
    "No production database",
    "No migration runner",
    "No object storage",
    "No wallet signing",
    "No contract write",
    "No queues or schedulers",
    "No reward custody",
    "No reward distribution",
  ];

  return (
    <section aria-label="Backend Runtime Persistence review" style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>Persistence posture</p>
          <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
            Backend Runtime Persistence
          </h3>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(posture.statusLabel, locale)}
          </p>
        </div>
        <PublishStateBadge
          label={getLocalizedText(posture.statusLabel, locale)}
          state={persistencePostureBadgeState(posture.status)}
        />
      </div>

      <div aria-label="Backend Runtime Persistence summary" style={gridStyle}>
        {[
          {
            detail: posture.status === "durable_local"
              ? "Records survive local API runtime restart"
              : getLocalizedText(posture.nextAction, locale),
            label: "Mode",
            value: posture.mode,
          },
          {
            detail: "Local review records visible through /api/health",
            label: "Review records",
            value: String(posture.recordCount),
          },
          {
            detail: "Adapter label is path-redacted before rendering",
            label: "Adapter",
            value: posture.adapterLabel ?? "not configured",
          },
          {
            detail: `API source: ${state.source}`,
            label: "Durability",
            value: posture.safety.durable ? "durable local" : "memory only",
          },
        ].map((stat) => (
          <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{stat.label}</p>
            <p style={{ ...statValueStyle, fontSize: 20, overflowWrap: "anywhere" }}>{stat.value}</p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
              {stat.detail}
            </p>
          </article>
        ))}
      </div>

      <div style={sectionGridStyle}>
        <article style={{ ...workflowStyle, minHeight: 0 }}>
          <h4 style={{ fontSize: 18, margin: 0 }}>Latest safe records</h4>
          <ul style={compactListStyle}>
            {latestRecords.map((record, index) => (
              <li
                key={`${record.kind}-${record.routeId ?? "none"}-${record.traceId ?? index}`}
                style={chipStyle}
              >
                {[record.kind, record.routeId, record.traceId].filter(Boolean).join(" / ")}
              </li>
            ))}
          </ul>
        </article>

        <article style={{ ...workflowStyle, minHeight: 0 }}>
          <h4 style={{ fontSize: 18, margin: 0 }}>Disabled production boundaries</h4>
          <ul style={compactListStyle}>
            {disabledBoundaries.map((boundary) => (
              <li key={boundary} style={chipStyle}>
                {boundary}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div style={boundaryStyle}>
        <p style={{ margin: 0 }}>{getLocalizedText(posture.nextAction, locale)}</p>
        <p style={{ margin: "8px 0 0" }}>
          Diagnostic codes: {posture.diagnosticCodes.length > 0 ? posture.diagnosticCodes.join(", ") : "none"}
        </p>
      </div>
    </section>
  );
};

const exportDeliveryApiSourceLabel = (
  source: ExportArtifactDeliveryApiSource,
  copy: typeof projectConsoleCopy["en-US"],
) => {
  const labels: Record<ExportArtifactDeliveryApiSource, string> = {
    api_runtime: copy.exportDeliveryApiSourceApiRuntime,
    error_fallback: copy.exportDeliveryApiSourceErrorFallback,
    loading: copy.exportDeliveryApiSourceLoading,
    seeded_fallback: copy.exportDeliveryApiSourceSeededFallback,
  };

  return labels[source];
};

const exportDeliveryApiStatusLabel = (
  status: ExportArtifactDeliveryApiStatus,
  copy: typeof projectConsoleCopy["en-US"],
) => {
  const labels: Record<ExportArtifactDeliveryApiStatus, string> = {
    blocked: copy.exportDeliveryApiStatusBlocked,
    delivered: copy.exportDeliveryApiStatusDelivered,
    error: copy.exportDeliveryApiStatusError,
    expired: copy.exportDeliveryApiStatusExpired,
    fallback: copy.exportDeliveryApiStatusFallback,
    loading: copy.exportDeliveryApiStatusLoading,
    partial: copy.exportDeliveryApiStatusPartial,
  };

  return labels[status];
};

const exportDeliveryApiBadgeState = (
  status: ExportArtifactDeliveryApiStatus,
): "blocker" | "ready" | "warning" =>
  status === "delivered" ? "ready" : status === "error" || status === "blocked" ? "blocker" : "warning";

const exportReadinessBadgeState = (readiness: ExportReadinessState) =>
  readiness === "blocked" ? "blocker" : readiness === "review_required" ? "warning" : "ready";

const lifecycleOperationStateBadgeState = (state: CampaignLifecycleOperationState) => {
  if (state === "blocked") {
    return "blocker";
  }

  return state === "review_required" || state === "not_applicable" ? "warning" : "ready";
};

const lifecycleOperationStateLabel = (
  state: CampaignLifecycleOperationState,
  labels: {
    lifecycleAllowed: string;
    lifecycleBlocked: string;
    lifecycleNotApplicable: string;
    lifecycleReviewRequired: string;
  },
) => {
  const stateLabels: Record<CampaignLifecycleOperationState, string> = {
    allowed: labels.lifecycleAllowed,
    blocked: labels.lifecycleBlocked,
    not_applicable: labels.lifecycleNotApplicable,
    review_required: labels.lifecycleReviewRequired,
  };

  return stateLabels[state];
};

const lifecycleStatusLabel = (status: CampaignLifecycleStatus) => {
  const labels: Record<CampaignLifecycleStatus, string> = {
    archived: "Archived",
    ai_draft: "AI Draft",
    draft: "Draft",
    ended: "Ended",
    exported: "Exported",
    human_review: "Human Review",
    live: "Live",
    paused: "Paused",
    scheduled: "Scheduled",
  };

  return labels[status];
};

const lifecycleOwnerLabel = (ownerRole: CampaignLifecycleOperation["ownerRole"]) =>
  ownerRole.replace(/_/g, " ");

const launchConsoleStatusBadgeState = (
  status: LaunchConsoleBundleStatus | LaunchConsoleGateState | LaunchConsoleHandoffReviewState,
) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" || status === "passed" ? "ready" : "warning";
};

const launchConsoleStatusLabel = (
  status: LaunchConsoleBundleStatus | LaunchConsoleGateState | LaunchConsoleHandoffReviewState,
  labels: {
    launchConsoleBlocked: string;
    launchConsoleLocalOnly: string;
    launchConsoleReady: string;
    launchConsoleReviewRequired: string;
    warning: string;
  },
) => {
  if (status === "ready" || status === "passed") {
    return labels.launchConsoleReady;
  }

  if (status === "local_only") {
    return labels.launchConsoleLocalOnly;
  }

  if (status === "review_required") {
    return labels.launchConsoleReviewRequired;
  }

  return status === "warning" ? labels.warning : labels.launchConsoleBlocked;
};

const launchConsoleStageLabel = (stage: LaunchConsoleBundleStage) =>
  stage.replace(/_/g, " ");

const launchConsoleOwnerLabel = (ownerRole: LaunchConsoleBundleOwnerRole) =>
  ownerRole.replace(/_/g, " ");

const portfolioOwnerLabel = (ownerRole: ProjectPortfolioCommercialOwnerRole) =>
  ownerRole.replace(/_/g, " ");

const settingsOwnerLabel = (ownerRole: OwnerRole) =>
  ownerRole.replace(/_/g, " ");

const closeoutOwnerLabel = (ownerRole: PostCampaignCloseoutOwnerRole) =>
  ownerRole.replace(/_/g, " ");

const closeoutStatusBadgeState = (status: PostCampaignCloseoutStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const closeoutStatusLabel = (
  status: PostCampaignCloseoutStatus,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessLocalOnly: string;
    apiSkillReadinessReady: string;
    apiSkillReadinessReviewRequired: string;
  },
) => {
  if (status === "ready") {
    return labels.apiSkillReadinessReady;
  }

  if (status === "local_only") {
    return labels.apiSkillReadinessLocalOnly;
  }

  return status === "review_required"
    ? labels.apiSkillReadinessReviewRequired
    : labels.apiSkillReadinessBlocked;
};

const publishStateLabel = (
  state: PublishState,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessReady: string;
    apiSkillReadinessReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.apiSkillReadinessReady;
  }

  return state === "warning"
    ? labels.apiSkillReadinessReviewRequired
    : labels.apiSkillReadinessBlocked;
};

const launchConsoleTaskCategoryLabel = (
  category: LaunchConsoleTaskCategory,
  labels: {
    launchConsoleTaskCategoryContentAnalytics: string;
    launchConsoleTaskCategoryOnChainApi: string;
    launchConsoleTaskCategorySocialManual: string;
    launchConsoleTaskCategoryWallet: string;
  },
) => {
  const categoryLabels: Record<LaunchConsoleTaskCategory, string> = {
    content_analytics: labels.launchConsoleTaskCategoryContentAnalytics,
    on_chain_api: labels.launchConsoleTaskCategoryOnChainApi,
    social_manual: labels.launchConsoleTaskCategorySocialManual,
    wallet: labels.launchConsoleTaskCategoryWallet,
  };

  return categoryLabels[category];
};

const pipelineSeededCoverageState = (status: VerificationSeededCoverageStatus) =>
  status === "ready" ? "ready" : "blocker";

const pipelineLiveEvidenceState = (status: VerificationLiveEvidenceStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const pipelineProviderState = (readiness: VerificationProviderReadiness) => {
  if (readiness === "blocked" || readiness === "unavailable") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const providerEvidenceRegistryState = (readiness: VerificationProviderReadiness) => {
  if (readiness === "blocked" || readiness === "unavailable") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const walletAdapterReadinessState = (readiness: AelfWebLoginAdapterReadiness) => {
  if (readiness === "blocked" || readiness === "unavailable") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const walletAdapterLiveEvidenceState = (status: AelfWebLoginAdapterLiveEvidenceStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const stageReviewOwnerCreateStyle = `
button[aria-describedby="owner-campaign-create-disabled-reason"]:disabled {
  background: #e2e8f0 !important;
  border: 1px solid #cbd5e1 !important;
  color: #64748b !important;
  opacity: 1 !important;
}
`;

const liveConnectorReadinessState = (readiness: LiveWalletConnectorReadiness) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "approved" ? "ready" : "warning";
};

const liveConnectorEvidenceState = (status: LiveWalletConnectorLiveEvidenceStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const pipelineReleaseImpactState = (impact: VerificationReleaseImpact) => {
  if (impact === "blocker") {
    return "blocker";
  }

  return impact === "needs_review" ? "warning" : "ready";
};

const publishStateBadgeState = (state: PublishState) =>
  state === "blocker" ? "blocker" : state === "warning" ? "warning" : "ready";

const participantExportBadgeState = (status: ParticipantOperationsExportStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "ready" ? "ready" : "warning";
};

const pointsRankingReferralReadinessBadgeState = (
  state: PointsRankingReferralReadinessState,
) => {
  if (state === "blocked") {
    return "blocker";
  }

  return state === "ready" ? "ready" : "warning";
};

const pointsRankingReferralReadinessLabel = (
  state: PointsRankingReferralReadinessState,
  labels: {
    pointsRankingReferralBlocked: string;
    pointsRankingReferralLocalOnly: string;
    pointsRankingReferralReady: string;
    pointsRankingReferralReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.pointsRankingReferralReady;
  }

  if (state === "blocked") {
    return labels.pointsRankingReferralBlocked;
  }

  return state === "local_only"
    ? labels.pointsRankingReferralLocalOnly
    : labels.pointsRankingReferralReviewRequired;
};

const settingsReadinessBadgeState = (state: CampaignSettingsReadinessState) =>
  state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const stateComponentReadinessBadgeState = (state: StateComponentReadiness) =>
  state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const stateComponentReadinessLabel = (
  state: StateComponentReadiness,
  labels: {
    stateReadinessBlocked: string;
    stateReadinessCovered: string;
    stateReadinessReviewRequired: string;
  },
) => {
  if (state === "covered") {
    return labels.stateReadinessCovered;
  }

  return state === "review_required"
    ? labels.stateReadinessReviewRequired
    : labels.stateReadinessBlocked;
};

const aiOpsKpiReadinessState = (state: AiOpsKpiReadiness) =>
  state === "blocked" ? "blocker" : state === "review_required" ? "warning" : "ready";

const aiOpsKpiReadinessLabel = (
  state: AiOpsKpiReadiness,
  labels: {
    aiOpsKpiReadinessBlocked: string;
    aiOpsKpiReadinessReady: string;
    aiOpsKpiReadinessReviewRequired: string;
  },
) => {
  if (state === "ready") {
    return labels.aiOpsKpiReadinessReady;
  }

  return state === "review_required"
    ? labels.aiOpsKpiReadinessReviewRequired
    : labels.aiOpsKpiReadinessBlocked;
};

const aiContentLifecycleState = (lifecycle: AiContentArtifactLifecycle) =>
  lifecycle === "human_approved" || lifecycle === "schedule_intent" || lifecycle === "publish_intent"
    ? "ready"
    : "warning";

const aiContentQualityGateState = (status: AiContentQualityGateStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "warning" ? "warning" : "ready";
};

const aiContentReleaseState = (state: AiContentReleaseActionState) =>
  state === "available" ? "ready" : "warning";

const aiContentLifecycleLabel = (
  lifecycle: AiContentArtifactLifecycle,
  labels: {
    aiContentLifecycleAiDraft: string;
    aiContentLifecycleEdited: string;
    aiContentLifecycleHumanApproved: string;
    aiContentLifecyclePublishIntent: string;
    aiContentLifecycleScheduleIntent: string;
  },
) => {
  if (lifecycle === "ai_draft") {
    return labels.aiContentLifecycleAiDraft;
  }

  if (lifecycle === "edited") {
    return labels.aiContentLifecycleEdited;
  }

  if (lifecycle === "human_approved") {
    return labels.aiContentLifecycleHumanApproved;
  }

  return lifecycle === "schedule_intent"
    ? labels.aiContentLifecycleScheduleIntent
    : labels.aiContentLifecyclePublishIntent;
};

const aiContentReleaseLabel = (
  state: AiContentReleaseActionState,
  readyLabel: string,
  blockedLabel: string,
) => (state === "available" ? readyLabel : blockedLabel);

const serviceCoverageLabels = [
  "wallet coverage",
  "task verification",
  "eligibility",
  "i18n",
  "analytics",
  "export",
  "content",
  "summary",
];

const projectWorkspaceKeys = [
  "campaigns",
  "states",
  "create",
  "templates",
  "participants",
  "aiContent",
  "analytics",
  "export",
  "verificationRules",
  "closeout",
  "settings",
] as const;

export type ProjectWorkspaceKey = (typeof projectWorkspaceKeys)[number];

const stageReviewWorkspaceKeys = [
  "campaigns",
  "create",
  "templates",
] as const satisfies readonly ProjectWorkspaceKey[];

const workspaceShellStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 14,
  maxWidth: "100%",
  minWidth: 0,
  padding: 14,
};

const workspaceNavStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
  minWidth: 0,
};

const workspaceButtonBaseStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #b8c7da",
  borderRadius: 8,
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0,
  lineHeight: 1.2,
  minHeight: 42,
  minWidth: 0,
  padding: "8px 10px",
  textAlign: "center",
  wordBreak: "break-word",
};

const workspaceButtonStyle = (isActive: boolean): CSSProperties =>
  isActive
    ? {
        ...workspaceButtonBaseStyle,
        background: "#071426",
        border: "1px solid #071426",
        color: "#ffffff",
      }
    : workspaceButtonBaseStyle;

const workspaceIntroStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 4,
  minWidth: 0,
  padding: 14,
};

const stepperStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
};

type OwnerApiBridgeResult =
  | OwnerCampaignResult
  | OwnerCampaignListResult
  | OwnerCampaignDetailResult
  | OwnerTaskResult
  | OwnerTaskPreviewResult;

type OwnerCampaignBuilderProps = ComponentProps<typeof CampaignBuilderPanel> & {
  ownerWorkflow: OwnerCampaignBuilderIntentContract;
};

type OwnerTaskTemplateLibraryProps = ComponentProps<typeof TaskTemplateLibrary> & {
  ownerWorkflow: OwnerCampaignTaskIntentContract;
};

const OwnerCampaignBuilderPanel = CampaignBuilderPanel as ComponentType<OwnerCampaignBuilderProps>;
const OwnerTaskTemplateLibrary = TaskTemplateLibrary as ComponentType<OwnerTaskTemplateLibraryProps>;

const ownerCampaignApiBaseUrl = () =>
  import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL as string | undefined;

const ownerCampaignCopy = {
  "en-US": {
    activeCampaign: "Active campaign",
    canonicalTasks: "Canonical campaign tasks",
    create: "Create campaign",
    degraded: "Degraded",
    empty: "No editable campaign",
    error: "Campaign workflow error",
    loadingDetail: "Loading campaign detail",
    mutationPending: "Campaign command pending",
    noSession: "Wallet session required",
    noTasks: "No canonical tasks",
    owner: "Owner",
    ready: "Campaign ready",
    reconnect: "Reconnect wallet",
    recovering: "Recovering campaigns",
    refreshDetail: "Refresh campaign detail",
    region: "Owner campaign workflow",
    retryCreate: "Retry campaign creation",
    retryDetail: "Retry campaign detail",
    retryRecovery: "Retry campaign recovery",
    selectCampaign: (campaignId: string) => `Select campaign ${campaignId}`,
    selectionRequired: "Campaign selection required",
    traceId: "Trace ID",
  },
  "zh-CN": {
    activeCampaign: "当前活动",
    canonicalTasks: "Canonical 活动任务",
    create: "创建活动",
    degraded: "降级",
    empty: "没有可编辑活动",
    error: "活动流程错误",
    loadingDetail: "正在加载活动详情",
    mutationPending: "活动命令执行中",
    noSession: "需要钱包 Session",
    noTasks: "没有 canonical 任务",
    owner: "Owner",
    ready: "活动已就绪",
    reconnect: "重新连接钱包",
    recovering: "正在恢复活动",
    refreshDetail: "刷新活动详情",
    region: "Owner 活动流程",
    retryCreate: "重试创建活动",
    retryDetail: "重试活动详情",
    retryRecovery: "重试活动恢复",
    selectCampaign: (campaignId: string) => `选择活动 ${campaignId}`,
    selectionRequired: "需要选择活动",
    traceId: "Trace ID",
  },
  "zh-TW": {
    activeCampaign: "目前活動",
    canonicalTasks: "Canonical 活動任務",
    create: "建立活動",
    degraded: "降級",
    empty: "沒有可編輯活動",
    error: "活動流程錯誤",
    loadingDetail: "正在載入活動詳情",
    mutationPending: "活動命令執行中",
    noSession: "需要錢包 Session",
    noTasks: "沒有 canonical 任務",
    owner: "Owner",
    ready: "活動已就緒",
    reconnect: "重新連接錢包",
    recovering: "正在恢復活動",
    refreshDetail: "重新整理活動詳情",
    region: "Owner 活動流程",
    retryCreate: "重試建立活動",
    retryDetail: "重試活動詳情",
    retryRecovery: "重試活動恢復",
    selectCampaign: (campaignId: string) => `選擇活動 ${campaignId}`,
    selectionRequired: "需要選擇活動",
    traceId: "Trace ID",
  },
} satisfies Record<BusinessContentLocale, Record<string, string | ((campaignId: string) => string)>>;

const ownerCampaignStatusLabel = (
  state: OwnerCampaignWorkflowState,
  locale: BusinessContentLocale,
) => {
  const labels = ownerCampaignCopy[locale];

  if (state.status === "no_session") {
    return labels.noSession as string;
  }
  if (state.status === "recovering") {
    return labels.recovering as string;
  }
  if (state.status === "empty") {
    return labels.empty as string;
  }
  if (state.status === "selection_required") {
    return labels.selectionRequired as string;
  }
  if (state.status === "creating") {
    return labels.create as string;
  }
  if (state.status === "loading_detail") {
    return labels.loadingDetail as string;
  }
  if (state.status === "ready") {
    return labels.ready as string;
  }
  if (state.status === "mutation_pending") {
    return labels.mutationPending as string;
  }

  return state.status === "degraded"
    ? labels.degraded as string
    : labels.error as string;
};

const ownerProjectId = (
  campaign: CampaignShellDetail,
  configuredProjectId: string | undefined,
) =>
  configuredProjectId?.trim()
  || campaign.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  || campaign.slug;

const ownerCreateInputFromDraft = (
  draft: ReturnType<typeof createLocalCampaignDraft>,
  locale: BusinessContentLocale,
  projectId: string,
): CreateOwnerCampaignInput => ({
  contractMode: "OFF_CHAIN_MVP",
  defaultLocale: draft.defaultLocale,
  duration: `${draft.timePeriod.startTime}/${draft.timePeriod.endTime}`,
  endTime: draft.timePeriod.endTime,
  goal: `${draft.projectName}: ${getLocalizedText(draft.campaignName, locale)} (${draft.objective})`,
  projectId,
  rewardDescription: getLocalizedText(draft.rewardPlan.description, locale),
  startTime: draft.timePeriod.startTime,
  status: "draft",
  supportedLocales: draft.supportedLocales,
  walletPolicy: draft.walletPolicy,
});

interface OwnerCampaignOrchestratorOptions {
  activeCampaignId: string | null;
  bridge: ProjectOwnerCampaignApiBridge;
  onActiveCampaignIdChange?: (campaignId: string | null) => void;
  ownerSession: NormalizedWalletSession | null;
  projectId: string;
}

const useOwnerCampaignOrchestrator = ({
  activeCampaignId,
  bridge,
  onActiveCampaignIdChange,
  ownerSession,
  projectId,
}: OwnerCampaignOrchestratorOptions) => {
  const sessionKey = createOwnerSessionKey(ownerSession);
  const [state, dispatch] = useReducer(
    ownerCampaignWorkflowReducer,
    undefined,
    () => createOwnerCampaignWorkflowState(sessionKey, activeCampaignId),
  );
  const stateRef = useRef(state);
  const sessionRef = useRef(ownerSession);
  const controlledContextRef = useRef({ activeCampaignId, sessionKey });
  const onActiveCampaignIdChangeRef = useRef(onActiveCampaignIdChange);
  const controllersRef = useRef(new Set<AbortController>());
  const mountedRef = useRef(true);

  stateRef.current = state;
  sessionRef.current = ownerSession;
  controlledContextRef.current = { activeCampaignId, sessionKey };
  onActiveCampaignIdChangeRef.current = onActiveCampaignIdChange;

  const abortRequests = useCallback(() => {
    for (const controller of controllersRef.current) {
      controller.abort();
    }
    controllersRef.current.clear();
  }, []);

  const transition = useCallback((event: OwnerCampaignWorkflowEvent) => {
    if (!mountedRef.current) {
      return false;
    }

    const current = stateRef.current;
    const next = ownerCampaignWorkflowReducer(current, event);

    if (next === current) {
      return false;
    }

    stateRef.current = next;
    dispatch(event);
    return true;
  }, []);

  const runRequest = useCallback(async <TResult extends OwnerApiBridgeResult,>(
    operation: OwnerCampaignRequestOperation,
    campaignId: string | null,
    request: (context: OwnerSessionContext) => Promise<TResult>,
    onSuccess: (
      result: Extract<TResult, { ok: true }>,
      token: OwnerCampaignRequestToken,
    ) => void,
    targetKey: OwnerCampaignTaskPendingTargetKey | null = null,
  ) => {
    const session = sessionRef.current;
    const current = stateRef.current;

    if (!session || createOwnerSessionKey(session) !== current.sessionKey) {
      return;
    }

    const token = createOwnerCampaignRequestToken(
      current,
      operation,
      campaignId,
      targetKey,
    );

    if (!transition({ type: "request_started", token })) {
      return;
    }

    const controller = new AbortController();
    controllersRef.current.add(controller);

    await Promise.resolve();

    const requestHasCurrentAuthority = () =>
      controlledContextRef.current.sessionKey === token.sessionKey
      && controlledContextRef.current.activeCampaignId === token.campaignId;

    if (
      controller.signal.aborted
      || !requestHasCurrentAuthority()
      || !ownerCampaignRequestTokenMatches(stateRef.current, token)
    ) {
      controllersRef.current.delete(controller);
      return;
    }

    let result: TResult | OwnerCampaignFailure;

    try {
      result = await request({ session, signal: controller.signal });
    } catch (error) {
      result = createUnexpectedOwnerCampaignFailure(operation, token, error);
    } finally {
      controllersRef.current.delete(controller);
    }

    if (!mountedRef.current || !requestHasCurrentAuthority()) {
      return;
    }

    if (!result.ok) {
      transition({
        type: "request_failed",
        failure: result,
        token,
      });
      return;
    }

    onSuccess(result as Extract<TResult, { ok: true }>, token);
  }, [transition]);

  const recoverCampaigns = useCallback(() => {
    void runRequest<OwnerCampaignListResult>(
      "recover",
      null,
      (context) => bridge.recoverCampaigns(projectId, context),
      (result, token) => {
        if (transition({
          type: "recovery_succeeded",
          campaigns: result.campaigns,
          token,
        }) && result.campaigns.length === 1) {
          onActiveCampaignIdChangeRef.current?.(result.campaigns[0].id);
        }
      },
    );
  }, [bridge, projectId, runRequest, transition]);

  const refreshCampaignDetail = useCallback((campaignId: string) => {
    void runRequest<OwnerCampaignDetailResult>(
      "detail",
      campaignId,
      (context) => bridge.getCampaignDetail(campaignId, context),
      (result, token) => {
        transition({ type: "detail_succeeded", result, token });
      },
    );
  }, [bridge, runRequest, transition]);

  const createCampaign = useCallback((input: CreateOwnerCampaignInput) => {
    void runRequest<OwnerCampaignResult>(
      "create",
      null,
      (context) => bridge.createCampaign(input, context),
      (result, token) => {
        if (
          transition({ type: "create_succeeded", result, token })
          && stateRef.current.activeCampaignId === result.campaignId
          && stateRef.current.status === "loading_detail"
        ) {
          onActiveCampaignIdChangeRef.current?.(result.campaignId);
        }
      },
    );
  }, [bridge, runRequest, transition]);

  const generateTaskPreview = useCallback((input: GenerateOwnerTaskPreviewInput) => {
    const campaignId = stateRef.current.activeCampaignId;

    if (!campaignId) {
      return;
    }

    void runRequest<OwnerTaskPreviewResult>(
      "preview",
      campaignId,
      (context) => bridge.generateTaskPreview(campaignId, input, context),
      (result, token) => {
        transition({ type: "preview_succeeded", result, token });
      },
      ownerCampaignGeneratePendingTargetKey,
    );
  }, [bridge, runRequest, transition]);

  const mutateTask = useCallback((
    operation: Extract<OwnerCampaignRequestOperation, "add" | "adopt">,
    input: AddOwnerCampaignTaskInput,
    targetKey: OwnerCampaignTaskPendingTargetKey,
  ) => {
    const campaignId = stateRef.current.activeCampaignId;

    if (!campaignId) {
      return;
    }

    void runRequest<OwnerTaskResult>(
      operation,
      campaignId,
      (context) => bridge.addTask(campaignId, input, context),
      (result, token) => {
        if (
          transition({ type: "mutation_succeeded", result, token })
          && stateRef.current.expectedTaskId === result.taskId
          && stateRef.current.status === "loading_detail"
        ) {
          refreshCampaignDetail(campaignId);
        }
      },
      targetKey,
    );
  }, [bridge, refreshCampaignDetail, runRequest, transition]);

  const addTask = useCallback((input: AddOwnerCampaignTaskInput) => {
    mutateTask("add", input, createOwnerCampaignAddPendingTargetKey(input));
  }, [mutateTask]);

  const adoptTask = useCallback((suggestion: OwnerTaskPreviewSuggestion) => {
    mutateTask("adopt", {
      evidenceRule: suggestion.evidenceRule,
      points: suggestion.points,
      required: suggestion.required,
      templateCode: suggestion.templateCode,
      verificationType: suggestion.verificationType,
      walletCompatibility: suggestion.walletCompatibility,
    }, createOwnerCampaignAdoptPendingTargetKey(suggestion));
  }, [mutateTask]);

  const selectCampaign = useCallback((campaignId: string) => {
    if (transition({ type: "campaign_selected", campaignId })) {
      onActiveCampaignIdChangeRef.current?.(campaignId);
    }
  }, [transition]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortRequests();
    };
  }, [abortRequests]);

  useEffect(() => {
    abortRequests();
    transition({
      type: "synchronize_context",
      campaignId: activeCampaignId,
      sessionKey,
    });

    if (stateRef.current.pending) {
      transition({ type: "requests_invalidated" });
    }

    if (!sessionKey) {
      return abortRequests;
    }

    if (activeCampaignId) {
      refreshCampaignDetail(activeCampaignId);
    } else {
      recoverCampaigns();
    }

    return abortRequests;
  }, [
    abortRequests,
    activeCampaignId,
    recoverCampaigns,
    refreshCampaignDetail,
    sessionKey,
    transition,
  ]);

  return {
    addTask,
    adoptTask,
    createCampaign,
    generateTaskPreview,
    recoverCampaigns,
    refreshCampaignDetail,
    selectCampaign,
    state,
  };
};

export const ProjectConsole = ({
  activeCampaignId = null,
  activeWorkspace: controlledActiveWorkspace,
  campaign = campaignDetail,
  locale,
  onActiveCampaignIdChange,
  onOwnerReconnect,
  onWorkspaceChange,
  ownerCampaignBridge,
  ownerSession = null,
  ownerSessionReady = false,
  projectId: configuredProjectId,
  stageReviewMode = false,
  taskTemplateCatalogBridge,
  taskTemplateCatalogMode = "disabled_demo",
  taskTemplateCatalogSessionKey = null,
}: ProjectConsoleProps) => {
  const copy = projectConsoleCopy[locale];
  const catalogConfigured = taskTemplateCatalogMode === "configured";
  const defaultOwnerCampaignBridge = useMemo(
    () => createProjectOwnerCampaignApiBridge({
      config: {
        baseUrl: ownerCampaignApiBaseUrl(),
        tracePrefix: "project-console-owner-campaign",
      },
    }),
    [],
  );
  const resolvedOwnerCampaignBridge = ownerCampaignBridge ?? defaultOwnerCampaignBridge;
  const resolvedOwnerProjectId = ownerProjectId(campaign, configuredProjectId);
  const [internalActiveWorkspace, setInternalActiveWorkspace] = useState<ProjectWorkspaceKey>("campaigns");
  const [draftComposer, setDraftComposer] = useState<DraftComposerState>(() =>
    createSeededDraftComposerState(!catalogConfigured));
  const publishDeliveryApiRequestSeq = useRef(0);
  const pointsRankingLedgerRuntimeApiRequestSeq = useRef(0);
  const objectStorageExportRuntimeApiRequestSeq = useRef(0);
  const repositoryCampaignWorkflowApiRequestSeq = useRef(0);
  const analyticsIngestionRuntimeApiRequestSeq = useRef(0);
  const contractWriterRuntimeApiRequestSeq = useRef(0);
  const rewardDistributionHandoffRuntimeApiRequestSeq = useRef(0);
  const projectOwnerFundingProofReviewApiRequestSeq = useRef(0);
  const productionDatabaseHandoffReadinessApiRequestSeq = useRef(0);
  const exportDeliveryApiRequestSeq = useRef(0);
  const backendReadinessApiRequestSeq = useRef(0);

  useEffect(() => {
    if (!catalogConfigured) {
      return;
    }
    setDraftComposer((current) => current.selectedTaskTemplateIds.length === 0
      ? current
      : { ...current, selectedTaskTemplateIds: [] });
  }, [catalogConfigured]);
  const requestedActiveWorkspace = controlledActiveWorkspace ?? internalActiveWorkspace;
  const activeWorkspace = stageReviewMode
    && !stageReviewWorkspaceKeys.some((workspace) => workspace === requestedActiveWorkspace)
    ? "campaigns"
    : requestedActiveWorkspace;
  const visibleWorkspaceKeys = stageReviewMode
    ? stageReviewWorkspaceKeys
    : projectWorkspaceKeys;
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const firstParticipant = campaign.participants[0];
  const secondParticipant = campaign.participants[1];
  const contractReview = campaign.reviewItems.find((item) => item.type === "CONTRACT_IMPACT");
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = campaign.publishReadiness.blockers.length;
  const seededTaskTemplateIds = catalogConfigured ? [] : seededCampaignDraft.selectedTaskTemplateIds;
  const hasCustomDraftInput =
    draftComposer.aiPrompt !== seededCampaignDraft.aiPrompt.prompt ||
    draftComposer.aiReviewedByHuman !== seededCampaignDraft.aiPrompt.reviewedByHuman ||
    draftComposer.campaignName !== seededCampaignDraft.campaignName["en-US"] ||
    draftComposer.creationMode !== seededCampaignDraft.creationMode ||
    draftComposer.endDate !== toDateInputValue(seededCampaignDraft.timePeriod.endTime) ||
    draftComposer.objective !== seededCampaignDraft.objective ||
    draftComposer.projectName !== seededCampaignDraft.projectName ||
    draftComposer.startDate !== toDateInputValue(seededCampaignDraft.timePeriod.startTime) ||
    draftComposer.targetUsers !== seededCampaignDraft.targetUsers.join(", ") ||
    draftComposer.walletPolicy !== seededCampaignDraft.walletPolicy ||
    draftComposer.selectedTaskTemplateIds.join("|") !== seededTaskTemplateIds.join("|") ||
    draftComposer.supportedLocales.join("|") !==
      editableCampaignLocales
        .filter((supportedLocale) => seededCampaignDraft.supportedLocales.includes(supportedLocale))
        .join("|");
  const builderDraft = hasCustomDraftInput || catalogConfigured
    ? createLocalCampaignDraft({
        aiPrompt: draftComposer.creationMode === "AI_ASSISTED" ? draftComposer.aiPrompt : undefined,
        aiReviewedByHuman: draftComposer.aiReviewedByHuman,
        campaignName: draftComposer.campaignName,
        creationMode: draftComposer.creationMode,
        endTime: toUtcDateTime(draftComposer.endDate),
        objective: draftComposer.objective,
        projectName: draftComposer.projectName,
        selectedTaskTemplateIds: catalogConfigured ? [] : draftComposer.selectedTaskTemplateIds,
        startTime: toUtcDateTime(draftComposer.startDate),
        supportedLocales: draftComposer.supportedLocales,
        targetUsers: draftComposer.targetUsers,
        walletPolicy: draftComposer.walletPolicy,
      })
    : createLocalCampaignDraft();
  const ownerCampaignOrchestrator = useOwnerCampaignOrchestrator({
    activeCampaignId,
    bridge: resolvedOwnerCampaignBridge,
    onActiveCampaignIdChange,
    ownerSession: ownerSessionReady ? ownerSession : null,
    projectId: resolvedOwnerProjectId,
  });
  const ownerWorkflowState = ownerCampaignOrchestrator.state;
  const ownerCreateInput = ownerCreateInputFromDraft(
    builderDraft,
    locale,
    resolvedOwnerProjectId,
  );
  const ownerContext = ownerSessionReady && ownerSession && createOwnerSessionKey(ownerSession)
    ? {
        accountType: ownerSession.accountType,
        address: ownerSession.address,
        sessionId: ownerSession.sessionId,
        sessionKey: createOwnerSessionKey(ownerSession) as string,
        walletSource: ownerSession.walletSource,
      }
    : null;
  const resolvedTaskTemplateCatalogSessionKey = taskTemplateCatalogSessionKey
    ?? ownerContext?.sessionKey
    ?? null;
  const retryOwnerCampaignDetail = () => {
    if (ownerWorkflowState.activeCampaignId) {
      ownerCampaignOrchestrator.refreshCampaignDetail(ownerWorkflowState.activeCampaignId);
    }
  };
  const ownerBuilderIntents: OwnerCampaignBuilderIntentContract = {
    activeCampaignId: ownerWorkflowState.activeCampaignId,
    createPending: ownerWorkflowState.pending?.operation === "create",
    createResult: ownerWorkflowState.createdCampaign,
    error: ownerWorkflowState.error,
    issuedSessionReady: Boolean(ownerContext),
    onCreate: ownerCampaignOrchestrator.createCampaign,
    onReconnect: onOwnerReconnect ?? null,
    onRetryDetail: retryOwnerCampaignDetail,
    ownerContext,
    status: ownerWorkflowState.status,
  };
  const ownerTaskIntents: OwnerCampaignTaskIntentContract = {
    activeCampaignId: ownerWorkflowState.activeCampaignId,
    commandsDisabled: ownerCampaignCommandsDisabled(ownerWorkflowState),
    detail: ownerWorkflowState.detail,
    error: ownerWorkflowState.error,
    issuedSessionReady: Boolean(ownerContext),
    onAdd: ownerCampaignOrchestrator.addTask,
    onAdopt: ownerCampaignOrchestrator.adoptTask,
    onGenerate: ownerCampaignOrchestrator.generateTaskPreview,
    onReconnect: onOwnerReconnect ?? null,
    onRetryDetail: retryOwnerCampaignDetail,
    ownerContext,
    pendingCommand: ownerWorkflowState.pending?.operation ?? null,
    pendingTargetKey: ownerWorkflowState.pending?.targetKey ?? null,
    preview: ownerWorkflowState.preview,
    status: ownerWorkflowState.status,
    tasks: ownerWorkflowState.detail?.tasks ?? [],
  };
  const localAiOutline = generateLocalAiDraftOutline(draftComposer.aiPrompt);
  const apiSkillSurface = createApiSkillContractSurface();
  const localService = createCampaignOsLocalService();
  const serviceCoverageResult = localService.getCoverageSummary();
  const serviceCoverage = serviceCoverageResult.ok ? serviceCoverageResult.payload : undefined;
  const verificationPipelineResult = localService.getVerificationPipelineReadiness({
    campaignId: campaign.id,
  });
  const verificationPipeline = verificationPipelineResult.ok
    ? verificationPipelineResult.payload
    : undefined;
  const exportReadinessResult = localService.getExportConfirmationReadiness({
    campaignId: campaign.id,
  });
  const exportReadiness = exportReadinessResult.ok
    ? exportReadinessResult.payload
    : undefined;
  const exportArtifactResult = localService.exportWinners({
    campaignId: campaign.id,
    contractRootMode: "none",
    format: "csv",
    includeLocalePreference: true,
    includeRiskFlags: true,
    includeWalletType: true,
  });
  const exportArtifact = exportArtifactResult.ok ? exportArtifactResult.payload.artifact : undefined;
  const verificationCoverage = createVerificationCoverageSummary(
    campaign.tasks,
    campaign.participants,
  );
  const commandCenter = createProjectCampaignCommandCenter(campaign);
  const exportDecision = commandCenter.analyticsExport;
  const exportFulfillmentReadiness = commandCenter.exportFulfillmentReadiness;
  const exportStorageProviderApprovalPacket = commandCenter.exportStorageProviderApprovalPacket;
  const exportStorageProviderApprovalTopCheck = exportStorageProviderApprovalPacket.checks.find(
    (check) => check.id === exportStorageProviderApprovalPacket.summary.topCheckId,
  ) ?? exportStorageProviderApprovalPacket.checks[0];
  const exportDeliveryApiBaseUrl = exportArtifactDeliveryApiBaseUrl();
  const publishDeliveryApiBaseUrl = publishDeliveryReviewApiBaseUrl();
  const pointsRankingLedgerRuntimeApiBase = pointsRankingLedgerRuntimeApiBaseUrl();
  const objectStorageExportRuntimeApiBase = objectStorageExportRuntimeApiBaseUrl();
  const repositoryCampaignWorkflowApiBase = repositoryCampaignWorkflowApiBaseUrl();
  const analyticsIngestionRuntimeApiBase = analyticsIngestionRuntimeApiBaseUrl();
  const contractWriterRuntimeApiBase = contractWriterRuntimeApiBaseUrl();
  const rewardDistributionHandoffRuntimeApiBase = rewardDistributionHandoffRuntimeApiBaseUrl();
  const projectOwnerFundingProofReviewApiBase = projectOwnerFundingProofReviewApiBaseUrl();
  const productionDatabaseHandoffReadinessApiBase = productionDatabaseHandoffReadinessApiBaseUrl();
  const exportDeliveryApiRequest: ExportArtifactDeliveryRequest = {
    campaignId: campaign.id,
    contractRootMode: "eligibility_root",
    format: "csv",
    includeLocalePreference: true,
    includeRiskFlags: true,
    includeWalletType: true,
  };
  const [exportDeliveryApiState, setExportDeliveryApiState] = useState<ExportArtifactDeliveryApiBridgeState>(() =>
    exportDeliveryApiBaseUrl?.trim()
      ? createExportArtifactDeliveryApiLoadingState(exportDeliveryApiRequest)
      : createExportArtifactDeliverySeededFallbackState(exportDeliveryApiRequest),
  );
  const [exportDeliveryApiReviewInFlight, setExportDeliveryApiReviewInFlight] = useState(false);
  const [publishDeliveryApiState, setPublishDeliveryApiState] =
    useState<PublishDeliveryReviewApiBridgeState>(() =>
      publishDeliveryApiBaseUrl?.trim()
        ? createPublishDeliveryReviewApiLoadingState(campaign.id)
        : createPublishDeliveryReviewSeededFallbackState(campaign.id),
    );
  const [publishDeliveryApiReviewInFlight, setPublishDeliveryApiReviewInFlight] = useState(false);
  const [pointsRankingLedgerRuntimeApiState, setPointsRankingLedgerRuntimeApiState] =
    useState<PointsRankingLedgerRuntimeApiBridgeState>(() =>
      pointsRankingLedgerRuntimeApiBase?.trim()
        ? createPointsRankingLedgerRuntimeApiLoadingState(campaign.id)
        : createPointsRankingLedgerRuntimeSeededFallbackState(campaign.id),
    );
  const [pointsRankingLedgerRuntimeApiReviewInFlight, setPointsRankingLedgerRuntimeApiReviewInFlight] = useState(false);
  const [objectStorageExportRuntimeApiState, setObjectStorageExportRuntimeApiState] =
    useState<ObjectStorageExportRuntimeApiBridgeState>(() =>
      objectStorageExportRuntimeApiBase?.trim()
        ? createObjectStorageExportRuntimeApiLoadingState(campaign.id)
        : createObjectStorageExportRuntimeSeededFallbackState(campaign.id),
    );
  const [objectStorageExportRuntimeApiReviewInFlight, setObjectStorageExportRuntimeApiReviewInFlight] = useState(false);
  const [repositoryCampaignWorkflowApiState, setRepositoryCampaignWorkflowApiState] =
    useState<RepositoryCampaignWorkflowBridgeState>(() =>
      repositoryCampaignWorkflowApiBase?.trim()
        ? createRepositoryCampaignWorkflowLoadingState()
        : createRepositoryCampaignWorkflowSeededFallbackState(),
    );
  const [repositoryCampaignWorkflowApiReviewInFlight, setRepositoryCampaignWorkflowApiReviewInFlight] = useState(false);
  const [analyticsIngestionRuntimeApiState, setAnalyticsIngestionRuntimeApiState] =
    useState<AnalyticsIngestionRuntimeApiBridgeState>(() =>
      analyticsIngestionRuntimeApiBase?.trim()
        ? createAnalyticsIngestionRuntimeApiLoadingState(campaign.id)
        : createAnalyticsIngestionRuntimeSeededFallbackState(campaign.id),
    );
  const [analyticsIngestionRuntimeApiReviewInFlight, setAnalyticsIngestionRuntimeApiReviewInFlight] = useState(false);
  const [contractWriterRuntimeApiState, setContractWriterRuntimeApiState] =
    useState<ContractWriterRuntimeApiBridgeState>(() =>
      contractWriterRuntimeApiBase?.trim()
        ? createContractWriterRuntimeApiLoadingState(campaign.id)
        : createContractWriterRuntimeSeededFallbackState(campaign.id),
    );
  const [contractWriterRuntimeApiReviewInFlight, setContractWriterRuntimeApiReviewInFlight] = useState(false);
  const [rewardDistributionHandoffRuntimeApiState, setRewardDistributionHandoffRuntimeApiState] =
    useState<RewardDistributionHandoffRuntimeApiBridgeState>(() =>
      rewardDistributionHandoffRuntimeApiBase?.trim()
        ? createRewardDistributionHandoffRuntimeApiLoadingState(campaign.id)
        : createRewardDistributionHandoffRuntimeSeededFallbackState(campaign.id),
    );
  const [rewardDistributionHandoffRuntimeApiReviewInFlight, setRewardDistributionHandoffRuntimeApiReviewInFlight] =
    useState(false);
  const [projectOwnerFundingProofReviewApiState, setProjectOwnerFundingProofReviewApiState] =
    useState<ProjectOwnerFundingProofReviewBridgeApiState>(() =>
      projectOwnerFundingProofReviewApiBase?.trim()
        ? createProjectOwnerFundingProofReviewBridgeApiLoadingState(campaign.id)
        : createProjectOwnerFundingProofReviewSeededFallbackState(campaign.id),
    );
  const [projectOwnerFundingProofReviewApiReviewInFlight, setProjectOwnerFundingProofReviewApiReviewInFlight] =
    useState(false);
  const [productionDatabaseHandoffReadinessApiState, setProductionDatabaseHandoffReadinessApiState] =
    useState<ProductionDatabaseHandoffReadinessApiState>(() =>
      productionDatabaseHandoffReadinessApiBase?.trim()
        ? createProductionDatabaseHandoffReadinessApiSeededFallbackState("project-console-production-database-handoff-pending")
        : createProductionDatabaseHandoffReadinessSeededFallbackState(),
    );
  const [productionDatabaseHandoffReadinessApiReviewInFlight, setProductionDatabaseHandoffReadinessApiReviewInFlight] =
    useState(false);
  const backendReadinessApiBaseUrl = backendRuntimeReadinessApiBaseUrl();
  const [backendReadinessApiState, setBackendReadinessApiState] =
    useState<BackendRuntimeReadinessApiBridgeState>(() =>
      backendReadinessApiBaseUrl?.trim()
        ? createBackendRuntimeReadinessApiLoadingState()
        : createBackendRuntimeReadinessSeededFallbackState(),
    );
  const [backendReadinessApiReviewInFlight, setBackendReadinessApiReviewInFlight] = useState(false);
  const publishDeliveryReviewPanelState = publishDeliveryReviewStateWithBackendReleaseScope(
    publishDeliveryApiState,
    backendReadinessApiState,
  );
  const advancedAnalytics = commandCenter.advancedAnalytics;
  const aiOptimizationSummary = commandCenter.aiOptimization.projectOwnerSummary;
  const aiOpsKpiAdoption = commandCenter.aiOpsKpiAdoption;
  const aiOpsKpiStrongestMetric = aiOpsKpiAdoption.metrics.find(
    (metric) => metric.id === aiOpsKpiAdoption.summary.strongestSignalMetricId,
  );
  const pointsRankingReferralReadiness = commandCenter.pointsRankingReferralReadiness;
  const walletAdapterReadiness = commandCenter.aelfWebLoginAdapterReadiness;
  const liveWalletConnectorBoundary = createLiveWalletConnectorBoundary();
  const providerEvidenceRegistry = commandCenter.providerEvidenceRegistry;
  const lifecycleOperations = commandCenter.lifecycleOperations;
  const launchConsoleBundles = commandCenter.launchConsoleCampaignBundles;
  const portfolioCommercialReadiness = commandCenter.portfolioCommercialReadiness;
  const apiUsageCommercializationReadiness = commandCenter.apiUsageCommercializationReadiness;
  const topLifecycleOperation = lifecycleOperations.operations.find(
    (operation) => operation.id === lifecycleOperations.summary.topOperationId,
  );
  const localeAnalyticsReadiness = createLocaleAnalyticsReadiness(campaign);
  const aiContentPack = createAiContentPackWorkbench(campaign);
  const campaignTemplatePack = createCampaignTemplatePack();
  const awakenTaskReadiness = createAwakenSwapLiquidityTaskReadiness(campaign);
  const daippTaskReadiness = createDaippAgentCoinTaskReadiness(campaign);
  const ebridgeTaskReadiness = createEbridgeTaskReadiness(campaign);
  const forestTaskReadiness = createForestNftTaskReadiness(campaign);
  const schrodingerTaskReadiness = createSchrodingerNftTaskReadiness(campaign);
  const forecastTaskReadiness = createForecastCampaignTaskReadiness(campaign);
  const payTaskReadiness = createPayCampaignTaskReadiness(campaign);
  const tmrwdaoTaskReadiness = createTmrwdaoGovernanceTaskReadiness(campaign);
  const participantOperations = createParticipantOperationsReadModel(campaign);
  const settingsReadiness = createCampaignSettingsReadiness(campaign);
  const postCampaignCloseout = createPostCampaignCloseout(campaign);
  const stateComponentsDeliveryGallery = createStateComponentsDeliveryGallery(campaign);
  const verificationRulesWorkspace = createVerificationRulesWorkspace(campaign);
  const topVerificationRule = verificationRulesWorkspace.pipeline.paths.find(
    (path) => path.id === verificationRulesWorkspace.topRulePathId,
  );
  const exportDeliveryRootPacket =
    exportDeliveryApiState.eligibilityRootPacket ?? exportDeliveryApiState.preview?.eligibilityRootPacket;
  const exportDeliveryRootReview = exportDeliveryApiState.contractRootReview;
  const exportDeliveryFileHandoff = exportDeliveryApiState.fileHandoff?.handoff;
  const exportDeliveryFileHandoffRetentionState = exportDeliveryFileHandoff
    ? readableCode(exportDeliveryFileHandoff.retention.state ?? exportDeliveryFileHandoff.retention.mode ?? "local_review_ttl")
    : copy.exportDeliveryApiNoPreview;

  const selectWorkspace = (workspace: ProjectWorkspaceKey) => {
    if (!controlledActiveWorkspace) {
      setInternalActiveWorkspace(workspace);
    }

    onWorkspaceChange?.(workspace);
  };

  const runExportDeliveryApiReview = () => {
    if (!exportDeliveryApiBaseUrl?.trim()) {
      setExportDeliveryApiState(createExportArtifactDeliverySeededFallbackState(exportDeliveryApiRequest));
      return;
    }

    setExportDeliveryApiReviewInFlight(true);
    setExportDeliveryApiState(createExportArtifactDeliveryApiLoadingState(exportDeliveryApiRequest));

    const requestSeq = exportDeliveryApiRequestSeq.current + 1;
    exportDeliveryApiRequestSeq.current = requestSeq;

    void submitExportArtifactDeliveryApiReview({
      config: {
        baseUrl: exportDeliveryApiBaseUrl,
        tracePrefix: "project-console-export-delivery-review",
      },
      request: exportDeliveryApiRequest,
    }).then((state) => {
      if (exportDeliveryApiRequestSeq.current === requestSeq) {
        setExportDeliveryApiState(state);
      }
    }).finally(() => {
      if (exportDeliveryApiRequestSeq.current === requestSeq) {
        setExportDeliveryApiReviewInFlight(false);
      }
    });
  };

  const loadPublishDeliveryApiReview = useCallback(() => {
    if (!publishDeliveryApiBaseUrl?.trim()) {
      setPublishDeliveryApiState(createPublishDeliveryReviewSeededFallbackState(campaign.id));
      setPublishDeliveryApiReviewInFlight(false);
      return;
    }

    setPublishDeliveryApiReviewInFlight(true);
    setPublishDeliveryApiState(createPublishDeliveryReviewApiLoadingState(campaign.id));

    const requestSeq = publishDeliveryApiRequestSeq.current + 1;
    publishDeliveryApiRequestSeq.current = requestSeq;

    void loadPublishDeliveryReviewApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: publishDeliveryApiBaseUrl,
        tracePrefix: "project-console-publish-delivery-review",
      },
    }).then((state) => {
      if (publishDeliveryApiRequestSeq.current === requestSeq) {
        setPublishDeliveryApiState(state);
      }
    }).finally(() => {
      if (publishDeliveryApiRequestSeq.current === requestSeq) {
        setPublishDeliveryApiReviewInFlight(false);
      }
    });
  }, [campaign.id, publishDeliveryApiBaseUrl]);

  const runPublishDeliveryApiReview = () => {
    loadPublishDeliveryApiReview();
  };

  const loadPointsRankingLedgerRuntimeApiReview = useCallback(() => {
    if (!pointsRankingLedgerRuntimeApiBase?.trim()) {
      setPointsRankingLedgerRuntimeApiState(createPointsRankingLedgerRuntimeSeededFallbackState(campaign.id));
      setPointsRankingLedgerRuntimeApiReviewInFlight(false);
      return;
    }

    setPointsRankingLedgerRuntimeApiReviewInFlight(true);
    setPointsRankingLedgerRuntimeApiState(createPointsRankingLedgerRuntimeApiLoadingState(campaign.id));

    const requestSeq = pointsRankingLedgerRuntimeApiRequestSeq.current + 1;
    pointsRankingLedgerRuntimeApiRequestSeq.current = requestSeq;

    void loadPointsRankingLedgerRuntimeApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: pointsRankingLedgerRuntimeApiBase,
        tracePrefix: "project-console-points-ranking-ledger-runtime",
      },
    }).then((state) => {
      if (pointsRankingLedgerRuntimeApiRequestSeq.current === requestSeq) {
        setPointsRankingLedgerRuntimeApiState(state);
      }
    }).finally(() => {
      if (pointsRankingLedgerRuntimeApiRequestSeq.current === requestSeq) {
        setPointsRankingLedgerRuntimeApiReviewInFlight(false);
      }
    });
  }, [campaign.id, pointsRankingLedgerRuntimeApiBase]);

  const runPointsRankingLedgerRuntimeApiReview = () => {
    loadPointsRankingLedgerRuntimeApiReview();
  };

  const loadObjectStorageExportRuntimeApiReview = useCallback(() => {
    if (!objectStorageExportRuntimeApiBase?.trim()) {
      setObjectStorageExportRuntimeApiState(createObjectStorageExportRuntimeSeededFallbackState(campaign.id));
      setObjectStorageExportRuntimeApiReviewInFlight(false);
      return;
    }

    setObjectStorageExportRuntimeApiReviewInFlight(true);
    setObjectStorageExportRuntimeApiState(createObjectStorageExportRuntimeApiLoadingState(campaign.id));

    const requestSeq = objectStorageExportRuntimeApiRequestSeq.current + 1;
    objectStorageExportRuntimeApiRequestSeq.current = requestSeq;

    void loadObjectStorageExportRuntimeApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: objectStorageExportRuntimeApiBase,
        tracePrefix: "project-console-object-storage-export-runtime",
      },
    }).then((state) => {
      if (objectStorageExportRuntimeApiRequestSeq.current === requestSeq) {
        setObjectStorageExportRuntimeApiState(state);
      }
    }).finally(() => {
      if (objectStorageExportRuntimeApiRequestSeq.current === requestSeq) {
        setObjectStorageExportRuntimeApiReviewInFlight(false);
      }
    });
  }, [campaign.id, objectStorageExportRuntimeApiBase]);

  const runObjectStorageExportRuntimeApiReview = () => {
    loadObjectStorageExportRuntimeApiReview();
  };

  const loadRepositoryCampaignWorkflowApiReview = useCallback(() => {
    const baseUrl = repositoryCampaignWorkflowApiBase?.trim();

    if (!baseUrl) {
      setRepositoryCampaignWorkflowApiState(createRepositoryCampaignWorkflowSeededFallbackState());
      setRepositoryCampaignWorkflowApiReviewInFlight(false);
      return;
    }

    setRepositoryCampaignWorkflowApiReviewInFlight(true);
    setRepositoryCampaignWorkflowApiState(createRepositoryCampaignWorkflowLoadingState());

    const requestSeq = repositoryCampaignWorkflowApiRequestSeq.current + 1;
    repositoryCampaignWorkflowApiRequestSeq.current = requestSeq;

    void loadRepositoryCampaignWorkflowBridgeState({
      config: {
        authorityMode: "deprecated_non_live_preview",
        baseUrl,
        tracePrefix: "project-console-repository-workflow-review",
      },
    }).then((state) => {
      if (repositoryCampaignWorkflowApiRequestSeq.current === requestSeq) {
        setRepositoryCampaignWorkflowApiState(state);
      }
    }).finally(() => {
      if (repositoryCampaignWorkflowApiRequestSeq.current === requestSeq) {
        setRepositoryCampaignWorkflowApiReviewInFlight(false);
      }
    });
  }, [repositoryCampaignWorkflowApiBase]);

  const runRepositoryCampaignWorkflowApiReview = () => {
    loadRepositoryCampaignWorkflowApiReview();
  };

  const loadAnalyticsIngestionRuntimeApiReview = useCallback(() => {
    if (!analyticsIngestionRuntimeApiBase?.trim()) {
      setAnalyticsIngestionRuntimeApiState(createAnalyticsIngestionRuntimeSeededFallbackState(campaign.id));
      setAnalyticsIngestionRuntimeApiReviewInFlight(false);
      return;
    }

    setAnalyticsIngestionRuntimeApiReviewInFlight(true);
    setAnalyticsIngestionRuntimeApiState(createAnalyticsIngestionRuntimeApiLoadingState(campaign.id));

    const requestSeq = analyticsIngestionRuntimeApiRequestSeq.current + 1;
    analyticsIngestionRuntimeApiRequestSeq.current = requestSeq;

    void loadAnalyticsIngestionRuntimeApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: analyticsIngestionRuntimeApiBase,
        tracePrefix: "project-console-analytics-ingestion-runtime",
      },
    }).then((state) => {
      if (analyticsIngestionRuntimeApiRequestSeq.current === requestSeq) {
        setAnalyticsIngestionRuntimeApiState(state);
      }
    }).finally(() => {
      if (analyticsIngestionRuntimeApiRequestSeq.current === requestSeq) {
        setAnalyticsIngestionRuntimeApiReviewInFlight(false);
      }
    });
  }, [analyticsIngestionRuntimeApiBase, campaign.id]);

  const runAnalyticsIngestionRuntimeApiReview = () => {
    loadAnalyticsIngestionRuntimeApiReview();
  };

  const loadContractWriterRuntimeApiReview = useCallback(() => {
    if (!contractWriterRuntimeApiBase?.trim()) {
      setContractWriterRuntimeApiState(createContractWriterRuntimeSeededFallbackState(campaign.id));
      setContractWriterRuntimeApiReviewInFlight(false);
      return;
    }

    setContractWriterRuntimeApiReviewInFlight(true);
    setContractWriterRuntimeApiState(createContractWriterRuntimeApiLoadingState(campaign.id));

    const requestSeq = contractWriterRuntimeApiRequestSeq.current + 1;
    contractWriterRuntimeApiRequestSeq.current = requestSeq;

    void loadContractWriterRuntimeApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: contractWriterRuntimeApiBase,
        tracePrefix: "project-console-contract-writer-runtime",
      },
    }).then((state) => {
      if (contractWriterRuntimeApiRequestSeq.current === requestSeq) {
        setContractWriterRuntimeApiState(state);
      }
    }).finally(() => {
      if (contractWriterRuntimeApiRequestSeq.current === requestSeq) {
        setContractWriterRuntimeApiReviewInFlight(false);
      }
    });
  }, [campaign.id, contractWriterRuntimeApiBase]);

  const runContractWriterRuntimeApiReview = () => {
    loadContractWriterRuntimeApiReview();
  };

  const loadRewardDistributionHandoffRuntimeApiReview = useCallback(() => {
    if (!rewardDistributionHandoffRuntimeApiBase?.trim()) {
      setRewardDistributionHandoffRuntimeApiState(createRewardDistributionHandoffRuntimeSeededFallbackState(campaign.id));
      setRewardDistributionHandoffRuntimeApiReviewInFlight(false);
      return;
    }

    setRewardDistributionHandoffRuntimeApiReviewInFlight(true);
    setRewardDistributionHandoffRuntimeApiState(createRewardDistributionHandoffRuntimeApiLoadingState(campaign.id));

    const requestSeq = rewardDistributionHandoffRuntimeApiRequestSeq.current + 1;
    rewardDistributionHandoffRuntimeApiRequestSeq.current = requestSeq;

    void loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId: campaign.id,
      config: {
        baseUrl: rewardDistributionHandoffRuntimeApiBase,
        tracePrefix: "project-console-reward-distribution-handoff-runtime",
      },
    }).then((state) => {
      if (rewardDistributionHandoffRuntimeApiRequestSeq.current === requestSeq) {
        setRewardDistributionHandoffRuntimeApiState(state);
      }
    }).finally(() => {
      if (rewardDistributionHandoffRuntimeApiRequestSeq.current === requestSeq) {
        setRewardDistributionHandoffRuntimeApiReviewInFlight(false);
      }
    });
  }, [campaign.id, rewardDistributionHandoffRuntimeApiBase]);

  const runRewardDistributionHandoffRuntimeApiReview = () => {
    loadRewardDistributionHandoffRuntimeApiReview();
  };

  const loadProjectOwnerFundingProofReviewApiReview = useCallback(() => {
    if (!projectOwnerFundingProofReviewApiBase?.trim()) {
      setProjectOwnerFundingProofReviewApiState(createProjectOwnerFundingProofReviewSeededFallbackState(campaign.id));
      setProjectOwnerFundingProofReviewApiReviewInFlight(false);
      return;
    }

    setProjectOwnerFundingProofReviewApiReviewInFlight(true);
    setProjectOwnerFundingProofReviewApiState(createProjectOwnerFundingProofReviewBridgeApiLoadingState(campaign.id));

    const requestSeq = projectOwnerFundingProofReviewApiRequestSeq.current + 1;
    projectOwnerFundingProofReviewApiRequestSeq.current = requestSeq;

    void loadProjectOwnerFundingProofReviewBridgeApiState({
      campaignId: campaign.id,
      config: {
        baseUrl: projectOwnerFundingProofReviewApiBase,
        tracePrefix: "project-console-project-owner-funding-proof-review",
      },
    }).then((state) => {
      if (projectOwnerFundingProofReviewApiRequestSeq.current === requestSeq) {
        setProjectOwnerFundingProofReviewApiState(state);
      }
    }).finally(() => {
      if (projectOwnerFundingProofReviewApiRequestSeq.current === requestSeq) {
        setProjectOwnerFundingProofReviewApiReviewInFlight(false);
      }
    });
  }, [campaign.id, projectOwnerFundingProofReviewApiBase]);

  const runProjectOwnerFundingProofReviewApiReview = () => {
    loadProjectOwnerFundingProofReviewApiReview();
  };

  const loadProductionDatabaseHandoffReadinessApiReview = useCallback(() => {
    if (!productionDatabaseHandoffReadinessApiBase?.trim()) {
      setProductionDatabaseHandoffReadinessApiState(createProductionDatabaseHandoffReadinessSeededFallbackState());
      setProductionDatabaseHandoffReadinessApiReviewInFlight(false);
      return;
    }

    setProductionDatabaseHandoffReadinessApiReviewInFlight(true);

    const requestSeq = productionDatabaseHandoffReadinessApiRequestSeq.current + 1;
    productionDatabaseHandoffReadinessApiRequestSeq.current = requestSeq;

    void loadProductionDatabaseHandoffReadinessApiState({
      config: {
        baseUrl: productionDatabaseHandoffReadinessApiBase,
        tracePrefix: "project-console-production-database-handoff-readiness",
      },
    }).then((state) => {
      if (productionDatabaseHandoffReadinessApiRequestSeq.current === requestSeq) {
        setProductionDatabaseHandoffReadinessApiState(state);
      }
    }).finally(() => {
      if (productionDatabaseHandoffReadinessApiRequestSeq.current === requestSeq) {
        setProductionDatabaseHandoffReadinessApiReviewInFlight(false);
      }
    });
  }, [productionDatabaseHandoffReadinessApiBase]);

  const runProductionDatabaseHandoffReadinessApiReview = () => {
    loadProductionDatabaseHandoffReadinessApiReview();
  };

  const loadBackendReadinessApiReview = useCallback(() => {
    if (!backendReadinessApiBaseUrl?.trim()) {
      setBackendReadinessApiState(createBackendRuntimeReadinessSeededFallbackState());
      setBackendReadinessApiReviewInFlight(false);
      return;
    }

    setBackendReadinessApiReviewInFlight(true);
    setBackendReadinessApiState(createBackendRuntimeReadinessApiLoadingState());

    const requestSeq = backendReadinessApiRequestSeq.current + 1;
    backendReadinessApiRequestSeq.current = requestSeq;

    void loadBackendRuntimeReadinessApiBridgeState({
      config: {
        baseUrl: backendReadinessApiBaseUrl,
        tracePrefix: "project-console-backend-readiness-review",
      },
    }).then((state) => {
      if (backendReadinessApiRequestSeq.current === requestSeq) {
        setBackendReadinessApiState(state);
      }
    }).finally(() => {
      if (backendReadinessApiRequestSeq.current === requestSeq) {
        setBackendReadinessApiReviewInFlight(false);
      }
    });
  }, [backendReadinessApiBaseUrl]);

  const runBackendReadinessApiReview = () => {
    loadBackendReadinessApiReview();
  };

  useEffect(() => {
    if (activeWorkspace === "export") {
      loadPublishDeliveryApiReview();
      loadPointsRankingLedgerRuntimeApiReview();
      loadObjectStorageExportRuntimeApiReview();
      loadRepositoryCampaignWorkflowApiReview();
      loadAnalyticsIngestionRuntimeApiReview();
      loadContractWriterRuntimeApiReview();
      loadRewardDistributionHandoffRuntimeApiReview();
      loadProjectOwnerFundingProofReviewApiReview();
      loadProductionDatabaseHandoffReadinessApiReview();
      loadBackendReadinessApiReview();
    }
  }, [
    activeWorkspace,
    loadAnalyticsIngestionRuntimeApiReview,
    loadBackendReadinessApiReview,
    loadContractWriterRuntimeApiReview,
    loadObjectStorageExportRuntimeApiReview,
    loadPointsRankingLedgerRuntimeApiReview,
    loadPublishDeliveryApiReview,
    loadProjectOwnerFundingProofReviewApiReview,
    loadProductionDatabaseHandoffReadinessApiReview,
    loadRepositoryCampaignWorkflowApiReview,
    loadRewardDistributionHandoffRuntimeApiReview,
  ]);

  const stats = [
    {
      label: copy.connectedWallets,
      value: formatNumber(campaign.metrics.connectedWallets),
      detail: `${campaign.metrics.aaWallets} AA / ${campaign.metrics.eoaWallets} EOA`,
    },
    {
      label: copy.walletSplit,
      value: `${campaign.metrics.aaWallets}/${campaign.metrics.eoaWallets}`,
      detail: "Portkey AA + EOA extension",
    },
    {
      label: copy.completionRate,
      value: formatPercent(campaign.metrics.completionRate),
      detail: `${campaign.tasks.length} ${copy.taskCount}`,
    },
    {
      label: copy.localeCoverage,
      value: formatPercent(campaign.metrics.localeCoverage),
      detail: campaign.supportedLocales.join(" / "),
    },
    {
      label: copy.riskQueue,
      value: String(campaign.metrics.riskReviewQueue),
      detail: secondParticipant?.riskFlags[0] ?? "No active flag",
    },
    {
      label: copy.exportReady,
      value: formatNumber(campaign.metrics.exportReadyWinners),
      detail: copy.exportDisclaimer,
    },
  ];

  const workflows = [
    {
      title: copy.builderEntryTitle,
      state: copy.builderEntryState,
      action: copy.builderEntryAction,
      extra: <PublishStateBadge label={copy.builderNoMissingBasics} state="ready" />,
    },
    {
      title: copy.aiPlanner,
      state: copy.aiPlannerState,
      action: copy.aiPlannerAction,
      extra: <ReviewSeverityBadge label={copy.warning} severity="warning" />,
    },
    {
      title: copy.taskBuilder,
      state: copy.taskBuilderState,
      action: copy.taskBuilderAction,
      extra: <WalletCompatibilityBadge compatibility={campaign.tasks[0]?.walletCompatibility ?? "ANY"} />,
    },
    {
      title: copy.rewardsEligibility,
      state: copy.rewardsEligibilityState,
      action: copy.rewardsEligibilityAction,
      extra: (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <PublishStateBadge
            label={firstParticipant?.eligible ? copy.eligible : copy.ineligible}
            state={firstParticipant?.eligible ? "ready" : "warning"}
          />
          <PublishStateBadge
            label={secondParticipant?.eligible ? copy.eligible : copy.missingTask}
            state={secondParticipant?.eligible ? "ready" : "warning"}
          />
        </span>
      ),
    },
    {
      title: copy.translationReview,
      state: copy.translationReviewState,
      action: copy.translationReviewAction,
      extra: (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <LocaleStatusBadge label={`en-US ${copy.published}`} status="published" />
          <LocaleStatusBadge label={`zh-CN ${copy.aiDraft}`} status="ai_draft" />
          <LocaleStatusBadge label={`zh-TW ${copy.fallback}`} status="fallback" />
        </span>
      ),
    },
    {
      title: copy.contractImpact,
      state: copy.contractImpactState,
      action: copy.contractImpactAction,
      extra: (
        <ReviewSeverityBadge
          label={reviewStatusLabel(contractReview?.status, copy)}
          severity={contractReview?.severity ?? "info"}
        />
      ),
    },
  ];

  const workspaceLabels: Record<ProjectWorkspaceKey, string> = {
    aiContent: copy.workspaceAiContent,
    analytics: copy.workspaceAnalytics,
    campaigns: copy.workspaceCampaigns,
    closeout: copy.workspaceCloseout,
    create: copy.workspaceCreate,
    export: copy.workspaceExport,
    participants: copy.workspaceParticipants,
    settings: copy.workspaceSettings,
    states: copy.workspaceStates,
    templates: copy.workspaceTemplates,
    verificationRules: copy.workspaceVerificationRules,
  };

  const workspaceSummaries: Record<ProjectWorkspaceKey, string> = {
    aiContent: copy.workspaceAiContentSummary,
    analytics: copy.workspaceAnalyticsSummary,
    campaigns: copy.workspaceCampaignsSummary,
    closeout: copy.workspaceCloseoutSummary,
    create: copy.workspaceCreateSummary,
    export: copy.workspaceExportSummary,
    participants: copy.workspaceParticipantsSummary,
    settings: copy.workspaceSettingsSummary,
    states: copy.workspaceStatesSummary,
    templates: copy.workspaceTemplatesSummary,
    verificationRules: copy.workspaceVerificationRulesSummary,
  };

  const createSteps = [
    { label: copy.createStepGoal, state: copy.builderNoMissingBasics, status: "ready" as const },
    { label: copy.createStepTasks, state: copy.taskBuilderState, status: "ready" as const },
    { label: copy.createStepRewardsEligibility, state: copy.rewardsEligibilityState, status: "warning" as const },
    { label: copy.createStepI18n, state: copy.translationReviewState, status: "warning" as const },
    { label: copy.createStepContract, state: copy.contractImpactState, status: "warning" as const },
    { label: copy.createStepPublishReadiness, state: copy.builderCompletenessSummary, status: "warning" as const },
  ];
  const ownerLabels = ownerCampaignCopy[locale];
  const ownerStatus = ownerCampaignStatusLabel(ownerWorkflowState, locale);
  const ownerCreateLabel = ownerWorkflowState.error?.operation === "create"
    ? ownerLabels.retryCreate
    : ownerLabels.create;
  const ownerDetailLabel = ownerWorkflowState.error?.operation === "detail"
    ? ownerLabels.retryDetail
    : ownerLabels.refreshDetail;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: "100%", minWidth: 0 }}>
      {stageReviewMode ? (
        <style data-testid="stage-review-owner-create-style">{stageReviewOwnerCreateStyle}</style>
      ) : null}
      <section aria-label={copy.projectWorkspace} style={workspaceShellStyle}>
        {!stageReviewMode ? (
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.dashboardTitle}</p>
              <strong style={{ color: "#071426", display: "block", fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>
                {title}
              </strong>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
            </div>
            <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PublishStateBadge label={copy.active} state="ready" />
              <ContractModeBadge
                label={contractModeLabel(campaign.contractMode, copy)}
                mode={campaign.contractMode}
              />
            </span>
          </div>
        ) : null}

        <nav aria-label={copy.projectWorkspaceNavigation} style={workspaceNavStyle}>
          {visibleWorkspaceKeys.map((workspaceKey) => (
            <button
              aria-pressed={activeWorkspace === workspaceKey}
              key={workspaceKey}
              onClick={() => selectWorkspace(workspaceKey)}
              style={workspaceButtonStyle(activeWorkspace === workspaceKey)}
              type="button"
            >
              {workspaceLabels[workspaceKey]}
            </button>
          ))}
        </nav>

        {!stageReviewMode ? (
          <article style={workspaceIntroStyle}>
            <p style={statLabelStyle}>{copy.activeWorkspace}</p>
            <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>
              {workspaceLabels[activeWorkspace]}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {workspaceSummaries[activeWorkspace]}
            </p>
          </article>
        ) : null}
      </section>

      {(!stageReviewMode || activeWorkspace === "campaigns") && (
        <section aria-label={ownerLabels.region} role="region" style={panelStyle}>
        <div style={headingRowStyle}>
          <div style={{ minWidth: 0 }}>
            <p style={statLabelStyle}>{ownerLabels.owner}</p>
            <h2 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {ownerLabels.region}
            </h2>
            {ownerContext ? (
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
                {ownerContext.address}
              </p>
            ) : null}
          </div>
          <div
            aria-atomic="true"
            aria-live="polite"
            role="status"
            style={{ color: "#0f172a", fontSize: 14, fontWeight: 900 }}
          >
            {ownerStatus}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            disabled={!canCreateOwnerCampaign(ownerWorkflowState)}
            onClick={() => ownerCampaignOrchestrator.createCampaign(ownerCreateInput)}
            style={actionButtonStyle}
            type="button"
          >
            {ownerCreateLabel}
          </button>
          <button
            disabled={
              !ownerSessionReady
              || !ownerWorkflowState.activeCampaignId
              || Boolean(ownerWorkflowState.pending)
            }
            onClick={() => {
              if (ownerWorkflowState.activeCampaignId) {
                ownerCampaignOrchestrator.refreshCampaignDetail(
                  ownerWorkflowState.activeCampaignId,
                );
              }
            }}
            style={ghostButtonStyle}
            type="button"
          >
            {ownerDetailLabel}
          </button>
          <button
            disabled={!onOwnerReconnect}
            onClick={onOwnerReconnect}
            style={ghostButtonStyle}
            type="button"
          >
            {ownerLabels.reconnect}
          </button>
          {ownerWorkflowState.error?.operation === "recover" ? (
            <button
              disabled={!ownerSessionReady || Boolean(ownerWorkflowState.pending)}
              onClick={ownerCampaignOrchestrator.recoverCampaigns}
              style={ghostButtonStyle}
              type="button"
            >
              {ownerLabels.retryRecovery}
            </button>
          ) : null}
        </div>

        {ownerWorkflowState.candidates.length > 1 && !ownerWorkflowState.activeCampaignId ? (
          <ul style={compactListStyle}>
            {ownerWorkflowState.candidates.map((candidate) => (
              <li key={candidate.id} style={listItemStyle}>
                <span style={{ color: "#334155", fontSize: 13, fontWeight: 800, overflowWrap: "anywhere" }}>
                  {candidate.id}
                </span>
                <button
                  aria-label={ownerLabels.selectCampaign(candidate.id)}
                  onClick={() => ownerCampaignOrchestrator.selectCampaign(candidate.id)}
                  style={ghostButtonStyle}
                  type="button"
                >
                  {ownerLabels.selectCampaign(candidate.id)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {ownerWorkflowState.activeCampaignId ? (
          <div style={{ display: "grid", gap: 6 }}>
            <p style={statLabelStyle}>{ownerLabels.activeCampaign}</p>
            <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, margin: 0, overflowWrap: "anywhere" }}>
              {ownerWorkflowState.activeCampaignId}
            </p>
          </div>
        ) : null}

        {ownerWorkflowState.detail ? (
          <div aria-label={ownerLabels.canonicalTasks} style={{ display: "grid", gap: 8 }}>
            <p style={statLabelStyle}>{ownerLabels.canonicalTasks}</p>
            {ownerWorkflowState.detail.tasks.length > 0 ? (
              <ul style={compactListStyle}>
                {ownerWorkflowState.detail.tasks.map((task) => (
                  <li key={task.id} style={listItemStyle}>
                    <span style={{ color: "#071426", fontSize: 13, fontWeight: 900, overflowWrap: "anywhere" }}>
                      {task.id}
                    </span>
                    <span style={{ color: "#475569", fontSize: 13 }}>
                      {task.templateCode ?? task.verificationType} · {task.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{ownerLabels.noTasks}</p>
            )}
          </div>
        ) : null}

        {ownerWorkflowState.error ? (
          <div role="alert" style={{ color: "#92400e", display: "grid", gap: 4 }}>
            <strong>{ownerWorkflowState.error.message}</strong>
            <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>
              {ownerWorkflowState.error.code} · {ownerLabels.traceId}: {ownerWorkflowState.error.traceId}
            </span>
          </div>
        ) : null}
        </section>
      )}

      {!stageReviewMode && activeWorkspace === "campaigns" && (
        <>
      <section style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.dashboardTitle}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{title}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
          </div>
          <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={copy.active} state="ready" />
            <ContractModeBadge
              label={contractModeLabel(campaign.contractMode, copy)}
              mode={campaign.contractMode}
            />
          </span>
        </div>

        <div aria-label="Project Console dashboard metrics" style={gridStyle}>
          {stats.map((stat) => (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={statValueStyle}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.contractMode}</p>
            <p style={{ ...statValueStyle, fontSize: 19 }}>
              {contractModeLabel(campaign.contractMode, copy)}
            </p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
              {copy.contractImpactState}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.readiness}</p>
            <p style={{ ...statValueStyle, fontSize: 19 }}>
              {blockerCount} {copy.blocker} / {warningCount} {copy.warning}
            </p>
            <ul style={listStyle}>
              {campaign.publishReadiness.warnings.slice(0, 1).map((warning) => (
                <li key={warning} style={listItemStyle}>
                  <span style={{ color: "#475569", fontSize: 13 }}>
                  {locale === "zh-CN" || locale === "zh-TW" ? copy.zhFallbackWarning : warning}
                  </span>
                  <PublishStateBadge label={copy.warning} state="warning" />
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-label={copy.commandCenter} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.commandCenterSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.commandCenter}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.commandCenterSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${commandCenter.summary.totalCampaigns} ${copy.commandCampaigns}`}
            state={commandCenter.summary.blockerCount > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label="Campaign Command Center summary" style={gridStyle}>
          {[
            [copy.commandLive, String(commandCenter.summary.liveCount)],
            [copy.commandScheduledDraft, String(commandCenter.summary.scheduledOrDraftCount)],
            [copy.commandEnded, String(commandCenter.summary.endedCount)],
            [copy.commandExported, String(commandCenter.summary.exportedCount)],
            [copy.commandWarnings, String(commandCenter.summary.warningCount)],
            [copy.commandBlockers, String(commandCenter.summary.blockerCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {commandCenter.campaigns.map((item) => (
            <article key={item.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{item.projectName}</p>
                  <strong style={{ color: "#071426", display: "block", fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(item.title, locale)}
                  </strong>
                </div>
                <PublishStateBadge
                  label={commandStatusLabel(item.status, copy)}
                  state={item.status === "live" || item.status === "exported" ? "ready" : "warning"}
                />
              </div>
              <div style={gridStyle}>
                {[
                  [copy.commandTimeWindow, getLocalizedText(item.timeWindow, locale)],
                  [copy.commandWallet, getLocalizedText(item.walletSplitLabel, locale)],
                  [copy.commandLocale, getLocalizedText(item.localeState, locale)],
                  [copy.commandRisk, getLocalizedText(item.riskReason, locale)],
                  [copy.commandExport, getLocalizedText(item.exportSummary, locale)],
                  [copy.commandPriority, item.priority],
                ].map(([label, value]) => (
                  <div key={`${item.id}-${label}`} style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{label}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p style={statLabelStyle}>{copy.commandNextAction}</p>
                <strong style={{ display: "block", fontSize: 16, lineHeight: 1.35 }}>
                  {getLocalizedText(item.nextActionLabel, locale)}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: "4px 0 0" }}>
                  {getLocalizedText(item.nextActionDetail, locale)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p style={boundaryStyle}>{getLocalizedText(commandCenter.boundary, locale)}</p>
      </section>

      <section aria-label={copy.portfolioCommercialReadiness} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.portfolioCommercialSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.portfolioCommercialReadiness}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.portfolioCommercialSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${portfolioCommercialReadiness.summary.productionReadyModelCount} ${copy.portfolioCommercialProductionReady}`}
            state="warning"
          />
        </div>

        <div aria-label={copy.portfolioCommercialSummary} style={gridStyle}>
          {[
            [copy.portfolioCommercialMetrics, String(portfolioCommercialReadiness.summary.totalMetrics)],
            [copy.apiSkillReadinessReady, String(portfolioCommercialReadiness.summary.readyMetricCount)],
            [copy.apiSkillReadinessReviewRequired, String(portfolioCommercialReadiness.summary.reviewRequiredMetricCount)],
            [copy.portfolioCommercialModels, String(portfolioCommercialReadiness.summary.commercialModelCount)],
            [copy.portfolioCommercialProductionReady, String(portfolioCommercialReadiness.summary.productionReadyModelCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div>
          <p style={statLabelStyle}>{copy.portfolioCommercialMetrics}</p>
          <div style={sectionGridStyle}>
            {portfolioCommercialReadiness.metrics.map((metric) => (
              <article key={metric.id} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{portfolioOwnerLabel(metric.ownerRole)}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(metric.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={publishStateLabel(metric.state, copy)}
                    state={metric.state}
                  />
                </div>
                <p style={{ ...statValueStyle, fontSize: 22 }}>{metric.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(metric.detail, locale)}
                </p>
                <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.portfolioCommercialNextAction}: {getLocalizedText(metric.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p style={statLabelStyle}>{copy.portfolioCommercialModels}</p>
          <div style={sectionGridStyle}>
            {portfolioCommercialReadiness.commercialModels.map((model) => (
              <article key={model.id} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{portfolioOwnerLabel(model.ownerRole)}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(model.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={publishStateLabel(model.state, copy)}
                    state={model.state}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.portfolioCommercialEvidence}: {getLocalizedText(model.evidence, locale)}
                </p>
                <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.portfolioCommercialNextAction}: {getLocalizedText(model.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <p style={boundaryStyle}>
          {copy.portfolioCommercialTopNextAction}:{" "}
          {getLocalizedText(portfolioCommercialReadiness.summary.topNextAction, locale)}
        </p>
        <p style={boundaryStyle}>
          {copy.portfolioCommercialRewardBoundary}:{" "}
          {getLocalizedText(portfolioCommercialReadiness.summary.rewardBoundary, locale)}
        </p>
        <p style={boundaryStyle}>{getLocalizedText(portfolioCommercialReadiness.boundary, locale)}</p>
      </section>

      <section aria-label={copy.apiUsageReadiness} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.apiUsageSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.apiUsageReadiness}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.apiUsageReadinessSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${apiUsageCommercializationReadiness.summary.blockedCount} ${copy.apiSkillReadinessBlocked}`}
            state={apiUsageCommercializationReadiness.summary.blockedCount > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label={copy.apiUsageSummary} style={gridStyle}>
          {[
            [copy.apiUsageTotalCandidates, String(apiUsageCommercializationReadiness.summary.totalCandidates)],
            [copy.apiSkillReadinessReviewRequired, String(apiUsageCommercializationReadiness.summary.reviewRequiredCount)],
            [copy.apiSkillReadinessBlocked, String(apiUsageCommercializationReadiness.summary.blockedCount)],
            [copy.apiUsageHighRisk, String(apiUsageCommercializationReadiness.summary.highRiskCount)],
            [copy.apiUsageBillingHandoff, String(apiUsageCommercializationReadiness.summary.billingHandoffCount)],
            [copy.apiUsageProductionReady, String(apiUsageCommercializationReadiness.summary.productionReadyCount)],
            [copy.apiUsageMissingCandidates, String(apiUsageCommercializationReadiness.summary.missingCandidateCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div>
          <p style={statLabelStyle}>{copy.apiUsageCandidates}</p>
          <div style={sectionGridStyle}>
            {apiUsageCommercializationReadiness.candidates.map((candidate) => (
              <article key={candidate.skillId} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{candidate.skillId}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(candidate.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={apiUsageReadinessLabel(candidate.readiness, copy)}
                    state={apiUsageReadinessBadgeState(candidate.readiness)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(candidate.description, locale)}
                </p>
                <div style={gridStyle}>
                  {[
                    [copy.apiUsageConsumerTier, readableCode(candidate.consumerTier)],
                    [copy.apiUsageCommercialModel, readableCode(candidate.commercialModel)],
                    [copy.apiUsageOwner, readableCode(candidate.ownerRole)],
                    [copy.apiUsageReviewState, readableCode(candidate.reviewState)],
                  ].map(([label, value]) => (
                    <div key={`${candidate.skillId}-${label}`} style={{ minWidth: 0 }}>
                      <p style={statLabelStyle}>{label}</p>
                      <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <ul style={compactListStyle}>
                  {([
                    [copy.apiUsageAuthKey, candidate.authKeyReadiness.state],
                    [copy.apiUsageQuota, candidate.quotaPolicy.state],
                    [copy.apiUsageMetering, candidate.meteringStatus.state],
                    [copy.apiUsageRateLimit, candidate.rateLimitPolicy.state],
                    [copy.apiUsageBillingHandoff, candidate.billingHandoff.state],
                  ] satisfies ReadonlyArray<readonly [string, ApiUsagePrerequisiteState]>).map(([label, state]) => (
                    <li key={`${candidate.skillId}-${label}`} style={chipStyle}>
                      {label}: {apiUsagePrerequisiteLabel(state, copy)}
                    </li>
                  ))}
                </ul>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.apiUsageEvidence}: {getLocalizedText(candidate.evidence, locale)}
                </p>
                <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.apiUsageNextAction}: {getLocalizedText(candidate.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <p style={boundaryStyle}>
          {copy.apiUsageTopNextAction}:{" "}
          {getLocalizedText(apiUsageCommercializationReadiness.summary.topNextAction, locale)}
        </p>
        <p style={boundaryStyle}>
          {copy.apiUsageRewardBoundary}:{" "}
          {getLocalizedText(apiUsageCommercializationReadiness.rewardBoundary, locale)}
        </p>
        <p style={boundaryStyle}>
          {copy.apiUsageBoundary}:{" "}
          {getLocalizedText(apiUsageCommercializationReadiness.boundary, locale)}
        </p>
      </section>

      <section aria-label={copy.lifecycleOperations} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.lifecycleOperationsEyebrow}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.lifecycleOperations}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.lifecycleOperationsSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${lifecycleOperations.summary.launchBlockingCount} ${copy.lifecycleLaunchBlockers}`}
            state={lifecycleOperations.summary.launchBlockingCount > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label={copy.lifecycleSummary} style={gridStyle}>
          {[
            {
              detail: copy.lifecycleCurrentStatusDetail,
              label: copy.lifecycleCurrentStatus,
              value: lifecycleStatusLabel(lifecycleOperations.currentStatus),
            },
            {
              detail: `${lifecycleOperations.summary.totalOperations} ${copy.lifecycleOperationCount}`,
              label: copy.lifecycleAllowed,
              value: String(lifecycleOperations.summary.allowedCount),
            },
            {
              detail: copy.lifecycleLaunchBlockers,
              label: copy.lifecycleBlocked,
              value: String(lifecycleOperations.summary.blockedCount),
            },
            {
              detail: copy.lifecycleOwnerAction,
              label: copy.lifecycleReviewRequired,
              value: String(lifecycleOperations.summary.reviewRequiredCount),
            },
            {
              detail: copy.lifecycleCurrentStatusDetail,
              label: copy.lifecycleNotApplicable,
              value: String(lifecycleOperations.summary.notApplicableCount),
            },
            {
              detail: copy.lifecycleExportSensitiveDetail,
              label: copy.lifecycleExportSensitive,
              value: String(lifecycleOperations.summary.exportSensitiveCount),
            },
          ].map((stat) => (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={{ ...statValueStyle, fontSize: stat.value.length > 6 ? 18 : 24 }}>
                {stat.value}
              </p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        {topLifecycleOperation ? (
          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={statLabelStyle}>{copy.lifecycleTopNextAction}</p>
                <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                  {getLocalizedText(topLifecycleOperation.label, locale)}
                </h4>
              </div>
              <PublishStateBadge
                label={lifecycleOperationStateLabel(topLifecycleOperation.operationState, copy)}
                state={lifecycleOperationStateBadgeState(topLifecycleOperation.operationState)}
              />
            </div>
            <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(lifecycleOperations.nextAction, locale)}
            </p>
          </article>
        ) : null}

        <div style={sectionGridStyle}>
          {lifecycleOperations.operations
            .filter((operation) =>
              [
                "generate-ai-draft",
                "submit-human-review",
                "schedule-campaign",
                "publish-campaign",
                "export-campaign",
                "archive-campaign",
              ].includes(operation.id),
            )
            .map((operation) => (
              <article key={operation.id} style={workflowStyle}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>
                      {lifecycleStatusLabel(operation.fromStatus)}{" -> "}
                      {lifecycleStatusLabel(operation.targetStatus)}
                    </p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(operation.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={lifecycleOperationStateLabel(operation.operationState, copy)}
                    state={lifecycleOperationStateBadgeState(operation.operationState)}
                  />
                </div>
                <div style={gridStyle}>
                  <div>
                    <p style={statLabelStyle}>{copy.lifecycleOwner}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {lifecycleOwnerLabel(operation.ownerRole)}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.lifecycleGateGroup}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {operation.gateGroup.replace(/-/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.lifecycleBlockingChecks}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {operation.blockingChecks.length}
                    </p>
                  </div>
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(operation.reason, locale)}
                </p>
                {operation.blockingChecks.length > 0 ? (
                  <ul style={compactListStyle}>
                    {operation.blockingChecks.slice(0, 3).map((check) => (
                      <li key={check.id} style={chipStyle}>
                        {getLocalizedText(check.label, locale)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.lifecycleOwnerAction}: {getLocalizedText(operation.nextAction, locale)}
                </p>
              </article>
            ))}
        </div>

        <p style={boundaryStyle}>
          {copy.lifecycleLocalOnlyBoundary}: {getLocalizedText(lifecycleOperations.boundary, locale)}
        </p>
      </section>

      <section aria-label={copy.launchConsoleBundles} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.launchConsoleSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.launchConsoleBundles}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.launchConsoleBundlesSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${launchConsoleBundles.summary.launchBlockingCount} ${copy.launchConsoleLaunchBlocking}`}
            state={launchConsoleBundles.summary.launchBlockingCount > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label={copy.launchConsoleSummary} style={gridStyle}>
          {[
            [copy.launchConsoleTotalBundles, String(launchConsoleBundles.summary.totalBundles)],
            [copy.launchConsoleReady, String(launchConsoleBundles.summary.readyCount)],
            [copy.launchConsoleReviewRequired, String(launchConsoleBundles.summary.reviewRequiredCount)],
            [copy.launchConsoleBlocked, String(launchConsoleBundles.summary.blockedCount)],
            [copy.launchConsoleLocalOnly, String(launchConsoleBundles.summary.localOnlyCount)],
            [copy.launchConsoleLaunchBlocking, String(launchConsoleBundles.summary.launchBlockingCount)],
            [copy.launchConsoleHandoffRequired, String(launchConsoleBundles.summary.handoffRequiredCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {launchConsoleBundles.bundles.map((bundle) => {
            const bundleHandoffs = bundle.handoffIds.flatMap((handoffId) => {
              const handoff = launchConsoleBundles.handoffs.find(
                (candidate) => candidate.id === handoffId,
              );
              return handoff ? [handoff] : [];
            });

            return (
              <article key={bundle.id} style={{ ...workflowStyle, overflowWrap: "anywhere" }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>
                      {copy.launchConsoleStage}: {launchConsoleStageLabel(bundle.stage)}
                    </p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(bundle.title, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={launchConsoleStatusLabel(bundle.status, copy)}
                    state={launchConsoleStatusBadgeState(bundle.status)}
                  />
                </div>

                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(bundle.objective, locale)}
                </p>

                <div style={gridStyle}>
                  {[
                    [copy.launchConsoleCampaignIntent, getLocalizedText(bundle.campaignIntent, locale)],
                    [copy.launchConsoleAudience, getLocalizedText(bundle.targetAudience, locale)],
                    [copy.launchConsoleRecommendedTiming, getLocalizedText(bundle.recommendedTiming, locale)],
                    [copy.launchConsoleOwner, launchConsoleOwnerLabel(bundle.ownerRole)],
                  ].map(([label, value]) => (
                    <div key={`${bundle.id}-${label}`} style={{ minWidth: 0 }}>
                      <p style={statLabelStyle}>{label}</p>
                      <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <p style={statLabelStyle}>{copy.launchConsoleTasks}</p>
                  <ul style={compactListStyle}>
                    {bundle.tasks.map((task) => (
                      <li key={task.id} style={{ ...chipStyle, display: "grid", gap: 4 }}>
                        <span>{launchConsoleTaskCategoryLabel(task.category, copy)}</span>
                        <strong>{getLocalizedText(task.label, locale)}</strong>
                        <span>{getLocalizedText(task.description, locale)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p style={statLabelStyle}>{copy.launchConsoleGateEvidence}</p>
                  <ul style={listStyle}>
                    {bundle.gateEvidence.map((gate) => (
                      <li
                        key={gate.id}
                        style={{ ...listItemStyle, alignItems: "flex-start", gap: 10 }}
                      >
                        <span style={{ display: "grid", flex: "1 1 210px", gap: 4, minWidth: 0 }}>
                          <strong>{getLocalizedText(gate.label, locale)}</strong>
                          <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                            {getLocalizedText(gate.reason, locale)}
                          </span>
                          <span style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>
                            {copy.launchConsoleNextAction}: {getLocalizedText(gate.nextAction, locale)}
                          </span>
                        </span>
                        <span style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                          <PublishStateBadge
                            label={launchConsoleStatusLabel(gate.state, copy)}
                            state={launchConsoleStatusBadgeState(gate.state)}
                          />
                          {gate.blocksLaunch ? (
                            <PublishStateBadge label={copy.launchConsoleLaunchBlocking} state="blocker" />
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p style={statLabelStyle}>{copy.launchConsoleHandoffs}</p>
                  <ul style={compactListStyle}>
                    {bundleHandoffs.map((handoff) => (
                      <li key={`${bundle.id}-${handoff.id}`} style={{ ...chipStyle, display: "grid", gap: 4 }}>
                        <span>{handoff.id}</span>
                        <strong>{getLocalizedText(handoff.title, locale)}</strong>
                        <span>{getLocalizedText(handoff.outputPreview, locale)}</span>
                        <PublishStateBadge
                          label={launchConsoleStatusLabel(handoff.reviewState, copy)}
                          state={launchConsoleStatusBadgeState(handoff.reviewState)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.launchConsoleNextAction}: {getLocalizedText(bundle.nextAction, locale)}
                </p>
                <p style={boundaryStyle}>
                  {copy.launchConsoleBoundary}: {getLocalizedText(bundle.publicBoundary, locale)}
                </p>
              </article>
            );
          })}
        </div>

        <p style={boundaryStyle}>
          {copy.launchConsoleBoundary}: {getLocalizedText(launchConsoleBundles.boundary, locale)}{" "}
          {copy.launchConsoleNoLiveBoundary}
        </p>
      </section>

        </>
      )}

      {activeWorkspace === "states" && (
        <section aria-label={copy.stateComponentsDeliveryGallery} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.workspaceStates}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.stateComponentsDeliveryGallery}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.stateComponentsSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={`${stateComponentsDeliveryGallery.summary.blockedCount} ${copy.stateComponentsBlocked}`}
              state={stateComponentsDeliveryGallery.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
          </div>

          <div aria-label={copy.stateComponentsFamilies} style={gridStyle}>
            {[
              {
                detail: copy.stateComponentsExamples,
                label: copy.stateComponentsFamilies,
                value: String(stateComponentsDeliveryGallery.summary.totalFamilies),
              },
              {
                detail: copy.stateComponentsExamples,
                label: copy.stateComponentsCovered,
                value: String(stateComponentsDeliveryGallery.summary.coveredCount),
              },
              {
                detail: copy.stateComponentsReadiness,
                label: copy.stateComponentsReviewRequired,
                value: String(stateComponentsDeliveryGallery.summary.reviewRequiredCount),
              },
              {
                detail: copy.stateComponentsReadiness,
                label: copy.stateComponentsBlocked,
                value: String(stateComponentsDeliveryGallery.summary.blockedCount),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <p style={boundaryStyle}>
            {copy.stateComponentsTopNextAction}:{" "}
            {getLocalizedText(stateComponentsDeliveryGallery.summary.topNextAction, locale)}
          </p>

          <div style={sectionGridStyle}>
            {stateComponentsDeliveryGallery.families.map((family) => (
              <article key={family.id} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{copy.stateComponentsSource}: {family.sourceReference}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(family.label, locale)}
                    </h4>
                  </div>
                  <Badge label={settingsOwnerLabel(family.ownerRole)} tone="info" />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.stateComponentsDescription}: {getLocalizedText(family.description, locale)}
                </p>
                <div>
                  <p style={statLabelStyle}>{copy.stateComponentsExamples}</p>
                  <ul style={listStyle}>
                    {family.examples.map((example) => (
                      <li
                        key={example.id}
                        style={{
                          ...listItemStyle,
                          alignItems: "stretch",
                          background: "#ffffff",
                          border: "1px solid #dbe6f4",
                          borderRadius: 8,
                          display: "grid",
                          gap: 8,
                          padding: 12,
                        }}
                      >
                        <div style={headingRowStyle}>
                          <strong style={{ color: "#071426", lineHeight: 1.25 }}>
                            {getLocalizedText(example.label, locale)}
                          </strong>
                          <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <PublishStateBadge
                              label={stateComponentReadinessLabel(example.readiness, copy)}
                              state={stateComponentReadinessBadgeState(example.readiness)}
                            />
                            <Badge label={settingsOwnerLabel(example.ownerRole)} tone="neutral" />
                          </span>
                        </div>
                        <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                          {copy.stateComponentsMeaning}: {getLocalizedText(example.meaning, locale)}
                        </p>
                        <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                          {copy.stateComponentsMessage}: {getLocalizedText(example.userMessage, locale)}
                        </p>
                        <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                          {copy.stateComponentsNextAction}: {getLocalizedText(example.nextAction, locale)}
                        </p>
                        <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                          {copy.stateComponentsSource}: {example.sourceReference}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div>
            <p style={statLabelStyle}>{copy.stateComponentsSourceReferences}</p>
            <ul style={compactListStyle}>
              {stateComponentsDeliveryGallery.sourceReferences.map((sourceReference) => (
                <li key={sourceReference} style={chipStyle}>
                  {sourceReference}
                </li>
              ))}
            </ul>
          </div>

          <p style={boundaryStyle}>
            {copy.stateComponentsBoundary}: {getLocalizedText(stateComponentsDeliveryGallery.boundary, locale)}
          </p>
        </section>
      )}

      {activeWorkspace === "participants" && (
        <>
        <section aria-label={copy.participantOperations} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.workspaceParticipants}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.participantOperations}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.participantOperationsSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={`${participantOperations.summary.reviewRequiredParticipants} ${copy.participantReviewRequired}`}
              state={participantOperations.summary.blockedParticipants > 0 ? "blocker" : "warning"}
            />
          </div>

          <div aria-label={copy.participantSummary} style={gridStyle}>
            {[
              {
                detail: `${participantOperations.summary.aaWalletParticipants} AA / ${participantOperations.summary.eoaWalletParticipants} EOA`,
                label: copy.participantWalletMix,
                value: String(participantOperations.summary.totalParticipants),
              },
              {
                detail: copy.participantEligible,
                label: copy.participantExportReady,
                value: String(participantOperations.summary.exportReadyParticipants),
              },
              {
                detail: `${participantOperations.summary.riskFlaggedParticipants} ${copy.participantRiskFlags}`,
                label: copy.participantReviewRequired,
                value: String(participantOperations.summary.reviewRequiredParticipants),
              },
              {
                detail: copy.participantTaskProgress,
                label: copy.participantBlocked,
                value: String(participantOperations.summary.blockedParticipants),
              },
              {
                detail: copy.participantExportPosture,
                label: copy.participantPending,
                value: String(participantOperations.summary.pendingParticipants),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.participantLocaleMix}</h4>
            <div style={gridStyle}>
              {campaign.supportedLocales.map((supportedLocale) => (
                <div key={supportedLocale}>
                  <p style={statLabelStyle}>{supportedLocale}</p>
                  <p style={{ ...statValueStyle, fontSize: 20 }}>
                    {participantOperations.summary.localeCounts[supportedLocale]}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <div aria-label={copy.participantRowList} style={sectionGridStyle}>
            {participantOperations.rows.map((row) => (
              <article key={row.participantId} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{row.participantId}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0", overflowWrap: "anywhere" }}>
                      {row.walletAddress}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={getLocalizedText(row.exportStatusLabel, locale)}
                    state={participantExportBadgeState(row.exportStatus)}
                  />
                </div>

                <div style={gridStyle}>
                  <div>
                    <p style={statLabelStyle}>{copy.participantAccount}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {row.accountType}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.participantWalletSource}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {row.walletSource}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.participantLocale}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {row.localePreference}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.participantTaskProgress}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {getLocalizedText(row.taskProgressLabel, locale)}
                    </p>
                  </div>
                </div>

                <div>
                  <p style={statLabelStyle}>{copy.participantRiskFlags}</p>
                  <ul style={compactListStyle}>
                    {(row.riskFlags.length > 0 ? row.riskFlags : [copy.participantNoRiskFlags]).map((riskFlag) => (
                      <li key={`${row.participantId}-${riskFlag}`} style={chipStyle}>
                        {riskFlag}
                      </li>
                    ))}
                  </ul>
                </div>

                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.participantNextAction}: {getLocalizedText(row.nextAction, locale)}
                </p>
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.participantRewardBoundary}: {getLocalizedText(row.rewardBoundary, locale)}
                </p>
              </article>
            ))}
          </div>

          <p style={boundaryStyle}>{getLocalizedText(participantOperations.boundary, locale)}</p>
        </section>
        <section aria-label={copy.pointsRankingReferralReadiness} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.pointsRankingReferralSummary}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.pointsRankingReferralReadiness}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.pointsRankingReferralSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={`${pointsRankingReferralReadiness.summary.reviewRequiredLanes} ${copy.pointsRankingReferralReviewRequired}`}
              state={
                pointsRankingReferralReadiness.summary.blockedLanes > 0
                  ? "blocker"
                  : pointsRankingReferralReadiness.summary.reviewRequiredLanes > 0
                    ? "warning"
                    : "ready"
              }
            />
          </div>

          <div aria-label={copy.pointsRankingReferralSummary} style={gridStyle}>
            {[
              {
                detail: `${pointsRankingReferralReadiness.summary.localOnlyLanes} ${copy.pointsRankingReferralLocalOnly}`,
                label: copy.pointsRankingReferralTotalLanes,
                value: String(pointsRankingReferralReadiness.summary.totalLanes),
              },
              {
                detail: `${pointsRankingReferralReadiness.summary.readyLanes} ${copy.pointsRankingReferralReady}`,
                label: copy.pointsRankingReferralRawInvites,
                value: String(pointsRankingReferralReadiness.summary.totalRawInvites),
              },
              {
                detail: `${pointsRankingReferralReadiness.summary.reviewRequiredLanes} ${copy.pointsRankingReferralReviewRequired}`,
                label: copy.pointsRankingReferralQualifiedInvitees,
                value: String(pointsRankingReferralReadiness.summary.totalQualifiedInvitees),
              },
              {
                detail: getLocalizedText(pointsRankingReferralReadiness.summary.topNextAction, locale),
                label: copy.pointsRankingReferralReferralPoints,
                value: String(pointsRankingReferralReadiness.summary.totalReferralPoints),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <div aria-label={copy.pointsRankingReferralLaneList} style={compactSectionGridStyle}>
            {pointsRankingReferralReadiness.lanes.map((lane) => (
              <article key={lane.id} style={{ ...workflowStyle, minHeight: 0, overflowWrap: "anywhere" }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{getLocalizedText(lane.metricLabel, locale)}: {lane.metricValue}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0", wordBreak: "break-word" }}>
                      {getLocalizedText(lane.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={pointsRankingReferralReadinessLabel(lane.readiness, copy)}
                    state={pointsRankingReferralReadinessBadgeState(lane.readiness)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(lane.description, locale)}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={`${copy.pointsRankingReferralOwner}: ${readableCode(lane.ownerRole)}`} tone="info" />
                  <Badge label={`${copy.pointsRankingReferralSource}: ${getLocalizedText(lane.sourceSurface, locale)}`} tone="neutral" />
                </div>
                <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.pointsRankingReferralEvidence}: {getLocalizedText(lane.evidence, locale)}
                </p>
                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.pointsRankingReferralNextAction}: {getLocalizedText(lane.nextAction, locale)}
                </p>
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.pointsRankingReferralBoundary}: {getLocalizedText(lane.boundary, locale)}
                </p>
              </article>
            ))}
          </div>

          <p style={boundaryStyle}>{getLocalizedText(pointsRankingReferralReadiness.boundary, locale)}</p>
        </section>
        </>
      )}

      {activeWorkspace === "analytics" && (
      <section aria-label={copy.analyticsExportDecision} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.analyticsExport}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.analyticsExportDecision}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.analyticsExportDecisionSubtitle}
            </p>
          </div>
          <PublishStateBadge label={copy.analyticsExportAction} state="warning" />
        </div>

        <div style={gridStyle}>
          {exportDecision.kpis.map((kpi) => (
            <article key={kpi.id} style={cardStyle}>
              <p style={statLabelStyle}>{getLocalizedText(kpi.label, locale)}</p>
              <p style={statValueStyle}>{kpi.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {getLocalizedText(kpi.trend, locale)}
              </p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.dropOffPoint}</h4>
            <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(exportDecision.dropOffPoint, locale)}
            </p>
            <ol style={{ display: "grid", gap: 8, margin: 0, paddingInlineStart: 18 }}>
              {exportDecision.funnel.map((step) => (
                <li key={step.id} style={{ color: "#475569", fontSize: 13 }}>
                  <strong>{getLocalizedText(step.label, locale)}</strong>:{" "}
                  {formatNumber(step.count)} / {step.conversionRate}%
                </li>
              ))}
            </ol>
          </article>

          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.walletSplit}</h4>
            {exportDecision.walletSplit.map((split) => (
              <div key={split.id} style={listItemStyle}>
                <span>{split.label}</span>
                <strong>{split.count} / {split.percentage}%</strong>
              </div>
            ))}
            <h4 style={{ fontSize: 18, margin: "8px 0 0" }}>{copy.localeCoverage}</h4>
            {exportDecision.localeSplit.map((split) => (
              <div key={split.id} style={listItemStyle}>
                <span>{split.label}</span>
                <strong>{split.count} / {split.percentage}%</strong>
              </div>
            ))}
          </article>
        </div>

        <section aria-label={copy.advancedAnalyticsReadiness} style={{ display: "grid", gap: 14 }}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.advancedAnalyticsSummary}</p>
              <h4 style={{ fontSize: 20, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.advancedAnalyticsReadiness}
              </h4>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.advancedAnalyticsReadinessSubtitle}
              </p>
            </div>
            <PublishStateBadge label={copy.apiSkillReadinessLocalOnly} state="warning" />
          </div>

          <div style={gridStyle}>
            {[
              {
                detail: `${advancedAnalytics.summary.readyCohorts} ${copy.advancedAnalyticsReadyCohorts} / ${advancedAnalytics.summary.reviewRequiredCohorts} ${copy.advancedAnalyticsReviewCohorts}`,
                label: copy.advancedAnalyticsCohorts,
                value: String(advancedAnalytics.summary.totalCohorts),
              },
              {
                detail: getLocalizedText(
                  advancedAnalytics.retentionWindows.find((window) => window.id === "day7")?.qualityNote
                    ?? advancedAnalytics.summary.nextAction,
                  locale,
                ),
                label: copy.advancedAnalyticsDay7Retention,
                value: formatPercent(advancedAnalytics.summary.day7RetentionRate),
              },
              {
                detail: getLocalizedText(
                  advancedAnalytics.retentionWindows.find((window) => window.id === "day30")?.qualityNote
                    ?? advancedAnalytics.summary.nextAction,
                  locale,
                ),
                label: copy.advancedAnalyticsDay30Retention,
                value: formatPercent(advancedAnalytics.summary.day30RetentionRate),
              },
              {
                detail: getLocalizedText(advancedAnalytics.realUserQuality.explanation, locale),
                label: copy.advancedAnalyticsRealUserQualityScore,
                value: `${advancedAnalytics.summary.averageRealUserScore}/100`,
              },
              {
                detail: `${advancedAnalytics.costEfficiency.verifiedActionCount} ${copy.advancedAnalyticsVerifiedActions}`,
                label: copy.advancedAnalyticsCostPerVerifiedAction,
                value: advancedAnalytics.summary.costPerVerifiedAction,
              },
              {
                detail: `${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} ${copy.advancedAnalyticsPremiumReadyReports}`,
                label: copy.advancedAnalyticsProductConversion,
                value: `${advancedAnalytics.summary.productConversionCoverage} ${copy.advancedAnalyticsProductCoverage}`,
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={{ ...statValueStyle, fontSize: 22, overflowWrap: "anywhere" }}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <h5 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsCohortSegments}</h5>
                <PublishStateBadge
                  label={`${advancedAnalytics.summary.reviewRequiredCohorts} ${copy.apiSkillReadinessReviewRequired}`}
                  state={advancedAnalytics.summary.reviewRequiredCohorts > 0 ? "warning" : "ready"}
                />
              </div>
              <ul style={listStyle}>
                {advancedAnalytics.cohorts.map((cohort) => (
                  <li
                    key={cohort.id}
                    style={{
                      ...listItemStyle,
                      alignItems: "flex-start",
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: 10,
                    }}
                  >
                    <span style={{ display: "grid", flex: "1 1 260px", gap: 5, minWidth: 0 }}>
                      <strong style={{ overflowWrap: "anywhere" }}>
                        {getLocalizedText(cohort.label, locale)}
                      </strong>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                        {copy.advancedAnalyticsAudience}: {getLocalizedText(cohort.audienceSummary, locale)}
                      </span>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                        {copy.advancedAnalyticsWalletMix}: {cohort.participantCount} / {getLocalizedText(cohort.walletMix, locale)}
                      </span>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                        {copy.advancedAnalyticsRetentionSignal}: {getLocalizedText(cohort.retentionSignal, locale)}
                      </span>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                        {copy.advancedAnalyticsConversionSignal}: {getLocalizedText(cohort.conversionSignal, locale)}
                      </span>
                      <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
                        {copy.advancedAnalyticsNextAction}: {getLocalizedText(cohort.nextAction, locale)}
                      </span>
                    </span>
                    <span style={{ alignItems: "flex-end", display: "grid", gap: 6, justifyItems: "end" }}>
                      <PublishStateBadge
                        label={advancedAnalyticsReadinessLabel(cohort.qualityState, copy)}
                        state={advancedAnalyticsReadinessState(cohort.qualityState)}
                      />
                      <span style={{ color: "#475569", fontSize: 12, lineHeight: 1.35, maxWidth: 220, textAlign: "right" }}>
                        {copy.advancedAnalyticsRiskReview}: {getLocalizedText(cohort.riskReviewState, locale)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h5 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsRetentionWindows}</h5>
              {advancedAnalytics.retentionWindows.map((window) => (
                <div key={window.id} style={{ display: "grid", gap: 6 }}>
                  <div style={listItemStyle}>
                    <strong>{copy.advancedAnalyticsSampleBasis}</strong>
                    <PublishStateBadge
                      label={`${getLocalizedText(window.label, locale)}: ${formatPercent(window.rate)} / ${window.repeatActionCount}`}
                      state="warning"
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsSampleBasis}: {getLocalizedText(window.sampleBasis, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsEvidenceGap}: {getLocalizedText(window.evidenceGap, locale)}
                  </p>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #e2e8f0", display: "grid", gap: 6, paddingTop: 10 }}>
                <p style={statLabelStyle}>{copy.advancedAnalyticsRealUserQualityScore}</p>
                <p style={{ ...statValueStyle, fontSize: 22 }}>{advancedAnalytics.realUserQuality.score}/100</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(advancedAnalytics.realUserQuality.nextAction, locale)}
                </p>
                <PublishStateBadge
                  label={advancedAnalyticsReadinessLabel(advancedAnalytics.realUserQuality.state, copy)}
                  state={advancedAnalyticsReadinessState(advancedAnalytics.realUserQuality.state)}
                />
              </div>
            </article>
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <h5 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsCostEfficiency}</h5>
                <PublishStateBadge label={copy.apiSkillReadinessLocalOnly} state="warning" />
              </div>
              <div style={gridStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.advancedAnalyticsRewardBudget}</p>
                  <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
                    {advancedAnalytics.costEfficiency.rewardBudget}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.advancedAnalyticsVerifiedActions}</p>
                  <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
                    {advancedAnalytics.costEfficiency.verifiedActionCount}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.advancedAnalyticsCostEfficiency}</p>
                  <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
                    {advancedAnalytics.costEfficiency.costPerVerifiedAction}
                  </p>
                </div>
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.advancedAnalyticsQualityNote}: {getLocalizedText(advancedAnalytics.costEfficiency.qualityNote, locale)}
              </p>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h5 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsProductConversionRows}</h5>
              <ul style={listStyle}>
                {advancedAnalytics.productConversions.map((product) => (
                  <li key={product.id} style={{ ...listItemStyle, alignItems: "flex-start" }}>
                    <span style={{ display: "grid", flex: "1 1 210px", gap: 4, minWidth: 0 }}>
                      <strong>{getLocalizedText(product.productName, locale)}</strong>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
                        {copy.advancedAnalyticsActionFamily}: {getLocalizedText(product.actionFamily, locale)}
                      </span>
                      <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
                        {copy.advancedAnalyticsEvidenceGap}: {getLocalizedText(product.evidenceGap, locale)}
                      </span>
                      <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>
                        {copy.advancedAnalyticsNextAction}: {getLocalizedText(product.nextAction, locale)}
                      </span>
                    </span>
                    <span style={{ alignItems: "flex-end", display: "grid", gap: 6, justifyItems: "end" }}>
                      <strong>{formatNumber(product.convertedCount)} / {formatPercent(product.conversionRate)}</strong>
                      <PublishStateBadge
                        label={advancedAnalyticsReadinessLabel(product.readiness, copy)}
                        state={advancedAnalyticsReadinessState(product.readiness)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <section style={{ display: "grid", gap: 12, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <h5 style={{ fontSize: 18, margin: 0 }}>{copy.advancedAnalyticsPremiumReadiness}</h5>
              <PublishStateBadge
                label={`${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} ${copy.apiSkillReadinessLocalOnly}`}
                state="warning"
              />
            </div>
            <div style={sectionGridStyle}>
              {advancedAnalytics.premiumReports.map((report) => (
                <article key={report.id} style={workflowStyle}>
                  <div style={headingRowStyle}>
                    <strong>{getLocalizedText(report.label, locale)}</strong>
                    <PublishStateBadge
                      label={advancedAnalyticsReadinessLabel(report.readiness, copy)}
                      state={advancedAnalyticsReadinessState(report.readiness)}
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsCoverage}: {getLocalizedText(report.coverage, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsGap}: {getLocalizedText(report.gap, locale)}
                  </p>
                  <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsOwner}: {getLocalizedText(report.ownerRole, locale)}
                  </p>
                  <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.advancedAnalyticsNextAction}: {getLocalizedText(report.nextAction, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <p style={boundaryStyle}>
            {copy.advancedAnalyticsBoundary}: {getLocalizedText(advancedAnalytics.boundary, locale)}
          </p>
        </section>

        <div
          aria-label={copy.localeAnalyticsReadiness}
          style={{ display: "grid", gap: 12, minHeight: 0 }}
        >
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.localeAnalyticsReadiness}</p>
              <h4 style={{ fontSize: 18, margin: "4px 0" }}>{copy.localeAnalyticsReadiness}</h4>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.localeAnalyticsReadinessSubtitle}
              </p>
            </div>
            <PublishStateBadge label={copy.apiSkillReadinessLocalOnly} state="warning" />
          </div>
          <div style={sectionGridStyle}>
            {campaign.supportedLocales.map((supportedLocale) => (
              <article key={supportedLocale} style={{ ...workflowStyle, minHeight: 0 }}>
                <h5 style={{ fontSize: 16, margin: 0 }}>{supportedLocale}</h5>
                <div style={{ display: "grid", gap: 8 }}>
                  {localeAnalyticsReadiness
                    .filter((row) => row.locale === supportedLocale)
                    .map((row) => (
                      <div key={row.id} style={listItemStyle}>
                        <span style={{ color: "#475569", fontSize: 13, fontWeight: 800 }}>
                          {getLocalizedText(row.label, locale)}
                        </span>
                        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <strong>{row.value}</strong>
                          <PublishStateBadge
                            label={row.readiness === "warning" ? copy.warning : copy.apiSkillReadinessReady}
                            state={publishStateBadgeState(row.readiness)}
                          />
                        </span>
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
          <p style={boundaryStyle}>{copy.localeAnalyticsBoundary}</p>
        </div>

        <p style={boundaryStyle}>{getLocalizedText(commandCenter.boundary, locale)}</p>
      </section>
      )}

      {activeWorkspace === "aiContent" && (
        <>
      <section aria-label={copy.aiOptimizationSummary} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.aiOptimizationReviewInput}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {getLocalizedText(aiOptimizationSummary.title, locale)}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.aiOptimizationSubtitle}
            </p>
          </div>
          <PublishStateBadge label={copy.aiOptimizationReviewInput} state="warning" />
        </div>

        <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
          {getLocalizedText(aiOptimizationSummary.summary, locale)}
        </p>

        <div style={sectionGridStyle}>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.aiOptimizationRecommendedAction}</p>
            <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
              {getLocalizedText(aiOptimizationSummary.recommendedAction, locale)}
            </p>
          </article>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.aiOptimizationOwnerSafeNextAction}</p>
            <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
              {getLocalizedText(aiOptimizationSummary.nextAction, locale)}
            </p>
          </article>
        </div>

        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.aiOptimizationLocalOnlyBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(aiOptimizationSummary.boundary, locale)}
          </p>
          <p style={{ margin: "8px 0 0" }}>{copy.aiOptimizationNoAutoExecution}</p>
        </div>
      </section>

      <section aria-label={copy.aiOpsKpiAdoption} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.aiOpsKpiAdoption}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.aiOpsKpiAdoption}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.aiOpsKpiAdoptionSubtitle}
            </p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge label={`${aiOpsKpiAdoption.summary.totalMetrics} ${copy.aiOpsKpiTotal}`} tone="ai" />
            <PublishStateBadge
              label={`${aiOpsKpiAdoption.summary.reviewCount} ${copy.aiOpsKpiReview}`}
              state={aiOpsKpiAdoption.summary.reviewCount > 0 ? "warning" : "ready"}
            />
          </span>
        </div>

        <div style={gridStyle}>
          {[
            [copy.aiOpsKpiTotal, String(aiOpsKpiAdoption.summary.totalMetrics)],
            [copy.aiOpsKpiReady, String(aiOpsKpiAdoption.summary.readyCount)],
            [copy.aiOpsKpiReview, String(aiOpsKpiAdoption.summary.reviewCount)],
            [copy.aiOpsKpiBlocked, String(aiOpsKpiAdoption.summary.blockedCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.aiOpsKpiStrongestSignal}</p>
            <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
              {aiOpsKpiStrongestMetric
                ? getLocalizedText(aiOpsKpiStrongestMetric.label, locale)
                : aiOpsKpiAdoption.summary.strongestSignalMetricId}
            </p>
          </article>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.aiOpsKpiTopNextAction}</p>
            <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
              {getLocalizedText(aiOpsKpiAdoption.summary.topNextAction, locale)}
            </p>
          </article>
        </div>

        <div style={sectionGridStyle}>
          {aiOpsKpiAdoption.metrics.map((metric) => (
            <article key={metric.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{copy.aiOpsKpiValue}: {metric.value}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0", wordBreak: "break-word" }}>
                    {getLocalizedText(metric.label, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={aiOpsKpiReadinessLabel(metric.readiness, copy)}
                  state={aiOpsKpiReadinessState(metric.readiness)}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(metric.description, locale)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={`${copy.aiOpsKpiOwner}: ${readableCode(metric.ownerRole)}`} tone="info" />
                <Badge label={`${copy.aiOpsKpiSource}: ${getLocalizedText(metric.sourceSurface, locale)}`} tone="neutral" />
              </div>
              <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.aiOpsKpiTarget}: {getLocalizedText(metric.target, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.aiOpsKpiTrend}: {getLocalizedText(metric.trend, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.aiOpsKpiEvidence}: {getLocalizedText(metric.evidenceBasis, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.aiOpsKpiNextAction}: {getLocalizedText(metric.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>

        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.aiOpsKpiBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(aiOpsKpiAdoption.boundary, locale)}
          </p>
        </div>
      </section>

      <section aria-label={copy.aiContentPack} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.aiContent}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.aiContentPack}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.aiContentPackSubtitle}
            </p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge label={`${aiContentPack.summary.totalArtifacts} ${copy.aiContentArtifacts}`} tone="ai" />
            <PublishStateBadge
              label={`${aiContentPack.summary.blockedReleaseActions} ${copy.aiContentPublishBlocked}`}
              state={aiContentPack.summary.blockedReleaseActions > 0 ? "warning" : "ready"}
            />
          </span>
        </div>

        <p style={boundaryStyle}>{getLocalizedText(aiContentPack.boundary.body, locale)}</p>

        <div aria-label={copy.aiContentSummary} style={gridStyle}>
          {[
            [copy.aiContentTotalArtifacts, String(aiContentPack.summary.totalArtifacts)],
            [copy.aiContentHumanApproved, String(aiContentPack.summary.humanApproved)],
            [copy.aiContentAiDrafts, String(aiContentPack.summary.aiDrafts)],
            [copy.aiContentCopyReady, String(aiContentPack.summary.availableCopyActions)],
            [copy.aiContentPublishBlocked, String(aiContentPack.summary.blockedReleaseActions)],
            [copy.aiContentQualityBlockers, String(aiContentPack.summary.qualityGateBlockers)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.aiContentNextAction}</p>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(aiContentPack.summary.nextAction, locale)}
          </p>
        </div>

        <div style={sectionGridStyle}>
          {aiContentPack.artifacts.map((artifact) => (
            <article key={artifact.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{readableCode(artifact.type)}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(artifact.title, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={aiContentLifecycleLabel(artifact.lifecycle, copy)}
                  state={aiContentLifecycleState(artifact.lifecycle)}
                />
              </div>

              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(artifact.purpose, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(artifact.body, locale)}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={`${copy.aiContentChannel}: ${readableCode(artifact.channel)}`} tone="info" />
                <Badge
                  label={`${copy.aiContentRiskLevel}: ${artifact.riskLevel}`}
                  tone={artifact.riskLevel === "high" ? "warning" : "neutral"}
                />
                {Object.entries(artifact.localeStatus).map(([statusLocale, status]) => (
                  <LocaleStatusBadge
                    key={statusLocale}
                    label={`${statusLocale} ${localeStatusLabel(status, copy)}`}
                    status={status}
                  />
                ))}
                <ReviewSeverityBadge
                  label={artifact.reviewer ? `${copy.aiContentReviewer}: ${artifact.reviewer}` : copy.aiContentHumanReviewRequired}
                  severity={artifact.reviewer ? "info" : "warning"}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.copy,
                    copy.aiContentCopyReady,
                    copy.aiContentHumanReviewRequired,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.copy)}
                />
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.schedule,
                    copy.aiContentScheduleReady,
                    copy.aiContentPublishBlocked,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.schedule)}
                />
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.publish,
                    copy.aiContentPublishReady,
                    copy.aiContentPublishBlocked,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.publish)}
                />
              </div>

              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.aiContentNextAction}: {getLocalizedText(artifact.actionPolicy.nextAction, locale)}
              </p>
              {artifact.actionPolicy.blockedReason ? (
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(artifact.actionPolicy.blockedReason, locale)}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div style={headingRowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiContentQualityGates}</h3>
          <PublishStateBadge
            label={`${aiContentPack.summary.qualityGateBlockers} ${copy.blocker}`}
            state={aiContentPack.summary.qualityGateBlockers > 0 ? "blocker" : "ready"}
          />
        </div>

        <div style={sectionGridStyle}>
          {aiContentPack.qualityGates.map((gate) => (
            <article key={gate.id} style={{ ...cardStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <strong>{getLocalizedText(gate.label, locale)}</strong>
                <PublishStateBadge
                  label={readableCode(gate.status)}
                  state={aiContentQualityGateState(gate.status)}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(gate.evidence, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>
        </>
      )}

      {activeWorkspace === "create" && (
        <>
      {!stageReviewMode && (
        <>
      <section aria-label={copy.createWorkspaceStepper} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.workspaceCreate}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.createWorkspaceStepper}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.createWorkspaceStepperSummary}
            </p>
          </div>
          <PublishStateBadge label={copy.apiSkillReadinessLocalOnly} state="warning" />
        </div>

        <div aria-label={copy.createWorkspaceStepper} style={stepperStyle}>
          {createSteps.map((step, index) => (
            <article key={step.label} style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>
                {copy.createStepPrefix} {index + 1}
              </p>
              <div style={headingRowStyle}>
                <strong>{step.label}</strong>
                <PublishStateBadge
                  label={step.status === "ready" ? copy.apiSkillReadinessReady : copy.warning}
                  state={step.status}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {step.state}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.createDraftComposer} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.createDraftComposer}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.createDraftComposerTitle}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.createDraftLocalBoundary}
            </p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              aria-pressed={draftComposer.creationMode === "FORM_BASED"}
              onClick={() =>
                setDraftComposer((current) => ({
                  ...current,
                  creationMode: "FORM_BASED",
                }))
              }
              style={
                draftComposer.creationMode === "FORM_BASED"
                  ? selectedButtonStyle
                  : ghostButtonStyle
              }
              type="button"
            >
              {copy.createDraftFormMode}
            </button>
            <button
              aria-pressed={draftComposer.creationMode === "AI_ASSISTED"}
              onClick={() =>
                setDraftComposer((current) => ({
                  ...current,
                  creationMode: "AI_ASSISTED",
                }))
              }
              style={
                draftComposer.creationMode === "AI_ASSISTED"
                  ? selectedButtonStyle
                  : ghostButtonStyle
              }
              type="button"
            >
              {copy.createDraftAiAssistedMode}
            </button>
          </span>
        </div>

        <div style={compactSectionGridStyle}>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftCampaignName}</span>
            <input
              aria-label={copy.createDraftCampaignName}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  campaignName: event.target.value,
                }))
              }
              style={formControlStyle}
              value={draftComposer.campaignName}
            />
          </label>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftProjectName}</span>
            <input
              aria-label={copy.createDraftProjectName}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  projectName: event.target.value,
                }))
              }
              style={formControlStyle}
              value={draftComposer.projectName}
            />
          </label>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.builderObjective}</span>
            <select
              aria-label={copy.builderObjective}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  objective: event.target.value as CampaignObjective,
                }))
              }
              style={formControlStyle}
              value={draftComposer.objective}
            >
              {campaignObjectiveOptions.map((objective) => (
                <option key={objective} value={objective}>
                  {readableCode(objective)}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftStartDate}</span>
            <input
              aria-label={copy.createDraftStartDate}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              style={formControlStyle}
              type="date"
              value={draftComposer.startDate}
            />
          </label>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftEndDate}</span>
            <input
              aria-label={copy.createDraftEndDate}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              style={formControlStyle}
              type="date"
              value={draftComposer.endDate}
            />
          </label>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftTargetUsers}</span>
            <input
              aria-label={copy.createDraftTargetUsers}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  targetUsers: event.target.value,
                }))
              }
              style={formControlStyle}
              value={draftComposer.targetUsers}
            />
          </label>
        </div>

        <div style={compactSectionGridStyle}>
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <label style={fieldStyle}>
              <span style={controlLabelStyle}>{copy.builderAiPrompt}</span>
              <textarea
                aria-label={copy.builderAiPrompt}
                onChange={(event) =>
                  setDraftComposer((current) => ({
                    ...current,
                    aiPrompt: event.target.value,
                    aiReviewedByHuman: false,
                    creationMode: "AI_ASSISTED",
                  }))
                }
                style={textareaStyle}
                value={draftComposer.aiPrompt}
              />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                onClick={() =>
                  setDraftComposer((current) => {
                    const generatedOutline = generateLocalAiDraftOutline(current.aiPrompt);

                    return {
                      ...current,
                      aiPrompt: generatedOutline.prompt,
                      aiReviewedByHuman: false,
                      campaignName: generatedOutline.title,
                      creationMode: "AI_ASSISTED",
                      selectedTaskTemplateIds: catalogConfigured
                        ? []
                        : generatedOutline.selectedTaskTemplateIds,
                      targetUsers: generatedOutline.targetUsers.join(", "),
                    };
                  })
                }
                style={actionButtonStyle}
                type="button"
              >
                {copy.createDraftGenerateOutline}
              </button>
              <label style={{ ...checkboxRowStyle, color: "#334155", fontWeight: 800 }}>
                <input
                  checked={draftComposer.aiReviewedByHuman}
                  onChange={(event) =>
                    setDraftComposer((current) => ({
                      ...current,
                      aiReviewedByHuman: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                {copy.createDraftReviewAcknowledgement}
              </label>
              <PublishStateBadge
                label={
                  draftComposer.aiReviewedByHuman
                    ? copy.createDraftHumanReviewAcknowledged
                    : copy.createDraftHumanReviewRequired
                }
                state={draftComposer.aiReviewedByHuman ? "ready" : "warning"}
              />
            </div>
            <div aria-label={copy.createDraftOutlinePreview} style={{ display: "grid", gap: 8 }}>
              <p style={statLabelStyle}>{copy.createDraftOutlinePreview}</p>
              <ul style={listStyle}>
                {localAiOutline.generatedOutline.map((outlineItem) => (
                  <li
                    key={outlineItem}
                    style={{ ...listItemStyle, alignItems: "start", justifyContent: "start" }}
                  >
                    <span aria-hidden="true">-</span>
                    <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                      {outlineItem}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {!catalogConfigured ? (
          <article style={{ ...cardStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.createDraftTaskTemplates}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.createDraftTaskTemplatesSummary}
                </p>
              </div>
              <PublishStateBadge
                label={`${draftComposer.selectedTaskTemplateIds.length} ${copy.aiPlannerLaunchSelectedTaskCount}`}
                state={draftComposer.selectedTaskTemplateIds.length > 0 ? "ready" : "blocker"}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {taskTemplateLibrary.map((template) => (
                <label key={template.id} style={checkboxRowStyle}>
                  <input
                    aria-label={getLocalizedText(template.title, locale)}
                    checked={draftComposer.selectedTaskTemplateIds.includes(template.id)}
                    onChange={(event) =>
                      setDraftComposer((current) => {
                        const selectedTaskTemplateIds = event.target.checked
                          ? [...current.selectedTaskTemplateIds, template.id]
                          : current.selectedTaskTemplateIds.filter(
                              (templateId) => templateId !== template.id,
                            );

                        return {
                          ...current,
                          selectedTaskTemplateIds,
                        };
                      })
                    }
                    type="checkbox"
                  />
                  <span style={{ color: "#334155", fontSize: 13, fontWeight: 800 }}>
                    {getLocalizedText(template.title, locale)}
                  </span>
                  <WalletCompatibilityBadge compatibility={template.walletCompatibility} />
                </label>
              ))}
            </div>
          </article>
          ) : null}
        </div>

        <div style={compactSectionGridStyle}>
          <label style={fieldStyle}>
            <span style={controlLabelStyle}>{copy.createDraftWalletPolicy}</span>
            <select
              aria-label={copy.createDraftWalletPolicy}
              onChange={(event) =>
                setDraftComposer((current) => ({
                  ...current,
                  walletPolicy: event.target.value as WalletPolicy,
                }))
              }
              style={formControlStyle}
              value={draftComposer.walletPolicy}
            >
              {walletPolicyOptions.map((option) => (
                <option key={option.policy} value={option.policy}>
                  {getLocalizedText(option.label, locale)}
                </option>
              ))}
            </select>
          </label>

          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.createDraftSupportedLocales}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {editableCampaignLocales.map((supportedLocale) => (
                <label key={supportedLocale} style={checkboxRowStyle}>
                  <input
                    aria-label={supportedLocale}
                    checked={draftComposer.supportedLocales.includes(supportedLocale)}
                    disabled={supportedLocale === "en-US"}
                    onChange={(event) =>
                      setDraftComposer((current) => {
                        const supportedLocales = event.target.checked
                          ? [...current.supportedLocales, supportedLocale]
                          : current.supportedLocales.filter(
                              (currentLocale) => currentLocale !== supportedLocale,
                            );

                        return {
                          ...current,
                          supportedLocales: Array.from(
                            new Set<EditableCampaignLocale>(["en-US", ...supportedLocales]),
                          ),
                        };
                      })
                    }
                    type="checkbox"
                  />
                  <span style={{ color: "#334155", fontSize: 13, fontWeight: 800 }}>
                    {supportedLocale}
                  </span>
                </label>
              ))}
            </div>
            <div aria-label={copy.createDraftActiveLocales} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {builderDraft.supportedLocales.map((supportedLocale) => (
                <PublishStateBadge key={supportedLocale} label={supportedLocale} state="ready" />
              ))}
            </div>
          </article>

          <article style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.createDraftMode}</p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {copy.createDraftLocalBoundary}
            </p>
            <button
              onClick={() => setDraftComposer(createSeededDraftComposerState(!catalogConfigured))}
              style={ghostButtonStyle}
              type="button"
            >
              {copy.createDraftReset}
            </button>
          </article>
        </div>
      </section>
        </>
      )}

      <OwnerCampaignBuilderPanel
        copy={copy}
        draft={builderDraft}
        locale={locale}
        ownerWorkflow={ownerBuilderIntents}
      />

      {!stageReviewMode ? (
        <div
          aria-label={
            locale === "en-US" ? "Campaign Builder detail sections" : "活动构建器详情区块"
          }
          style={builderDetailsStyle}
        >
          <RewardsEligibilityBuilder draft={builderDraft} locale={locale} />
          <I18nContractReadiness campaign={campaign} locale={locale} />
          <PublishReadinessPanel draft={builderDraft} locale={locale} />
          <PublishGateDecisionCenter draft={builderDraft} locale={locale} />
        </div>
      ) : null}
        </>
      )}

      {activeWorkspace === "templates" && (
        <>
          {!stageReviewMode && (
            <>
          <section aria-label={copy.workspaceTemplates} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.workspaceTemplates}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.workspaceTemplates}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.templatesWorkspaceBoundary}
                </p>
              </div>
              <WalletCompatibilityBadge compatibility="ANY" />
            </div>
          </section>

          <section aria-label={copy.campaignTemplatePackTitle} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.campaignTemplatePackTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.campaignTemplatePackTitle}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.campaignTemplatePackSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${campaignTemplatePack.summary.totalTemplates} ${copy.campaignTemplatePackTotal}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${campaignTemplatePack.summary.reviewRequiredTemplateCount} ${copy.campaignTemplatePackReviewRequired}`}
                  state="warning"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.campaignTemplatePackTotal}</p>
                <p style={statValueStyle}>{campaignTemplatePack.summary.totalTemplates}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.campaignTemplatePackReadiness}</p>
                <p style={statValueStyle}>
                  {campaignTemplatePack.summary.readyTemplateCount}/
                  {campaignTemplatePack.summary.reviewRequiredTemplateCount}
                </p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.campaignTemplatePackNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(campaignTemplatePack.summary.topNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>{copy.campaignTemplatePackBoundary}</p>

            <div style={sectionGridStyle}>
              {campaignTemplatePack.templates.map((template) => (
                <article key={template.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.campaignTemplatePackSuitableFor}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(template.title, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={campaignTemplateReadinessLabel(template.readiness, copy)}
                      state={campaignTemplateReadinessState(template.readiness)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(template.goal, locale)}
                  </p>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.campaignTemplatePackSuitableFor}: </strong>
                    {getLocalizedText(template.suitableFor, locale)}
                  </p>

                  <div style={{ display: "grid", gap: 6 }}>
                    <p style={statLabelStyle}>{copy.campaignTemplatePackTaskSequence}</p>
                    <ol style={{ ...compactListStyle, listStyle: "none" }}>
                      {template.taskSequence.map((step, index) => (
                        <li key={step.id} style={chipStyle}>
                          {index + 1}. {getLocalizedText(step.label, locale)}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <WalletCompatibilityBadge compatibility={template.defaultWalletPolicy} />
                    <Badge
                      label={`${copy.campaignTemplatePackOwner}: ${campaignTemplateOwnerLabel(template.ownerRole, locale)}`}
                      tone="info"
                    />
                  </div>

                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.campaignTemplatePackNextAction}: </strong>
                    {getLocalizedText(template.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.campaignTemplatePackRewardBoundary}: </strong>
                    {getLocalizedText(template.rewardBoundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>
            </>
          )}

          <OwnerTaskTemplateLibrary
            catalogBridge={taskTemplateCatalogBridge}
            catalogMode={taskTemplateCatalogMode}
            catalogSessionKey={resolvedTaskTemplateCatalogSessionKey}
            locale={locale}
            ownerWorkflow={ownerTaskIntents}
          />

          {!stageReviewMode && (
            <>
          <section aria-label={copy.forestTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.forestTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.forestTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.forestTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${forestTaskReadiness.summary.readyCount} ${copy.forestTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${forestTaskReadiness.summary.reviewRequiredCount} ${copy.forestTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${forestTaskReadiness.summary.blockedCount} ${copy.forestTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forestTaskTotal}</p>
                <p style={statValueStyle}>{forestTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forestTaskReady}</p>
                <p style={statValueStyle}>{forestTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forestTaskReviewRequired}</p>
                <p style={statValueStyle}>{forestTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forestTaskBlocked}</p>
                <p style={statValueStyle}>{forestTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.forestTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(forestTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.forestTaskBoundary}: </strong>
              {getLocalizedText(forestTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {forestTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.forestTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={forestTaskReadinessLabel(row.readinessState, copy)}
                      state={forestTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.forestTaskProviderState}: ${forestTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.forestTaskOwner}: ${forestTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forestTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forestTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forestTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.ebridgeTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.ebridgeTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.ebridgeTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.ebridgeTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${ebridgeTaskReadiness.summary.readyCount} ${copy.ebridgeTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${ebridgeTaskReadiness.summary.reviewRequiredCount} ${copy.ebridgeTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${ebridgeTaskReadiness.summary.blockedCount} ${copy.ebridgeTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.ebridgeTaskTotal}</p>
                <p style={statValueStyle}>{ebridgeTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.ebridgeTaskReady}</p>
                <p style={statValueStyle}>{ebridgeTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.ebridgeTaskReviewRequired}</p>
                <p style={statValueStyle}>{ebridgeTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.ebridgeTaskBlocked}</p>
                <p style={statValueStyle}>{ebridgeTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.ebridgeTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(ebridgeTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.ebridgeTaskBoundary}: </strong>
              {getLocalizedText(ebridgeTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {ebridgeTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.ebridgeTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={ebridgeTaskReadinessLabel(row.readinessState, copy)}
                      state={ebridgeTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.ebridgeTaskProviderState}: ${ebridgeTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.ebridgeTaskOwner}: ${ebridgeTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.ebridgeTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.ebridgeTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.ebridgeTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.awakenTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.awakenTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.awakenTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.awakenTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${awakenTaskReadiness.summary.readyCount} ${copy.awakenTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${awakenTaskReadiness.summary.reviewRequiredCount} ${copy.awakenTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${awakenTaskReadiness.summary.blockedCount} ${copy.awakenTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.awakenTaskTotal}</p>
                <p style={statValueStyle}>{awakenTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.awakenTaskReady}</p>
                <p style={statValueStyle}>{awakenTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.awakenTaskReviewRequired}</p>
                <p style={statValueStyle}>{awakenTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.awakenTaskBlocked}</p>
                <p style={statValueStyle}>{awakenTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.awakenTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(awakenTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.awakenTaskBoundary}: </strong>
              {getLocalizedText(awakenTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {awakenTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.awakenTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={awakenTaskReadinessLabel(row.readinessState, copy)}
                      state={awakenTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.awakenTaskProviderState}: ${awakenTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.awakenTaskOwner}: ${awakenTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.awakenTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.awakenTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.awakenTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.schrodingerTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.schrodingerTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.schrodingerTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.schrodingerTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${schrodingerTaskReadiness.summary.readyCount} ${copy.schrodingerTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${schrodingerTaskReadiness.summary.reviewRequiredCount} ${copy.schrodingerTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${schrodingerTaskReadiness.summary.blockedCount} ${copy.schrodingerTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.schrodingerTaskTotal}</p>
                <p style={statValueStyle}>{schrodingerTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.schrodingerTaskReady}</p>
                <p style={statValueStyle}>{schrodingerTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.schrodingerTaskReviewRequired}</p>
                <p style={statValueStyle}>{schrodingerTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.schrodingerTaskBlocked}</p>
                <p style={statValueStyle}>{schrodingerTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.schrodingerTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(schrodingerTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.schrodingerTaskBoundary}: </strong>
              {getLocalizedText(schrodingerTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {schrodingerTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.schrodingerTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={schrodingerTaskReadinessLabel(row.readinessState, copy)}
                      state={schrodingerTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.schrodingerTaskProviderState}: ${schrodingerTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.schrodingerTaskOwner}: ${schrodingerTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.schrodingerTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.schrodingerTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.schrodingerTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.daippTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.daippTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.daippTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.daippTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${daippTaskReadiness.summary.readyCount} ${copy.daippTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${daippTaskReadiness.summary.reviewRequiredCount} ${copy.daippTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${daippTaskReadiness.summary.blockedCount} ${copy.daippTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.daippTaskTotal}</p>
                <p style={statValueStyle}>{daippTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.daippTaskReady}</p>
                <p style={statValueStyle}>{daippTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.daippTaskReviewRequired}</p>
                <p style={statValueStyle}>{daippTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.daippTaskBlocked}</p>
                <p style={statValueStyle}>{daippTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.daippTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(daippTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.daippTaskBoundary}: </strong>
              {getLocalizedText(daippTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {daippTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.daippTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={daippTaskReadinessLabel(row.readinessState, copy)}
                      state={daippTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.daippTaskProviderState}: ${daippTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.daippTaskOwner}: ${daippTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.daippTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.daippTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.daippTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.forecastTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.forecastTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.forecastTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.forecastTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${forecastTaskReadiness.summary.readyCount} ${copy.forecastTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${forecastTaskReadiness.summary.reviewRequiredCount} ${copy.forecastTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${forecastTaskReadiness.summary.blockedCount} ${copy.forecastTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forecastTaskTotal}</p>
                <p style={statValueStyle}>{forecastTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forecastTaskReady}</p>
                <p style={statValueStyle}>{forecastTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forecastTaskReviewRequired}</p>
                <p style={statValueStyle}>{forecastTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.forecastTaskBlocked}</p>
                <p style={statValueStyle}>{forecastTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.forecastTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(forecastTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.forecastTaskBoundary}: </strong>
              {getLocalizedText(forecastTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {forecastTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.forecastTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={forecastTaskReadinessLabel(row.readinessState, copy)}
                      state={forecastTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.forecastTaskProviderState}: ${forecastTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "ready" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.forecastTaskOwner}: ${forecastTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forecastTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forecastTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.forecastTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.payTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.payTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.payTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.payTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${payTaskReadiness.summary.readyCount} ${copy.payTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${payTaskReadiness.summary.reviewRequiredCount} ${copy.payTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${payTaskReadiness.summary.blockedCount} ${copy.payTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.payTaskTotal}</p>
                <p style={statValueStyle}>{payTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.payTaskReady}</p>
                <p style={statValueStyle}>{payTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.payTaskReviewRequired}</p>
                <p style={statValueStyle}>{payTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.payTaskBlocked}</p>
                <p style={statValueStyle}>{payTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.payTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(payTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.payTaskBoundary}: </strong>
              {getLocalizedText(payTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {payTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.payTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={payTaskReadinessLabel(row.readinessState, copy)}
                      state={payTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.payTaskProviderState}: ${payTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.payTaskOwner}: ${payTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.payTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.payTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.payTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label={copy.tmrwdaoTaskReadiness} style={panelStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskTotal}</p>
                <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.tmrwdaoTaskReadiness}
                </h3>
                <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {copy.tmrwdaoTaskReadinessSubtitle}
                </p>
              </div>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <PublishStateBadge
                  label={`${tmrwdaoTaskReadiness.summary.readyCount} ${copy.tmrwdaoTaskReady}`}
                  state="ready"
                />
                <PublishStateBadge
                  label={`${tmrwdaoTaskReadiness.summary.reviewRequiredCount} ${copy.tmrwdaoTaskReviewRequired}`}
                  state="warning"
                />
                <PublishStateBadge
                  label={`${tmrwdaoTaskReadiness.summary.blockedCount} ${copy.tmrwdaoTaskBlocked}`}
                  state="blocker"
                />
              </span>
            </div>

            <div style={gridStyle}>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskTotal}</p>
                <p style={statValueStyle}>{tmrwdaoTaskReadiness.summary.totalTasks}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskReady}</p>
                <p style={statValueStyle}>{tmrwdaoTaskReadiness.summary.readyCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskReviewRequired}</p>
                <p style={statValueStyle}>{tmrwdaoTaskReadiness.summary.reviewRequiredCount}</p>
              </article>
              <article style={cardStyle}>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskBlocked}</p>
                <p style={statValueStyle}>{tmrwdaoTaskReadiness.summary.blockedCount}</p>
              </article>
              <article style={{ ...cardStyle, gridColumn: "1 / -1", minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.tmrwdaoTaskNextAction}</p>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(tmrwdaoTaskReadiness.ownerNextAction, locale)}
                </p>
              </article>
            </div>

            <p style={boundaryStyle}>
              <strong>{copy.tmrwdaoTaskBoundary}: </strong>
              {getLocalizedText(tmrwdaoTaskReadiness.boundary, locale)}
            </p>

            <div style={compactSectionGridStyle}>
              {tmrwdaoTaskReadiness.rows.map((row) => (
                <article key={row.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={statLabelStyle}>{copy.tmrwdaoTaskProviderState}</p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(row.label, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={tmrwdaoTaskReadinessLabel(row.readinessState, copy)}
                      state={tmrwdaoTaskReadinessBadgeState(row.readinessState)}
                    />
                  </div>

                  <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(row.description, locale)}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <Badge
                      label={`${row.verificationType} · ${row.evidenceSource}`}
                      tone="info"
                    />
                    <Badge
                      label={`${copy.tmrwdaoTaskProviderState}: ${tmrwdaoTaskProviderStateLabel(row.providerState, locale)}`}
                      tone={row.providerState === "seeded_preview" ? "success" : "warning"}
                    />
                    <Badge
                      label={`${copy.tmrwdaoTaskOwner}: ${tmrwdaoTaskOwnerLabel(row.ownerRole, locale)}`}
                      tone="neutral"
                    />
                  </div>

                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.tmrwdaoTaskRiskState}: </strong>
                    {getLocalizedText(row.riskState, locale)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.tmrwdaoTaskNextAction}: </strong>
                    {getLocalizedText(row.nextAction, locale)}
                  </p>
                  <p style={{ color: "#9a3412", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    <strong>{copy.tmrwdaoTaskBoundary}: </strong>
                    {getLocalizedText(row.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Task readiness preview" style={panelStyle}>
            <div style={headingRowStyle}>
              <h3 style={{ fontSize: 20, margin: 0 }}>{copy.taskBuilder}</h3>
              <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                {campaign.tasks.length} tasks
              </span>
            </div>
            <ul style={listStyle}>
              {campaign.tasks.map((task) => (
                <li key={task.id} style={listItemStyle}>
                  <span style={{ display: "grid", gap: 3 }}>
                    <strong>{getLocalizedText(task.title, locale)}</strong>
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      {task.verificationType} · {task.points} pts · {task.riskLevel}
                    </span>
                  </span>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <WalletCompatibilityBadge compatibility={task.walletCompatibility} />
                    {Object.entries(task.localeStatus).map(([statusLocale, status]) => (
                      <LocaleStatusBadge
                        key={statusLocale}
                        label={`${statusLocale} ${localeStatusLabel(status, copy)}`}
                        status={status}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
            </>
          )}
        </>
      )}

      {activeWorkspace === "export" && (
        <>
      <section aria-label={copy.exportWorkspaceDecision} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.workspaceExport}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.exportWorkspaceDecision}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.exportWorkspaceDecisionSubtitle}
            </p>
          </div>
          <PublishStateBadge label={copy.analyticsExportAction} state="warning" />
        </div>

        <div style={sectionGridStyle}>
          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.rowStatusCounts}</h4>
            <p style={{ ...statValueStyle, fontSize: 22 }}>
              {exportDecision.readyRows} / {exportDecision.reviewRequiredRows} / {exportDecision.blockedRows}
            </p>
            <div style={gridStyle}>
              <div>
                <p style={statLabelStyle}>{copy.readyRows}</p>
                <PublishStateBadge label={String(exportDecision.readyRows)} state="ready" />
              </div>
              <div>
                <p style={statLabelStyle}>{copy.reviewRequiredRows}</p>
                <PublishStateBadge label={String(exportDecision.reviewRequiredRows)} state="warning" />
              </div>
              <div>
                <p style={statLabelStyle}>{copy.blockedRows}</p>
                <PublishStateBadge
                  label={String(exportDecision.blockedRows)}
                  state={exportDecision.blockedRows > 0 ? "blocker" : "ready"}
                />
              </div>
            </div>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {copy.exportBatch}: {exportDecision.exportBatchId}
            </p>
          </article>

          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.evidenceCoverage}</h4>
            <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(exportDecision.evidenceCoverage, locale)}
            </p>
          </article>
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.csvColumns}</p>
          <div style={tableWrapStyle}>
            <p style={{ color: "#071426", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0, minWidth: 680 }}>
              {exportDecision.exportColumns.join(",")}
            </p>
          </div>
        </div>

        <article aria-label={copy.exportDeliveryApiRegionLabel} style={{ ...workflowStyle, minHeight: 0 }}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.exportDeliveryApiStatus}</p>
              <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.exportDeliveryApiRegionLabel}
              </h4>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {exportDeliveryApiBaseUrl?.trim()
                  ? copy.exportDeliveryApiConfigured
                  : copy.exportDeliveryApiNotConfigured}
              </p>
            </div>
            <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PublishStateBadge
                label={exportDeliveryApiSourceLabel(exportDeliveryApiState.source, copy)}
                state={exportDeliveryApiBadgeState(exportDeliveryApiState.status)}
              />
              <PublishStateBadge
                label={exportDeliveryApiStatusLabel(exportDeliveryApiState.status, copy)}
                state={exportDeliveryApiBadgeState(exportDeliveryApiState.status)}
              />
            </span>
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.exportDeliveryApiTraceId}</p>
              <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, ...wrapTextStyle }}>
                {exportDeliveryApiState.traceId ?? copy.exportDeliveryApiNoTrace}
              </p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.exportDeliveryApiExportBatchId}</p>
              <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, ...wrapTextStyle }}>
                {exportDeliveryApiState.preview?.exportBatchId ?? exportArtifact?.batchId ?? copy.exportDeliveryApiNoPreview}
              </p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.exportDeliveryApiArtifactId}</p>
              <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, ...wrapTextStyle }}>
                {exportDeliveryApiState.artifactId ?? exportDeliveryApiState.registry?.artifactId ?? copy.exportDeliveryApiNoArtifact}
              </p>
            </article>
          </div>

          <button
            disabled={exportDeliveryApiReviewInFlight}
            onClick={runExportDeliveryApiReview}
            style={{
              ...actionButtonStyle,
              opacity: exportDeliveryApiReviewInFlight ? 0.72 : 1,
              cursor: exportDeliveryApiReviewInFlight ? "wait" : "pointer",
            }}
            type="button"
          >
            {exportDeliveryApiReviewInFlight
              ? copy.exportDeliveryApiLoading
              : copy.exportDeliveryApiReviewAction}
          </button>

          {exportDeliveryApiState.preview && (
            <div aria-label={copy.exportDeliveryApiPreviewRegistration} style={sectionGridStyle}>
              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiPreviewRegistration}</p>
                <strong style={{ ...wrapTextStyle }}>
                  {exportDeliveryApiState.preview.artifact?.fileName ?? copy.exportDeliveryApiNoPreview}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {exportDeliveryApiState.preview.format.toUpperCase()} · {exportDeliveryApiState.preview.artifact?.mimeType ?? "text/csv"}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.exportDeliveryApiRows}: {exportDeliveryApiState.preview.readyRows} / {exportDeliveryApiState.preview.reviewRequiredRows} / {exportDeliveryApiState.preview.blockedRows}
                </p>
              </article>

              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiChecksum}</p>
                <strong style={{ ...wrapTextStyle }}>
                  {exportDeliveryApiState.registry?.checksum ??
                    exportDeliveryApiState.preview.artifact?.metadata?.checksum ??
                    copy.exportDeliveryApiNoPreview}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {exportDeliveryApiState.registry?.checksumAlgorithm ??
                    exportDeliveryApiState.preview.artifact?.metadata?.checksumAlgorithm ??
                    "sha256"}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.exportDeliveryApiPayloadBytes}: {formatNumber(exportDeliveryApiState.preview.artifact?.metadata?.payloadBytes ?? 0)}
                </p>
              </article>

              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiRetention}</p>
                <strong style={{ ...wrapTextStyle }}>
                  {readableCode(exportDeliveryApiState.registry?.retention?.mode ?? copy.exportDeliveryApiNoPreview)}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.exportDeliveryApiExpiry}: {exportDeliveryApiState.registry?.expiresAt ?? exportDeliveryApiState.registry?.retention?.expiresAt ?? copy.exportDeliveryApiNoPreview}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.exportDeliveryApiTtl}: {exportDeliveryApiState.registry?.retention?.ttlHours ?? 0}h
                </p>
              </article>
            </div>
          )}

          {exportDeliveryFileHandoff && (
            <div aria-label={copy.exportDeliveryApiFileHandoff} style={{ display: "grid", gap: 12 }}>
              <div style={headingRowStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiFileHandoff}</p>
                  <h5 style={{ color: "#071426", fontSize: 16, lineHeight: 1.25, margin: "4px 0", ...wrapTextStyle }}>
                    {exportDeliveryFileHandoff.handoffId}
                  </h5>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiFileHandoffRetentionBoundary}
                  </p>
                </div>
                <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={exportDeliveryFileHandoff.format.toUpperCase()}
                    state="ready"
                  />
                  <PublishStateBadge
                    label={exportDeliveryFileHandoffRetentionState}
                    state={exportDeliveryFileHandoff.retention.state === "active" ? "ready" : "warning"}
                  />
                </span>
              </div>

              <div style={sectionGridStyle}>
                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiFileHandoffFormat}</p>
                  <strong style={{ ...wrapTextStyle }}>
                    {exportDeliveryFileHandoff.format.toUpperCase()} / {exportDeliveryFileHandoff.mimeType}
                  </strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {exportDeliveryFileHandoff.fileName}
                  </p>
                </article>

                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiChecksum}</p>
                  <strong style={{ ...wrapTextStyle }}>{exportDeliveryFileHandoff.checksum}</strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {exportDeliveryFileHandoff.checksumAlgorithm}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiPayloadBytes}: {formatNumber(exportDeliveryFileHandoff.payloadBytes)}
                  </p>
                </article>

                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRows}</p>
                  <strong style={{ ...wrapTextStyle }}>
                    {exportDeliveryFileHandoff.rowCounts.readyRows} / {exportDeliveryFileHandoff.rowCounts.reviewRequiredRows} / {exportDeliveryFileHandoff.rowCounts.blockedRows}
                  </strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiRows}: {exportDeliveryFileHandoff.rowCounts.readyRows} / {exportDeliveryFileHandoff.rowCounts.reviewRequiredRows} / {exportDeliveryFileHandoff.rowCounts.blockedRows}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportTotalRows}: {formatNumber(exportDeliveryFileHandoff.rowCounts.totalRows)}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiFileHandoffColumns}: {formatNumber(exportDeliveryFileHandoff.columns.length)}
                  </p>
                </article>

                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRetention}</p>
                  <strong style={{ ...wrapTextStyle }}>
                    {exportDeliveryFileHandoffRetentionState}
                  </strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiRetention}: {exportDeliveryFileHandoffRetentionState}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiExpiry}: {exportDeliveryFileHandoff.retention.expiresAt ?? copy.exportDeliveryApiNoPreview}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiTtl}: {exportDeliveryFileHandoff.retention.ttlHours ?? 0}h
                  </p>
                </article>

                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiTraceId}</p>
                  <strong style={{ ...wrapTextStyle }}>{exportDeliveryFileHandoff.traceId}</strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiTraceId}: {exportDeliveryFileHandoff.traceId}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiArtifactId}: {exportDeliveryFileHandoff.artifactId}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiExportBatchId}: {exportDeliveryFileHandoff.batchId}
                  </p>
                </article>
              </div>

              <ul aria-label={copy.exportDeliveryApiFileHandoffSafety} style={compactListStyle}>
                <li style={chipStyle}>{copy.exportDeliveryApiNoDownloadUrl}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoSignedUrl}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoObjectKey}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoStorageWrite}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoProviderCall}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoWalletSigning}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoContractRoot}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoQueueScheduler}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiNoRewardDistribution}</li>
              </ul>

              {exportDeliveryFileHandoff.boundary && (
                <p style={{ ...boundaryStyle, ...wrapTextStyle }}>
                  {getLocalizedText(exportDeliveryFileHandoff.boundary, locale)}
                </p>
              )}
            </div>
          )}

          {(exportDeliveryRootPacket || exportDeliveryRootReview) && (
            <div aria-label={copy.exportDeliveryApiRootReview} style={{ display: "grid", gap: 12 }}>
              <div style={headingRowStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRootReview}</p>
                  <h5 style={{ color: "#071426", fontSize: 16, lineHeight: 1.25, margin: "4px 0" }}>
                    {exportDeliveryRootPacket?.rootId ?? copy.exportDeliveryApiRootNoPacket}
                  </h5>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiRootReviewSubtitle}
                  </p>
                </div>
                <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={readableCode(exportDeliveryRootReview?.publicationStatus ?? exportDeliveryRootPacket?.publicationStatus ?? "not_published")}
                    state="warning"
                  />
                  <PublishStateBadge
                    label={exportDeliveryRootReview?.supported ? copy.exportDeliveryApiRootSupported : copy.exportDeliveryApiRootReviewOnly}
                    state={exportDeliveryRootReview?.supported ? "ready" : "warning"}
                  />
                </span>
              </div>

              <div style={sectionGridStyle}>
                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRootHash}</p>
                  <strong style={{ ...wrapTextStyle }}>
                    {exportDeliveryRootPacket?.rootHash ?? copy.exportDeliveryApiRootNoPacket}
                  </strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiRootVersion}: {exportDeliveryRootPacket?.rootVersion ?? 0}
                  </p>
                </article>
                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRootRows}</p>
                  <p style={{ ...statValueStyle, fontSize: 20 }}>
                    {exportDeliveryRootPacket?.eligibleWalletCount ?? 0} / {exportDeliveryRootPacket?.totalRows ?? 0}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiRootEvidenceHashes}: {exportDeliveryRootPacket?.evidenceHashes.length ?? 0}
                  </p>
                </article>
                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiRootMode}</p>
                  <strong style={{ ...wrapTextStyle }}>
                    {readableCode(exportDeliveryRootReview?.requestedMode ?? exportDeliveryRootPacket?.mode ?? "eligibility_root")}
                  </strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                    {copy.exportDeliveryApiRootGeneratedMode}: {readableCode(exportDeliveryRootPacket?.generatedMode ?? "local_review_only")}
                  </p>
                </article>
                <article style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{copy.exportDeliveryApiTraceId}</p>
                  <strong style={{ ...wrapTextStyle }}>{exportDeliveryApiState.traceId ?? copy.exportDeliveryApiNoTrace}</strong>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.exportDeliveryApiStatus}: {exportDeliveryApiSourceLabel(exportDeliveryApiState.source, copy)}
                  </p>
                </article>
              </div>

              <ul style={compactListStyle}>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNotPublished}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoContractWrite}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoWalletSignature}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoStorageWrite}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoRewardCustody}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoRewardDistribution}</li>
                <li style={chipStyle}>{copy.exportDeliveryApiRootNoClaimExecution}</li>
              </ul>

              {exportDeliveryRootReview?.blockedReason && (
                <p style={{ ...boundaryStyle, ...wrapTextStyle }}>
                  {copy.exportDeliveryApiRootBlockedReason}: {readableCode(exportDeliveryRootReview.blockedReason)}
                </p>
              )}
              {exportDeliveryRootPacket?.nextAction && (
                <p style={{ ...boundaryStyle, ...wrapTextStyle }}>
                  {copy.exportDeliveryApiRootNextAction}: {getLocalizedText(exportDeliveryRootPacket.nextAction, locale)}
                </p>
              )}
              {exportDeliveryRootPacket?.boundary && (
                <p style={{ ...boundaryStyle, ...wrapTextStyle }}>
                  {copy.exportDeliveryApiRootBoundary}: {getLocalizedText(exportDeliveryRootPacket.boundary, locale)}
                </p>
              )}
            </div>
          )}

          {(exportDeliveryApiState.auditList || exportDeliveryApiState.auditDetail || exportDeliveryApiState.registry) && (
            <div aria-label={copy.exportDeliveryApiAuditRecords} style={sectionGridStyle}>
              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiAuditRecords}</p>
                <p style={{ ...statValueStyle, fontSize: 20 }}>
                  {exportDeliveryApiState.auditList?.summary.totalRecords ??
                    (exportDeliveryApiState.registry ? 1 : 0)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.exportDeliveryApiAuditList}: {exportDeliveryApiState.auditList ? copy.exportDeliveryApiAuditReady : copy.exportDeliveryApiAuditPending}
                </p>
              </article>

              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiAuditDetail}</p>
                <strong style={{ ...wrapTextStyle }}>
                  {exportDeliveryApiState.auditDetail?.record.routeId ??
                    exportDeliveryApiState.registry?.routeId ??
                    copy.exportDeliveryApiAuditPending}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, ...wrapTextStyle }}>
                  {exportDeliveryApiState.auditDetail?.artifactId ??
                    exportDeliveryApiState.registry?.artifactId ??
                    copy.exportDeliveryApiNoArtifact}
                </p>
              </article>

              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportDeliveryApiAuditEvents}</p>
                <ul style={compactListStyle}>
                  {(exportDeliveryApiState.auditDetail?.record.auditEvents ??
                    exportDeliveryApiState.registry?.auditEvents ??
                    []).map((event) => (
                    <li key={`${event.id ?? event.type}-${event.routeId ?? "route"}`} style={{ ...chipStyle, ...wrapTextStyle }}>
                      {readableCode(event.type)}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          )}

          <ul style={compactListStyle}>
            <li style={chipStyle}>{copy.exportDeliveryApiNoDownloadUrl}</li>
            <li style={chipStyle}>{copy.exportDeliveryApiNoStorageWrite}</li>
            <li style={chipStyle}>{copy.exportDeliveryApiNoContractRoot}</li>
            <li style={chipStyle}>{copy.exportDeliveryApiNoWalletSigning}</li>
            <li style={chipStyle}>{copy.exportDeliveryApiNoRewardDistribution}</li>
          </ul>

          {exportDeliveryApiState.diagnostics.length > 0 && (
            <div aria-label={copy.exportDeliveryApiDiagnostics} style={{ display: "grid", gap: 8 }}>
              <p style={statLabelStyle}>{copy.exportDeliveryApiDiagnostics}</p>
              {exportDeliveryApiState.diagnostics.map((diagnostic) => (
                <p
                  key={`${diagnostic.code}-${diagnostic.severity}`}
                  style={{
                    ...boundaryStyle,
                    color: diagnostic.severity === "error" ? "#991b1b" : "#9a3412",
                    ...wrapTextStyle,
                  }}
                >
                  {diagnostic.code}: {sanitizeExportArtifactDeliveryApiText(getLocalizedText(diagnostic.message, locale))}
                </p>
              ))}
            </div>
          )}

          <p style={{ ...boundaryStyle, ...wrapTextStyle }}>
            {copy.exportDeliveryApiBoundary}: {getLocalizedText(exportDeliveryApiState.boundary, locale)}
          </p>
        </article>

        {exportArtifact && (
          <article aria-label={copy.exportArtifact} style={{ ...workflowStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.exportArtifact}</p>
                <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                  {exportArtifact.fileName}
                </h4>
              </div>
              <PublishStateBadge label={readableCode(exportArtifact.metadata.generatedMode)} state="ready" />
            </div>
            <div style={gridStyle}>
              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportArtifactFormat}</p>
                <p style={{ ...statValueStyle, fontSize: 20 }}>{exportArtifact.format.toUpperCase()}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {copy.exportArtifactBatchId}: {exportArtifact.batchId}
                </p>
              </article>
              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportArtifactChecksum}</p>
                <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, overflowWrap: "anywhere" }}>
                  {exportArtifact.metadata.checksum}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {exportArtifact.metadata.checksumAlgorithm}
                </p>
              </article>
              <article style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{copy.exportArtifactPayloadSize}</p>
                <p style={{ ...statValueStyle, fontSize: 20 }}>
                  {formatNumber(exportArtifact.metadata.payloadBytes)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {copy.exportArtifactRows}: {exportArtifact.metadata.readyRows} / {exportArtifact.metadata.reviewRequiredRows} / {exportArtifact.metadata.blockedRows}
                </p>
              </article>
            </div>
            <ul style={compactListStyle}>
              <li style={chipStyle}>{copy.exportArtifactNoDownloadUrl}</li>
              <li style={chipStyle}>{copy.exportArtifactNoStorageWrite}</li>
              <li style={chipStyle}>{copy.exportArtifactNoContractRoot}</li>
              <li style={chipStyle}>{copy.exportArtifactNoRewardDistribution}</li>
            </ul>
            <p style={boundaryStyle}>{getLocalizedText(exportArtifact.safety.boundary, locale)}</p>
            <p style={boundaryStyle}>{copy.exportArtifactBoundary}</p>
          </article>
        )}

        <article aria-label={copy.exportStorageProviderSummary} style={{ ...workflowStyle, minHeight: 0 }}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.exportStorageProviderApprovalBlocked}</p>
              <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.exportStorageProviderSummary}
              </h4>
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {copy.exportStorageProviderSummarySubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={readableCode(
                exportStorageProviderApprovalPacket.summary.approvalBlocked
                  ? "blocked"
                  : exportStorageProviderApprovalPacket.summary.reviewRequiredChecks > 0
                    ? "review_required"
                    : "ready",
              )}
              state={
                exportStorageProviderApprovalPacket.summary.approvalBlocked
                  ? "blocker"
                  : exportStorageProviderApprovalPacket.summary.reviewRequiredChecks > 0
                    ? "warning"
                    : "ready"
              }
            />
          </div>
          <div style={sectionGridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.exportStorageProviderTopBlocker}</p>
              <strong>{getLocalizedText(exportStorageProviderApprovalTopCheck.label, locale)}</strong>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.exportStorageProviderNextAction}: {getLocalizedText(exportStorageProviderApprovalPacket.nextAction, locale)}
              </p>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.exportStorageProviderLocalHandoff}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.exportBatch}: {exportStorageProviderApprovalPacket.batchId}
              </p>
              <PublishStateBadge label={copy.exportLocalPreviewOnly} state="ready" />
            </article>
          </div>
          <ul style={compactListStyle}>
            <li style={chipStyle}>{copy.exportStorageProviderStorageWriteDisabled}</li>
            <li style={chipStyle}>{copy.exportStorageProviderDownloadUrlDisabled}</li>
            <li style={chipStyle}>{copy.exportStorageProviderNoContractRootWrite}</li>
            <li style={chipStyle}>{copy.exportStorageProviderRewardCustodyDisabled}</li>
            <li style={chipStyle}>{copy.exportStorageProviderRewardDistributionDisabled}</li>
          </ul>
          <p style={boundaryStyle}>
            {copy.exportStorageProviderBoundary}: {getLocalizedText(exportStorageProviderApprovalPacket.boundary, locale)}
          </p>
          <p style={boundaryStyle}>
            {getLocalizedText(exportStorageProviderApprovalPacket.safety.boundary, locale)}
          </p>
        </article>

        <p style={boundaryStyle}>{getLocalizedText(exportDecision.boundary, locale)}</p>
        <p style={boundaryStyle}>{getLocalizedText(commandCenter.boundary, locale)}</p>
      </section>

      <section aria-label={copy.exportFulfillmentReadiness} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.exportFulfillmentStatus}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.exportFulfillmentReadiness}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.exportFulfillmentReadinessSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={readableCode(exportFulfillmentReadiness.summary.status)}
            state={exportReadinessBadgeState(exportFulfillmentReadiness.summary.status)}
          />
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.exportFulfillmentRows}</p>
            <p style={{ ...statValueStyle, fontSize: 22 }}>
              {exportFulfillmentReadiness.summary.readyRows} / {exportFulfillmentReadiness.summary.reviewRequiredRows} / {exportFulfillmentReadiness.summary.blockedRows}
            </p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
              {copy.exportBatch}: {exportFulfillmentReadiness.batchId}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.exportFulfillmentAcknowledgementState}</p>
            <p style={{ ...statValueStyle, fontSize: 22 }}>
              {exportFulfillmentReadiness.summary.acknowledgedItems}/{exportFulfillmentReadiness.summary.requiredAcknowledgements}
            </p>
            <PublishStateBadge
              label={copy.exportFulfillmentOwnerApproved}
              state={exportFulfillmentReadiness.summary.ownerApproved ? "ready" : "warning"}
            />
          </article>
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.exportFulfillmentFutureStorage}</p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(exportFulfillmentReadiness.nextAction, locale)}
            </p>
          </article>
        </div>

        <article style={{ ...workflowStyle, minHeight: 0 }}>
          <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportFulfillmentPackages}</h4>
          <div style={sectionGridStyle}>
            {exportFulfillmentReadiness.packages.map((pack) => (
              <article key={pack.id} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div>
                    <p style={statLabelStyle}>{copy.exportFulfillmentPackageId}</p>
                    <strong style={{ overflowWrap: "anywhere" }}>{pack.id}</strong>
                  </div>
                  <PublishStateBadge label={pack.format.toUpperCase()} state="ready" />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
                  {pack.fileName}
                </p>
                <div style={gridStyle}>
                  <div>
                    <p style={statLabelStyle}>{copy.exportFulfillmentChecksum}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 900, lineHeight: 1.35, margin: 0, overflowWrap: "anywhere" }}>
                      {pack.checksum}
                    </p>
                  </div>
                  <div>
                    <p style={statLabelStyle}>{copy.exportFulfillmentPayloadBytes}</p>
                    <p style={{ color: "#071426", fontSize: 18, fontWeight: 900, lineHeight: 1.1, margin: 0 }}>
                      {formatNumber(pack.payloadBytes)}
                    </p>
                  </div>
                </div>
                <p style={statLabelStyle}>{copy.exportFulfillmentIncludedColumns}</p>
                <div style={tableWrapStyle}>
                  <p style={{ color: "#071426", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0, minWidth: 680 }}>
                    {pack.includedColumns.join(",")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article style={{ ...workflowStyle, minHeight: 0 }}>
          <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportFulfillmentSafety}</h4>
          <ul style={compactListStyle}>
            <li style={chipStyle}>{copy.exportFulfillmentNoDownloadUrl}</li>
            <li style={chipStyle}>{copy.exportFulfillmentNoStorageWrite}</li>
            <li style={chipStyle}>{copy.exportFulfillmentNoContractRoot}</li>
            <li style={chipStyle}>{copy.exportFulfillmentNoRewardDistribution}</li>
          </ul>
          <p style={boundaryStyle}>{getLocalizedText(exportFulfillmentReadiness.boundary, locale)}</p>
          <p style={boundaryStyle}>
            {copy.exportFulfillmentBoundary}: {getLocalizedText(exportFulfillmentReadiness.safety.boundary, locale)}
          </p>
          <p style={boundaryStyle}>
            {copy.exportFulfillmentNextAction}: {getLocalizedText(exportFulfillmentReadiness.approval.nextAction, locale)}
          </p>
        </article>
      </section>

      {exportReadiness && (
        <section aria-label={copy.exportConfirmationReadiness} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.exportConfirmationReadinessEyebrow}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.exportConfirmationReadiness}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.exportConfirmationReadinessSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={`${exportReadiness.summary.requiredAcknowledgements}/${exportReadiness.summary.acknowledgedItems} ${copy.exportAcknowledgements}`}
              state={
                exportReadiness.summary.requiredAcknowledgements === exportReadiness.summary.acknowledgedItems
                  ? "ready"
                  : "warning"
              }
            />
          </div>

          <div aria-label={copy.exportConfirmationSummary} style={gridStyle}>
            {[
              {
                detail: `${copy.exportPreviewModes}: ${exportReadiness.summary.previewModeCount}`,
                label: copy.readyRows,
                state: "ready" as const,
                value: String(exportReadiness.summary.readyRows),
              },
              {
                detail: copy.exportRowReasonCoverage,
                label: copy.reviewRequiredRows,
                state: "warning" as const,
                value: String(exportReadiness.summary.reviewRequiredRows),
              },
              {
                detail: copy.exportRootClaimBlocked,
                label: copy.blockedRows,
                state: exportReadiness.summary.blockedRows > 0 ? "blocker" as const : "ready" as const,
                value: String(exportReadiness.summary.blockedRows),
              },
              {
                detail: `${exportReadiness.summary.totalRows} ${copy.exportTotalRows}`,
                label: copy.exportAcknowledgements,
                state: "ready" as const,
                value: String(exportReadiness.summary.requiredAcknowledgements),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
                <PublishStateBadge label={stat.state === "ready" ? copy.apiSkillReadinessReady : stat.state === "warning" ? copy.apiSkillReadinessReviewRequired : copy.apiSkillReadinessBlocked} state={stat.state} />
              </article>
            ))}
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportPreviewModes}</h4>
              <div style={gridStyle}>
                {exportReadiness.previewModes.map((mode) => (
                  <article key={mode.mode} style={{ ...cardStyle, minHeight: 0 }}>
                    <div style={headingRowStyle}>
                      <h5 style={{ fontSize: 16, lineHeight: 1.2, margin: 0 }}>
                        {getLocalizedText(mode.label, locale)}
                      </h5>
                      <PublishStateBadge
                        label={mode.generatesFile ? copy.exportRealFile : copy.exportLocalPreviewOnly}
                        state={mode.generatesFile ? "blocker" : "ready"}
                      />
                    </div>
                    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                      {getLocalizedText(mode.boundary, locale)}
                    </p>
                    <p style={statLabelStyle}>{copy.exportIncludedFields}</p>
                    <ul style={compactListStyle}>
                      {mode.includedFields.map((field) => (
                        <li key={`${mode.mode}-${field}`} style={chipStyle}>
                          {field}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportRequiredFields}</h4>
              <div style={gridStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.exportCoveredFields}</p>
                  <p style={{ ...statValueStyle, fontSize: 20 }}>
                    {exportReadiness.fieldCoverage.presentFields.length}/{exportReadiness.fieldCoverage.requiredFields.length}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.exportMissingFields}</p>
                  <PublishStateBadge
                    label={exportReadiness.fieldCoverage.missingFields.length === 0 ? copy.verificationPipelineNone : String(exportReadiness.fieldCoverage.missingFields.length)}
                    state={exportReadiness.fieldCoverage.coverageReady ? "ready" : "blocker"}
                  />
                </div>
              </div>
              <ul style={compactListStyle}>
                {exportReadiness.fieldCoverage.requiredFields.map((field) => (
                  <li key={field} style={chipStyle}>
                    {field}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportRowReasonCoverage}</h4>
              {exportReadiness.rowStatusCoverage.map((reason) => (
                <div key={reason.reasonCode} style={listItemStyle}>
                  <span style={{ minWidth: 0 }}>
                    <strong>{getLocalizedText(reason.label, locale)}</strong>
                    <span style={{ color: "#475569", display: "block", fontSize: 13, lineHeight: 1.4 }}>
                      {getLocalizedText(reason.nextAction, locale)}
                    </span>
                  </span>
                  <PublishStateBadge
                    label={`${reason.affectedRows} ${readableCode(reason.rowStatus)}`}
                    state={reason.rowStatus === "blocked" ? "blocker" : reason.rowStatus === "review_required" ? "warning" : "ready"}
                  />
                </div>
              ))}
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.exportProjectAcknowledgements}</h4>
              {exportReadiness.acknowledgements.map((acknowledgement) => (
                <div key={acknowledgement.id} style={listItemStyle}>
                  <span style={{ minWidth: 0 }}>
                    <strong>{getLocalizedText(acknowledgement.label, locale)}</strong>
                    <span style={{ color: "#475569", display: "block", fontSize: 13, lineHeight: 1.4 }}>
                      {getLocalizedText(acknowledgement.description, locale)}
                    </span>
                  </span>
                  <PublishStateBadge
                    label={acknowledgement.acknowledged ? copy.approved : copy.open}
                    state={acknowledgement.acknowledged ? "ready" : "warning"}
                  />
                </div>
              ))}
            </article>
          </div>

          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.exportContractRootReadiness}</p>
                <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.exportRootClaimBlocked}
                </h4>
              </div>
              <PublishStateBadge label={copy.exportSafeDefault} state="ready" />
            </div>
            <div style={sectionGridStyle}>
              {exportReadiness.contractRootReadiness.map((rootMode) => (
                <article key={rootMode.mode} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <h5 style={{ fontSize: 16, lineHeight: 1.2, margin: 0 }}>
                      {getLocalizedText(rootMode.label, locale)}
                    </h5>
                    <PublishStateBadge
                      label={readableCode(rootMode.readiness)}
                      state={exportReadinessBadgeState(rootMode.readiness)}
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {rootMode.safeDefault ? copy.exportSafeDefault : getLocalizedText(rootMode.nextAction, locale)}
                  </p>
                  <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(rootMode.boundary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </article>

          <div style={boundaryStyle}>
            <p style={{ margin: 0 }}>{getLocalizedText(exportReadiness.boundary, locale)}</p>
            <p style={{ margin: "8px 0 0" }}>
              {copy.verificationPipelineNextAction}: {getLocalizedText(exportReadiness.nextAction, locale)}
            </p>
          </div>
        </section>
      )}

      {serviceCoverage && (
        <section aria-label={copy.serviceFacade} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.serviceCoverage}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.serviceFacade}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.serviceFacadeSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={serviceCoverage.blockedCount > 0 ? copy.serviceReadinessBlocked : copy.serviceReadinessReady}
              state={serviceCoverage.blockedCount > 0 ? "blocker" : "ready"}
            />
          </div>

          <div aria-label={copy.serviceCoverage} style={gridStyle}>
            {[
              {
                detail: serviceCoverage.serviceNames.slice(0, 3).join(", "),
                label: copy.serviceTotalServices,
                value: String(serviceCoverage.totalServices),
              },
              {
                detail: `${serviceCoverage.localOnlyCount} ${copy.serviceReadinessLocalOnly}`,
                label: copy.serviceReadinessReady,
                value: String(serviceCoverage.readyCount),
              },
              {
                detail: `${serviceCoverage.blockedCount} ${copy.serviceReadinessBlocked}`,
                label: copy.serviceReadinessReviewRequired,
                value: String(serviceCoverage.reviewRequiredCount),
              },
              {
                detail: copy.serviceBoundaryTitle,
                label: copy.serviceReadinessBlocked,
                value: String(serviceCoverage.blockedCount),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.verificationCoverage}</h4>
              <div style={gridStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.verificationManualReview}</p>
                  <p style={{ ...statValueStyle, fontSize: 18 }}>
                    {verificationCoverage.manualReviewCount}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.verificationRiskStates}</p>
                  <p style={{ ...statValueStyle, fontSize: 18 }}>
                    {verificationCoverage.riskFlags.length}
                  </p>
                </div>
              </div>
              <p style={statLabelStyle}>{copy.verificationProviderReadiness}</p>
              <ul style={compactListStyle}>
                {Object.entries(verificationCoverage.providerReadinessCounts)
                  .filter(([, count]) => count > 0)
                  .map(([readiness, count]) => (
                    <li key={readiness} style={chipStyle}>
                      {count} {readableCode(readiness)}
                    </li>
                  ))}
              </ul>
              <p style={statLabelStyle}>{copy.verificationEvidenceCategories}</p>
              <ul style={compactListStyle}>
                {verificationCoverage.evidenceSources.map((source) => (
                  <li key={source} style={chipStyle}>
                    {source}
                  </li>
                ))}
              </ul>
              <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(verificationCoverage.boundary, locale)}
              </p>
            </article>

            {verificationPipeline && (
              <article
                aria-label={copy.verificationPipelineReadiness}
                style={{ ...workflowStyle, gridColumn: "1 / -1", minHeight: 0 }}
              >
                <div style={headingRowStyle}>
                  <div>
                    <p style={statLabelStyle}>{copy.verificationProviderReadiness}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {copy.verificationPipelineReadiness}
                    </h4>
                    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                      {copy.verificationPipelineReadinessSubtitle}
                    </p>
                  </div>
                  <PublishStateBadge
                    label={`${verificationPipeline.summary.missingLiveEvidencePaths} ${copy.verificationPipelineMissingLiveEvidence}`}
                    state={verificationPipeline.summary.blockedPaths > 0 ? "blocker" : "warning"}
                  />
                </div>

                <div style={gridStyle}>
                  {[
                    {
                      detail: `${verificationPipeline.summary.seededReadyPaths} ${copy.verificationPipelineSeededReady}`,
                      label: copy.verificationPipelineTotalPaths,
                      value: String(verificationPipeline.summary.totalPaths),
                    },
                    {
                      detail: `${verificationPipeline.summary.seededReadyPaths}/${verificationPipeline.summary.totalPaths}`,
                      label: copy.verificationPipelineSeededCoverage,
                      value: String(verificationPipeline.summary.seededReadyPaths),
                    },
                    {
                      detail: `${verificationPipeline.summary.missingLiveEvidencePaths} ${copy.verificationPipelineMissingLiveEvidence}`,
                      label: copy.verificationPipelineLiveEvidence,
                      value: String(verificationPipeline.summary.liveEvidenceReadyPaths),
                    },
                    {
                      detail: `${verificationPipeline.summary.manualReviewPaths} ${copy.verificationPipelineManualReviewPaths}`,
                      label: copy.verificationPipelineBlockedPaths,
                      value: String(verificationPipeline.summary.blockedPaths),
                    },
                  ].map((stat) => (
                    <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
                      <p style={statLabelStyle}>{stat.label}</p>
                      <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
                      <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                        {stat.detail}
                      </p>
                    </article>
                  ))}
                </div>

                <div style={sectionGridStyle}>
                  <article style={{ ...cardStyle, minHeight: 0 }}>
                    <h5 style={{ fontSize: 16, margin: 0 }}>
                      {copy.verificationPipelineTaskOutcomeCoverage}
                    </h5>
                    <div style={gridStyle}>
                      {[
                        {
                          label: copy.verificationPipelineCompleted,
                          state: "ready" as const,
                          value: verificationPipeline.taskOutcomeCoverage.completedCount,
                        },
                        {
                          label: copy.verificationPipelinePending,
                          state: "warning" as const,
                          value: verificationPipeline.taskOutcomeCoverage.pendingCount,
                        },
                        {
                          label: copy.verificationPipelineFailed,
                          state: verificationPipeline.taskOutcomeCoverage.failedCount > 0
                            ? "blocker" as const
                            : "ready" as const,
                          value: verificationPipeline.taskOutcomeCoverage.failedCount,
                        },
                        {
                          label: copy.verificationManualReview,
                          state: "warning" as const,
                          value: verificationPipeline.taskOutcomeCoverage.manualReviewCount,
                        },
                      ].map(({ label, state, value }) => (
                        <div key={label}>
                          <p style={statLabelStyle}>{label}</p>
                          <PublishStateBadge label={String(value)} state={state} />
                        </div>
                      ))}
                    </div>
                  </article>

                  <article style={{ ...cardStyle, minHeight: 0 }}>
                    <h5 style={{ fontSize: 16, margin: 0 }}>
                      {copy.verificationPipelineEligibilityImpact}
                    </h5>
                    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                      {getLocalizedText(verificationPipeline.eligibilityImpact.summary, locale)}
                    </p>
                    <div>
                      <p style={statLabelStyle}>{copy.verificationPipelineMissingRequiredTasks}</p>
                      <ul style={compactListStyle}>
                        {(verificationPipeline.eligibilityImpact.missingRequiredTasks.length > 0
                          ? verificationPipeline.eligibilityImpact.missingRequiredTasks
                          : [copy.verificationPipelineNone]
                        ).map((task) => (
                          <li key={task} style={chipStyle}>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p style={statLabelStyle}>{copy.verificationPipelineReferralQualification}</p>
                      <PublishStateBadge
                        label={readableCode(verificationPipeline.eligibilityImpact.referralQualificationStatus)}
                        state={
                          verificationPipeline.eligibilityImpact.referralQualificationStatus === "qualified"
                            ? "ready"
                            : "warning"
                        }
                      />
                    </div>
                    <div>
                      <p style={statLabelStyle}>{copy.verificationPipelineRiskFlags}</p>
                      <ul style={compactListStyle}>
                        {(verificationPipeline.eligibilityImpact.riskFlags.length > 0
                          ? verificationPipeline.eligibilityImpact.riskFlags
                          : [copy.verificationPipelineNone]
                        ).map((riskFlag) => (
                          <li key={riskFlag} style={chipStyle}>
                            {riskFlag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </div>

                <div style={sectionGridStyle}>
                  {verificationPipeline.paths.map((path) => (
                    <article key={path.id} style={{ ...cardStyle, minHeight: 0 }}>
                      <div style={headingRowStyle}>
                        <div style={{ minWidth: 0 }}>
                          <p style={statLabelStyle}>{path.evidenceSource}</p>
                          <h5 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                            {getLocalizedText(path.label, locale)}
                          </h5>
                        </div>
                        <PublishStateBadge
                          label={readableCode(path.releaseImpact)}
                          state={pipelineReleaseImpactState(path.releaseImpact)}
                        />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <PublishStateBadge
                          label={`${copy.verificationPipelineSeededCoverage}: ${readableCode(path.seededCoverageStatus)}`}
                          state={pipelineSeededCoverageState(path.seededCoverageStatus)}
                        />
                        <PublishStateBadge
                          label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(path.liveEvidenceStatus)}`}
                          state={pipelineLiveEvidenceState(path.liveEvidenceStatus)}
                        />
                        <PublishStateBadge
                          label={`${copy.verificationProviderReadiness}: ${readableCode(path.providerReadiness)}`}
                          state={pipelineProviderState(path.providerReadiness)}
                        />
                      </div>
                      <div>
                        <p style={statLabelStyle}>{copy.verificationPipelineAffectedOutcomes}</p>
                        <ul style={compactListStyle}>
                          {path.affectedOutcomes.map((outcome) => (
                            <li key={`${path.id}-${outcome}`} style={chipStyle}>
                              {readableCode(outcome)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                        <strong>{copy.verificationPipelineEligibilityImpact}: </strong>
                        {getLocalizedText(path.eligibilityImpact, locale)}
                      </p>
                      <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                        <strong>{copy.verificationPipelineFallbackReason}: </strong>
                        {getLocalizedText(path.fallbackReason, locale)}
                      </p>
                      <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                        {copy.verificationPipelineNextAction}: {getLocalizedText(path.nextAction, locale)}
                      </p>
                    </article>
                  ))}
                </div>

                <div style={boundaryStyle}>
                  <p style={{ margin: 0 }}>{getLocalizedText(verificationPipeline.boundary, locale)}</p>
                  <p style={{ margin: "8px 0 0" }}>
                    {copy.verificationPipelineNextAction}: {getLocalizedText(verificationPipeline.nextAction, locale)}
                  </p>
                </div>
              </article>
            )}

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceCoveredApiGroups}</h4>
              <ul style={compactListStyle}>
                {serviceCoverage.coveredApiGroups.map((group) => (
                  <li key={group} style={chipStyle}>
                    {serviceApiGroupLabel(group)}
                  </li>
                ))}
                {serviceCoverageLabels.map((label) => (
                  <li key={`coverage-${label}`} style={chipStyle}>
                    {label}
                  </li>
                ))}
              </ul>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceCoveredFieldGroups}</h4>
              <ul style={compactListStyle}>
                {serviceCoverage.coveredFieldGroups.map((group) => (
                  <li key={group} style={chipStyle}>
                    {serviceFieldGroupLabel(group)}
                  </li>
                ))}
              </ul>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceSampleResponses}</h4>
              <ul style={compactListStyle}>
                {[
                  ...serviceCoverage.sampleResponseIds,
                  "getCampaignAnalytics",
                  "generateCampaignPosts",
                  "summarizeCampaign",
                ].map((sampleId) => (
                  <li key={sampleId} style={chipStyle}>
                    {sampleId}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.serviceBoundaryTitle}</p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.serviceBoundaryDetail}
            </p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
              {getLocalizedText(serviceCoverage.boundary, locale)}
            </p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
              {getLocalizedText(serviceCoverage.verificationBoundary, locale)}
            </p>
          </div>
        </section>
      )}

      <PublishDeliveryReviewPanel
        apiConfigured={Boolean(publishDeliveryApiBaseUrl?.trim())}
        locale={locale}
        onReview={runPublishDeliveryApiReview}
        reviewInFlight={publishDeliveryApiReviewInFlight}
        state={publishDeliveryReviewPanelState}
      />

      <PointsRankingLedgerRuntimePanel
        apiConfigured={Boolean(pointsRankingLedgerRuntimeApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runPointsRankingLedgerRuntimeApiReview}
        reviewInFlight={pointsRankingLedgerRuntimeApiReviewInFlight}
        state={pointsRankingLedgerRuntimeApiState}
      />

      <ContractWriterRuntimePanel
        apiConfigured={Boolean(contractWriterRuntimeApiBase?.trim())}
        locale={locale}
        onReview={runContractWriterRuntimeApiReview}
        reviewInFlight={contractWriterRuntimeApiReviewInFlight}
        state={contractWriterRuntimeApiState}
      />

      <RewardDistributionHandoffRuntimePanel
        apiConfigured={Boolean(rewardDistributionHandoffRuntimeApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runRewardDistributionHandoffRuntimeApiReview}
        reviewInFlight={rewardDistributionHandoffRuntimeApiReviewInFlight}
        state={rewardDistributionHandoffRuntimeApiState}
      />

      <ProjectOwnerFundingProofReviewPanel
        apiConfigured={Boolean(projectOwnerFundingProofReviewApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runProjectOwnerFundingProofReviewApiReview}
        reviewInFlight={projectOwnerFundingProofReviewApiReviewInFlight}
        state={projectOwnerFundingProofReviewApiState}
      />

      <AnalyticsIngestionRuntimePanel
        apiConfigured={Boolean(analyticsIngestionRuntimeApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runAnalyticsIngestionRuntimeApiReview}
        reviewInFlight={analyticsIngestionRuntimeApiReviewInFlight}
        state={analyticsIngestionRuntimeApiState}
      />

      <ObjectStorageExportRuntimePanel
        apiConfigured={Boolean(objectStorageExportRuntimeApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runObjectStorageExportRuntimeApiReview}
        reviewInFlight={objectStorageExportRuntimeApiReviewInFlight}
        state={objectStorageExportRuntimeApiState}
      />

      <RepositoryCampaignWorkflowPanel
        apiConfigured={Boolean(repositoryCampaignWorkflowApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runRepositoryCampaignWorkflowApiReview}
        reviewInFlight={repositoryCampaignWorkflowApiReviewInFlight}
        state={repositoryCampaignWorkflowApiState}
      />

      <ProductionDatabaseHandoffReadinessPanel
        apiConfigured={Boolean(productionDatabaseHandoffReadinessApiBase?.trim())}
        copy={copy}
        locale={locale}
        onReview={runProductionDatabaseHandoffReadinessApiReview}
        reviewInFlight={productionDatabaseHandoffReadinessApiReviewInFlight}
        state={productionDatabaseHandoffReadinessApiState}
      />

      <BackendRuntimePersistencePostureSurface
        locale={locale}
        state={backendReadinessApiState}
      />

      <BackendRuntimeReadinessPanel
        apiConfigured={Boolean(backendReadinessApiBaseUrl?.trim())}
        copy={copy}
        locale={locale}
        onReview={runBackendReadinessApiReview}
        reviewInFlight={backendReadinessApiReviewInFlight}
        state={backendReadinessApiState}
      />

      <section aria-label={copy.walletAdapterReadiness} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.walletAdapterBoundary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.walletAdapterReadiness}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.walletAdapterReadinessSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${walletAdapterReadiness.summary.releaseBlockers} ${copy.walletAdapterReleaseBlockers}`}
            state={walletAdapterReadiness.summary.releaseBlockers > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label={`${copy.walletAdapterReadiness} summary`} style={gridStyle}>
          {[
            {
              detail: `${walletAdapterReadiness.summary.enabledPreviewAdapters} ${copy.walletAdapterEnabledPreview}`,
              label: copy.walletAdapterConfigured,
              value: String(walletAdapterReadiness.summary.configuredAdapters),
            },
            {
              detail: `${walletAdapterReadiness.summary.liveEvidenceReadyAdapters} ${copy.verificationPipelineLiveReady}`,
              label: copy.walletAdapterMissingLiveEvidence,
              value: String(walletAdapterReadiness.summary.missingLiveEvidenceAdapters),
            },
            {
              detail: copy.walletAdapterFallback,
              label: copy.walletAdapterMaintenance,
              value: String(walletAdapterReadiness.summary.maintenanceAdapters),
            },
            {
              detail: copy.walletAdapterBoundary,
              label: copy.walletAdapterReleaseBlockers,
              value: String(walletAdapterReadiness.summary.releaseBlockers),
            },
          ].map((stat) => (
            <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {walletAdapterReadiness.entries
            .filter((entry) => entry.audience !== "INTERNAL_AGENT")
            .map((entry) => (
              <article key={entry.adapterId} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{entry.adapterName}</p>
                    <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(entry.displayName, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={readableCode(entry.readiness)}
                    state={walletAdapterReadinessState(entry.readiness)}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={`${copy.walletAdapterFeatureGate}: ${readableCode(entry.featureGate.state)}`}
                    state={entry.featureGate.state === "blocked" ? "blocker" : "warning"}
                  />
                  <PublishStateBadge
                    label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(entry.liveEvidenceStatus)}`}
                    state={walletAdapterLiveEvidenceState(entry.liveEvidenceStatus)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {entry.accountType} · {entry.walletSource} · {entry.chainId}/{entry.network}
                </p>
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.walletAdapterFallback}: {getLocalizedText(entry.fallback.reason, locale)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.walletAdapterNextAction}: {getLocalizedText(entry.nextAction, locale)}
                </p>
              </article>
            ))}
        </div>

        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(walletAdapterReadiness.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletAdapterNextAction}: {getLocalizedText(walletAdapterReadiness.nextAction, locale)}
          </p>
        </div>
      </section>

      <section aria-label={copy.liveWalletConnectorBoundary} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.liveWalletConnectorBoundaryEyebrow}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.liveWalletConnectorBoundary}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.liveWalletConnectorBoundarySubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${liveWalletConnectorBoundary.summary.missingLiveEvidenceConnectors} ${copy.liveWalletConnectorMissingEvidence}`}
            state={liveWalletConnectorBoundary.summary.releaseBlockers > 0 ? "blocker" : "warning"}
          />
        </div>

        <div aria-label={`${copy.liveWalletConnectorBoundary} summary`} style={gridStyle}>
          {[
            {
              detail: copy.liveWalletConnectorDisabledReviewRequired,
              label: copy.liveWalletConnectorCandidates,
              value: String(liveWalletConnectorBoundary.summary.totalConnectors),
            },
            {
              detail: copy.liveWalletConnectorConfigRequired,
              label: copy.liveWalletConnectorDisabledReviewRequired,
              value: String(
                liveWalletConnectorBoundary.summary.disabledConnectors +
                  liveWalletConnectorBoundary.summary.reviewRequiredConnectors,
              ),
            },
            {
              detail: copy.liveWalletConnectorReviewApprovalRequired,
              label: copy.liveWalletConnectorMissingEvidence,
              value: String(liveWalletConnectorBoundary.summary.missingLiveEvidenceConnectors),
            },
            {
              detail: copy.liveWalletConnectorReleaseGuardrail,
              label: copy.walletAdapterReleaseBlockers,
              value: String(liveWalletConnectorBoundary.summary.releaseBlockers),
            },
          ].map((stat) => (
            <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {liveWalletConnectorBoundary.entries.map((entry) => (
            <article key={entry.connectorId} style={{ ...cardStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{entry.packageName}</p>
                  <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(entry.displayName, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={readableCode(entry.readiness)}
                  state={liveConnectorReadinessState(entry.readiness)}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <PublishStateBadge
                  label={`${copy.walletAdapterFeatureGate}: ${readableCode(entry.featureGateState)}`}
                  state={entry.featureGateState === "blocked" ? "blocker" : "warning"}
                />
                <PublishStateBadge
                  label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(entry.liveEvidenceStatus)}`}
                  state={liveConnectorEvidenceState(entry.liveEvidenceStatus)}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
                {copy.liveWalletConnectorPackage}: {entry.packageName} ({entry.packageVersionSource})
              </p>
              <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.walletAdapterFallback}: {getLocalizedText(entry.fallback.reason, locale)}
              </p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {copy.walletAdapterNextAction}: {getLocalizedText(entry.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>

        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(liveWalletConnectorBoundary.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.walletAdapterNextAction}: {getLocalizedText(liveWalletConnectorBoundary.nextAction, locale)}
          </p>
        </div>
      </section>

      <section aria-label={copy.providerEvidenceRegistry} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.providerRegistryLocalOnlyBoundary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.providerEvidenceRegistry}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.providerEvidenceRegistrySubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${providerEvidenceRegistry.summary.launchBlockers} ${copy.providerRegistryLaunchBlockers}`}
            state={providerEvidenceRegistry.summary.launchBlockers > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label={`${copy.providerEvidenceRegistry} summary`} style={gridStyle}>
          {[
            {
              detail: `${providerEvidenceRegistry.summary.seededReadyEntries} ${copy.verificationPipelineSeededReady}`,
              label: copy.providerRegistryTotalEntries,
              value: String(providerEvidenceRegistry.summary.totalEntries),
            },
            {
              detail: `${providerEvidenceRegistry.summary.liveEvidenceReadyEntries} ${copy.verificationPipelineLiveReady}`,
              label: copy.providerRegistryMissingLiveEvidence,
              value: String(providerEvidenceRegistry.summary.missingLiveEvidenceEntries),
            },
            {
              detail: copy.providerRegistryFallback,
              label: copy.providerRegistryLocalOnly,
              value: String(providerEvidenceRegistry.summary.localOnlyEntries),
            },
            {
              label: copy.providerRegistryReviewRequired,
              detail: copy.providerRegistryAdapterReadiness,
              value: String(providerEvidenceRegistry.summary.reviewRequiredEntries),
            },
            {
              detail: copy.providerRegistryUnavailableReadiness,
              label: copy.providerRegistryUnavailable,
              value: String(providerEvidenceRegistry.summary.unavailableEntries),
            },
            {
              detail: copy.providerRegistryAdapterReadiness,
              label: copy.providerRegistryBlocked,
              value: String(providerEvidenceRegistry.summary.blockedEntries),
            },
            {
              detail: `${providerEvidenceRegistry.summary.blockedEntries} ${copy.providerRegistryBlockedReadiness}`,
              label: copy.providerRegistryLaunchBlockers,
              value: String(providerEvidenceRegistry.summary.launchBlockers),
            },
          ].map((stat) => (
            <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {providerEvidenceRegistry.entries
            .filter((entry) =>
              entry.adapterReadiness === "blocked" ||
              entry.adapterReadiness === "unavailable" ||
              entry.adapterReadiness === "review_required" ||
              entry.liveEvidenceStatus === "missing",
            )
            .slice(0, 4)
            .map((entry) => (
              <article key={entry.id} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{readableCode(entry.category)}</p>
                    <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(entry.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={readableCode(entry.adapterReadiness)}
                    state={providerEvidenceRegistryState(entry.adapterReadiness)}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(entry.liveEvidenceStatus)}`}
                    state={pipelineLiveEvidenceState(entry.liveEvidenceStatus)}
                  />
                  <PublishStateBadge
                    label={`${copy.providerRegistryFeatureGate}: ${readableCode(entry.featureGate.state)}`}
                    state={entry.featureGate.state === "disabled" ? "blocker" : "warning"}
                  />
                </div>
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.providerRegistryFallback}: {getLocalizedText(entry.fallback.label, locale)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(entry.nextAction, locale)}
                </p>
              </article>
            ))}
        </div>

        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(providerEvidenceRegistry.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.verificationPipelineNextAction}: {getLocalizedText(providerEvidenceRegistry.nextAction, locale)}
          </p>
        </div>
      </section>

      <section aria-label={copy.apiSkillContracts} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.apiSkillReadiness}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.apiSkillContracts}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.apiSkillContractsSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={
              apiSkillSurface.summary.missingSkillIds.length === 0
                ? copy.apiSkillReadinessReady
                : copy.apiSkillReadinessBlocked
            }
            state={apiSkillSurface.summary.missingSkillIds.length === 0 ? "ready" : "blocker"}
          />
        </div>

        <div aria-label="API skill contract summary" style={gridStyle}>
          {[
            {
              detail: `${apiSkillSurface.summary.localOnlyCount} ${copy.apiSkillLocalOnly} / ${apiSkillSurface.summary.reviewRequiredCount} ${copy.apiSkillReview}`,
              label: copy.apiSkillTotal,
              value: String(apiSkillSurface.summary.totalContracts),
            },
            {
              detail: `${apiSkillSurface.summary.externalEvidenceCount} ${copy.apiSkillExternalEvidence}`,
              label: copy.apiSkillHighRisk,
              value: String(apiSkillSurface.summary.highRiskCount),
            },
            {
              detail: apiSkillSurface.coverage.coveredFieldGroups.join(", "),
              label: copy.apiSkillCoveredGroups,
              value: String(apiSkillSurface.coverage.coveredFieldGroups.length),
            },
            {
              detail:
                apiSkillSurface.summary.missingSkillIds.length === 0
                  ? copy.apiSkillReadinessReady
                  : apiSkillSurface.summary.missingSkillIds.join(", "),
              label: copy.apiSkillMissing,
              value: String(apiSkillSurface.summary.missingSkillIds.length),
            },
          ].map((stat) => (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={statValueStyle}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.apiSkillBoundary}</p>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(apiSkillSurface.boundary, locale)}
          </p>
        </div>

        <div style={sectionGridStyle}>
          {apiSkillSurface.contracts.map((contract) => (
            <article key={contract.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{contract.id}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(contract.title, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={readinessLabel(contract.readiness, copy)}
                  state={readinessState(contract.readiness)}
                />
              </div>
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(contract.purpose, locale)}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <p style={statLabelStyle}>{copy.apiSkillApiGroup}</p>
                  <p style={{ ...statValueStyle, fontSize: 15 }}>
                    {contract.apiGroup.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.apiSkillRisk}</p>
                  <p style={{ ...statValueStyle, fontSize: 15 }}>{contract.riskLevel}</p>
                </div>
              </div>
              <div>
                <p style={statLabelStyle}>{copy.apiSkillInputFields}</p>
                <ul style={compactListStyle}>
                  {contract.inputFields.map((fieldDef) => (
                    <li key={`${contract.id}-input-${fieldDef.name}`} style={chipStyle}>
                      {fieldDef.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={statLabelStyle}>{copy.apiSkillOutputFields}</p>
                <ul style={compactListStyle}>
                  {contract.outputFields.map((fieldDef) => (
                    <li key={`${contract.id}-output-${fieldDef.name}`} style={chipStyle}>
                      {fieldDef.name}
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                <strong>{copy.apiSkillEvidence}: </strong>
                {contract.evidenceSources.join(", ")}
              </p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                <strong>{copy.apiSkillBoundary}: </strong>
                {getLocalizedText(contract.securityBoundary, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.apiSkillNextAction}: {getLocalizedText(contract.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>
        </>
      )}

      {activeWorkspace === "closeout" && (
        <section aria-label={copy.closeoutRetrospective} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.workspaceCloseout}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.closeoutRetrospective}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.closeoutRetrospectiveSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={closeoutStatusLabel(postCampaignCloseout.status, copy)}
              state={closeoutStatusBadgeState(postCampaignCloseout.status)}
            />
          </div>

          <div aria-label={copy.closeoutSummary} style={gridStyle}>
            {[
              {
                detail: copy.closeoutGateList,
                label: copy.closeoutTotalGates,
                value: String(postCampaignCloseout.summary.totalGates),
              },
              {
                detail: copy.closeoutStatus,
                label: copy.closeoutReadyGates,
                value: String(postCampaignCloseout.summary.readyCount),
              },
              {
                detail: copy.closeoutNextAction,
                label: copy.closeoutReviewGates,
                value: String(postCampaignCloseout.summary.reviewRequiredCount),
              },
              {
                detail: copy.closeoutFinalArchive,
                label: copy.closeoutBlockedGates,
                value: String(postCampaignCloseout.summary.blockedCount),
              },
              {
                detail: copy.closeoutBoundary,
                label: copy.closeoutLocalOnlyGates,
                value: String(postCampaignCloseout.summary.localOnlyCount),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.closeoutNextAction}</p>
            <p style={{ color: "#071426", fontSize: 16, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(postCampaignCloseout.nextAction, locale)}
            </p>
          </article>

          <div aria-label={copy.closeoutGateList} style={sectionGridStyle}>
            {postCampaignCloseout.gates.map((gate) => (
              <article key={gate.id} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{copy.closeoutOwner}: {closeoutOwnerLabel(gate.ownerRole)}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(gate.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={closeoutStatusLabel(gate.status, copy)}
                    state={closeoutStatusBadgeState(gate.status)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.closeoutEvidence}: {getLocalizedText(gate.evidence, locale)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.closeoutReason}: {getLocalizedText(gate.reason, locale)}
                </p>
                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.closeoutNextAction}: {getLocalizedText(gate.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>

          <section aria-label={copy.closeoutAiRetrospective} style={{ ...workflowStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.closeoutGeneratedAt}: {postCampaignCloseout.aiRetrospective.generatedAt}</p>
                <h4 style={{ fontSize: 20, lineHeight: 1.2, margin: "4px 0" }}>
                  {getLocalizedText(postCampaignCloseout.aiRetrospective.title, locale)}
                </h4>
              </div>
              <PublishStateBadge
                label={copy.closeoutHumanReviewRequired}
                state={postCampaignCloseout.aiRetrospective.humanReviewRequired ? "warning" : "ready"}
              />
            </div>
            <div style={sectionGridStyle}>
              {([
                [copy.closeoutHealthSummary, postCampaignCloseout.aiRetrospective.healthSummary],
                [copy.closeoutVerifiedActionEvidence, postCampaignCloseout.aiRetrospective.verifiedActionEvidence],
                [copy.closeoutWinnerReport, postCampaignCloseout.aiRetrospective.winnerReportSummary],
                [copy.closeoutRiskPosture, postCampaignCloseout.aiRetrospective.riskPosture],
              ] satisfies Array<[string, LocalizedText]>).map(([label, value]) => (
                <article key={label} style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{label}</p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(value, locale)}
                  </p>
                </article>
              ))}
            </div>
            <div>
              <p style={statLabelStyle}>{copy.closeoutNextIterationActions}</p>
              <ul style={listStyle}>
                {postCampaignCloseout.aiRetrospective.nextIterationActions.map((action, index) => (
                  <li key={`${getLocalizedText(action, locale)}-${index}`} style={listItemStyle}>
                    <span>{getLocalizedText(action, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p style={boundaryStyle}>
              {copy.closeoutAiRetrospectiveBoundary}: {getLocalizedText(postCampaignCloseout.aiRetrospective.boundary, locale)}
            </p>
          </section>

          <p style={boundaryStyle}>
            {copy.closeoutRewardBoundary}: {getLocalizedText(postCampaignCloseout.rewardBoundary, locale)}
          </p>
          <p style={boundaryStyle}>
            {copy.closeoutBoundary}: {getLocalizedText(postCampaignCloseout.boundary, locale)}
          </p>
        </section>
      )}

      {activeWorkspace === "settings" && (
        <section aria-label={copy.settingsReadiness} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.workspaceSettings}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.settingsReadiness}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.settingsReadinessSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={`${settingsReadiness.summary.reviewRequiredGroups} ${copy.settingsReviewGroups}`}
              state={settingsReadiness.summary.blockedGroups > 0 ? "blocker" : "warning"}
            />
          </div>

          <div aria-label={copy.settingsSummary} style={gridStyle}>
            {[
              {
                detail: copy.settingsGroupList,
                label: copy.settingsTotalGroups,
                value: String(settingsReadiness.summary.totalGroups),
              },
              {
                detail: copy.settingsReadiness,
                label: copy.settingsReadyGroups,
                value: String(settingsReadiness.summary.readyGroups),
              },
              {
                detail: copy.settingsNextAction,
                label: copy.settingsReviewGroups,
                value: String(settingsReadiness.summary.reviewRequiredGroups),
              },
              {
                detail: copy.settingsReadOnlyBoundary,
                label: copy.settingsBlockedGroups,
                value: String(settingsReadiness.summary.blockedGroups),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.settingsNextAction}</p>
            <p style={{ color: "#071426", fontSize: 16, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(settingsReadiness.summary.topNextAction, locale)}
            </p>
          </article>

          <div aria-label={copy.settingsGroupList} style={sectionGridStyle}>
            {settingsReadiness.groups.map((group) => (
              <article key={group.id} style={{ ...workflowStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{settingsOwnerLabel(group.ownerRole)}</p>
                    <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(group.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={
                      group.readiness === "ready"
                        ? copy.apiSkillReadinessReady
                        : group.readiness === "review_required"
                          ? copy.apiSkillReadinessReviewRequired
                          : copy.apiSkillReadinessBlocked
                    }
                    state={settingsReadinessBadgeState(group.readiness)}
                  />
                </div>

                <div>
                  <p style={statLabelStyle}>{copy.settingsCurrentValue}</p>
                  <p style={{ color: "#071426", fontSize: 14, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(group.currentValue, locale)}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.settingsEvidence}</p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(group.evidence, locale)}
                  </p>
                </div>
                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.settingsNextAction}: {getLocalizedText(group.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>

          <p style={boundaryStyle}>
            {copy.settingsReadOnlyBoundary}: {getLocalizedText(settingsReadiness.boundary, locale)}
          </p>
        </section>
      )}

      {activeWorkspace === "verificationRules" && (
        <section aria-label={`${copy.workspaceVerificationRules} workspace`} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.verificationRulesSummary}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.workspaceVerificationRules}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.workspaceVerificationRulesSummary}
              </p>
            </div>
            <PublishStateBadge
              label={`${verificationRulesWorkspace.summary.missingLiveEvidencePaths} ${copy.verificationPipelineMissingLiveEvidence}`}
              state={verificationRulesWorkspace.summary.blockedPaths > 0 ? "blocker" : "warning"}
            />
          </div>

          <div aria-label={copy.verificationRulesSummary} style={gridStyle}>
            {[
              {
                detail: `${verificationRulesWorkspace.summary.seededReadyPaths} ${copy.verificationPipelineSeededReady}`,
                label: copy.verificationPipelineTotalPaths,
                value: String(verificationRulesWorkspace.summary.totalRulePaths),
              },
              {
                detail: `${verificationRulesWorkspace.summary.seededReadyPaths}/${verificationRulesWorkspace.summary.totalRulePaths}`,
                label: copy.verificationPipelineSeededCoverage,
                value: String(verificationRulesWorkspace.summary.seededReadyPaths),
              },
              {
                detail: `${verificationRulesWorkspace.pipeline.summary.liveEvidenceReadyPaths} ${copy.verificationPipelineLiveReady}`,
                label: copy.verificationPipelineMissingLiveEvidence,
                value: String(verificationRulesWorkspace.summary.missingLiveEvidencePaths),
              },
              {
                detail: `${verificationRulesWorkspace.summary.manualReviewPaths} ${copy.verificationPipelineManualReviewPaths}`,
                label: copy.verificationPipelineBlockedPaths,
                value: String(verificationRulesWorkspace.summary.blockedPaths),
              },
              {
                detail: copy.verificationPipelineEligibilityImpact,
                label: copy.verificationPipelineManualReviewPaths,
                value: String(verificationRulesWorkspace.summary.manualReviewPaths),
              },
              {
                detail: `${verificationRulesWorkspace.providerEvidenceSummary.totalEntries} ${copy.verificationRulesProviderEvidence}`,
                label: copy.verificationRulesProviderLaunchBlockers,
                value: String(verificationRulesWorkspace.summary.providerLaunchBlockers),
              },
              {
                detail: copy.verificationRulesAffectedOutcomes,
                label: copy.verificationRulesAffectedOutcomes,
                value: String(verificationRulesWorkspace.summary.affectedOutcomeCount),
              },
            ].map((stat) => (
              <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.verificationPipelineEligibilityImpact}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {copy.verificationPipelineReferralQualification}
                  </h4>
                </div>
                <PublishStateBadge
                  label={readableCode(verificationRulesWorkspace.eligibilityImpact.referralQualificationStatus)}
                  state={
                    verificationRulesWorkspace.eligibilityImpact.referralQualificationStatus === "qualified"
                      ? "ready"
                      : "warning"
                  }
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(verificationRulesWorkspace.eligibilityImpact.summary, locale)}
              </p>
              <div>
                <p style={statLabelStyle}>{copy.verificationPipelineMissingRequiredTasks}</p>
                <ul style={compactListStyle}>
                  {(verificationRulesWorkspace.eligibilityImpact.missingRequiredTasks.length > 0
                    ? verificationRulesWorkspace.eligibilityImpact.missingRequiredTasks
                    : [copy.verificationPipelineNone]
                  ).map((task) => (
                    <li key={task} style={chipStyle}>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={statLabelStyle}>{copy.verificationPipelineRiskFlags}</p>
                <ul style={compactListStyle}>
                  {(verificationRulesWorkspace.eligibilityImpact.riskFlags.length > 0
                    ? verificationRulesWorkspace.eligibilityImpact.riskFlags
                    : [copy.verificationPipelineNone]
                  ).map((riskFlag) => (
                    <li key={riskFlag} style={chipStyle}>
                      {riskFlag}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <p style={statLabelStyle}>{copy.verificationRulesTopRule}</p>
              <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>
                {topVerificationRule ? getLocalizedText(topVerificationRule.label, locale) : copy.verificationPipelineNone}
              </h4>
              {topVerificationRule ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <PublishStateBadge
                      label={`${copy.verificationPipelineReleaseImpact}: ${readableCode(topVerificationRule.releaseImpact)}`}
                      state={pipelineReleaseImpactState(topVerificationRule.releaseImpact)}
                    />
                    <PublishStateBadge
                      label={`${copy.verificationProviderReadiness}: ${readableCode(topVerificationRule.providerReadiness)}`}
                      state={pipelineProviderState(topVerificationRule.providerReadiness)}
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.verificationPipelineNextAction}: {getLocalizedText(topVerificationRule.nextAction, locale)}
                  </p>
                </>
              ) : null}
            </article>
          </div>

          <div aria-label={copy.workspaceVerificationRules} style={sectionGridStyle}>
            {verificationRulesWorkspace.pipeline.paths.map((path) => (
              <article key={path.id} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={headingRowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{path.evidenceSource}</p>
                    <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                      {getLocalizedText(path.label, locale)}
                    </h4>
                  </div>
                  <PublishStateBadge
                    label={readableCode(path.releaseImpact)}
                    state={pipelineReleaseImpactState(path.releaseImpact)}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={`${copy.verificationPipelineSeededCoverage}: ${readableCode(path.seededCoverageStatus)}`}
                    state={pipelineSeededCoverageState(path.seededCoverageStatus)}
                  />
                  <PublishStateBadge
                    label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(path.liveEvidenceStatus)}`}
                    state={pipelineLiveEvidenceState(path.liveEvidenceStatus)}
                  />
                  <PublishStateBadge
                    label={`${copy.verificationProviderReadiness}: ${readableCode(path.providerReadiness)}`}
                    state={pipelineProviderState(path.providerReadiness)}
                  />
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.verificationRulesAffectedOutcomes}</p>
                  <ul style={compactListStyle}>
                    {path.affectedOutcomes.map((outcome) => (
                      <li key={`${path.id}-${outcome}`} style={chipStyle}>
                        {readableCode(outcome)}
                      </li>
                    ))}
                  </ul>
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  <strong>{copy.settingsOwner}: </strong>
                  {settingsOwnerLabel(path.owner)}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  <strong>{copy.verificationPipelineEligibilityImpact}: </strong>
                  {getLocalizedText(path.eligibilityImpact, locale)}
                </p>
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  <strong>{copy.verificationPipelineFallbackReason}: </strong>
                  {getLocalizedText(path.fallbackReason, locale)}
                </p>
                <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {copy.verificationPipelineNextAction}: {getLocalizedText(path.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>

          <article style={{ ...workflowStyle, minHeight: 0 }}>
            <div style={headingRowStyle}>
              <div>
                <p style={statLabelStyle}>{copy.providerRegistryLocalOnlyBoundary}</p>
                <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                  {copy.verificationRulesProviderEvidence}
                </h4>
              </div>
              <PublishStateBadge
                label={`${verificationRulesWorkspace.providerEvidenceSummary.launchBlockers} ${copy.providerRegistryLaunchBlockers}`}
                state={verificationRulesWorkspace.providerEvidenceSummary.launchBlockers > 0 ? "blocker" : "ready"}
              />
            </div>

            <div aria-label={copy.verificationRulesProviderEvidence} style={gridStyle}>
              {[
                {
                  detail: `${verificationRulesWorkspace.providerEvidenceSummary.localOnlyEntries} ${copy.providerRegistryLocalOnly}`,
                  label: copy.providerRegistryTotalEntries,
                  value: String(verificationRulesWorkspace.providerEvidenceSummary.totalEntries),
                },
                {
                  detail: copy.providerRegistryAdapterReadiness,
                  label: copy.providerRegistryReviewRequired,
                  value: String(verificationRulesWorkspace.providerEvidenceSummary.reviewRequiredEntries),
                },
                {
                  detail: copy.providerRegistryUnavailableReadiness,
                  label: copy.providerRegistryUnavailable,
                  value: String(verificationRulesWorkspace.providerEvidenceSummary.unavailableEntries),
                },
                {
                  detail: copy.providerRegistryBlockedReadiness,
                  label: copy.providerRegistryBlocked,
                  value: String(verificationRulesWorkspace.providerEvidenceSummary.blockedEntries),
                },
              ].map((stat) => (
                <article key={stat.label} style={{ ...cardStyle, minHeight: 0 }}>
                  <p style={statLabelStyle}>{stat.label}</p>
                  <p style={{ ...statValueStyle, fontSize: 20 }}>{stat.value}</p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                    {stat.detail}
                  </p>
                </article>
              ))}
            </div>

            <div style={sectionGridStyle}>
              {verificationRulesWorkspace.providerEvidenceEntries.map((entry) => (
                <article key={entry.id} style={{ ...cardStyle, minHeight: 0 }}>
                  <div style={headingRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <p style={statLabelStyle}>{entry.providerId}</p>
                      <h5 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0" }}>
                        {getLocalizedText(entry.label, locale)}
                      </h5>
                    </div>
                    <PublishStateBadge
                      label={readableCode(entry.adapterReadiness)}
                      state={providerEvidenceRegistryState(entry.adapterReadiness)}
                    />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <PublishStateBadge
                      label={`${copy.verificationPipelineSeededCoverage}: ${readableCode(entry.seededCoverageStatus)}`}
                      state={entry.seededCoverageStatus === "ready" ? "ready" : "warning"}
                    />
                    <PublishStateBadge
                      label={`${copy.verificationPipelineLiveEvidence}: ${readableCode(entry.liveEvidenceStatus)}`}
                      state={pipelineLiveEvidenceState(entry.liveEvidenceStatus)}
                    />
                    <PublishStateBadge
                      label={`${copy.providerRegistryFeatureGate}: ${readableCode(entry.featureGate.state)}`}
                      state={entry.featureGate.state === "disabled" ? "blocker" : "warning"}
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
                    {copy.providerRegistryFeatureGate}: {entry.featureGate.configKey}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {copy.verificationPipelineNextAction}: {getLocalizedText(entry.evidenceRequired, locale)}
                  </p>
                  <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                    {copy.providerRegistryFallback}: {getLocalizedText(entry.fallback.label, locale)}
                    {" - "}
                    {getLocalizedText(entry.fallback.description, locale)}
                  </p>
                </article>
              ))}
            </div>
          </article>

          <div style={boundaryStyle}>
            <p style={{ margin: 0 }}>{getLocalizedText(verificationRulesWorkspace.boundary, locale)}</p>
            <p style={{ margin: "8px 0 0" }}>
              {copy.verificationPipelineNextAction}: {getLocalizedText(verificationRulesWorkspace.nextAction, locale)}
            </p>
          </div>
        </section>
      )}

      {!stageReviewMode && activeWorkspace === "create" && (
      <section aria-label="Project Console workflow sections" style={sectionGridStyle}>
        {workflows.map((workflow) => (
          <article key={workflow.title} style={workflowStyle}>
            <div style={headingRowStyle}>
              <h3 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>{workflow.title}</h3>
              {workflow.extra}
            </div>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{workflow.state}</p>
            <button style={actionButtonStyle} type="button">
              {workflow.action}
            </button>
          </article>
        ))}
      </section>
      )}
    </div>
  );
};
