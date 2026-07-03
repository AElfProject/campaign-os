import { useState, type CSSProperties } from "react";
import {
  createAiContentPackWorkbench,
  createApiSkillContractSurface,
  createCampaignOsLocalService,
  createCampaignTemplatePack,
  campaignDetail,
  createCampaignSettingsReadiness,
  createForecastCampaignTaskReadiness,
  createLocaleAnalyticsReadiness,
  createParticipantOperationsReadModel,
  createPostCampaignCloseout,
  createProjectCampaignCommandCenter,
  createLiveWalletConnectorBoundary,
  createStateComponentsDeliveryGallery,
  createVerificationCoverageSummary,
  createVerificationRulesWorkspace,
  getLocalizedText,
  seededCampaignDraft,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type AiContentReleaseActionState,
  type AiOpsKpiReadiness,
  type AelfWebLoginAdapterLiveEvidenceStatus,
  type AelfWebLoginAdapterReadiness,
  type AdvancedAnalyticsReadinessState,
  type ApiSkillContractReadiness,
  type CampaignTemplatePreset,
  type CampaignLifecycleOperation,
  type CampaignLifecycleOperationState,
  type CampaignLifecycleStatus,
  type CampaignTemplateReadiness,
  type CampaignShellDetail,
  type CampaignSettingsReadinessState,
  type ExportReadinessState,
  type ForecastCampaignTaskOwnerRole,
  type ForecastCampaignTaskProviderState,
  type ForecastCampaignTaskReadinessState,
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
import { projectConsoleCopy } from "./copy";

interface ProjectConsoleProps {
  locale: SupportedLocale;
  campaign?: CampaignShellDetail;
  activeWorkspace?: ProjectWorkspaceKey;
  onWorkspaceChange?: (workspace: ProjectWorkspaceKey) => void;
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

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

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
  locale: SupportedLocale,
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
  } satisfies Record<SupportedLocale, Record<CampaignTemplatePreset["ownerRole"], string>>;

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
  locale: SupportedLocale,
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
  } satisfies Record<SupportedLocale, Record<ForecastCampaignTaskProviderState, string>>;

  return labels[locale][state];
};

const forecastTaskOwnerLabel = (
  ownerRole: ForecastCampaignTaskOwnerRole,
  locale: SupportedLocale,
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
  } satisfies Record<SupportedLocale, Record<ForecastCampaignTaskOwnerRole, string>>;

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

export const ProjectConsole = ({
  activeWorkspace: controlledActiveWorkspace,
  campaign = campaignDetail,
  locale,
  onWorkspaceChange,
}: ProjectConsoleProps) => {
  const copy = projectConsoleCopy[locale];
  const [internalActiveWorkspace, setInternalActiveWorkspace] = useState<ProjectWorkspaceKey>("campaigns");
  const activeWorkspace = controlledActiveWorkspace ?? internalActiveWorkspace;
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const firstParticipant = campaign.participants[0];
  const secondParticipant = campaign.participants[1];
  const contractReview = campaign.reviewItems.find((item) => item.type === "CONTRACT_IMPACT");
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = campaign.publishReadiness.blockers.length;
  const builderDraft = seededCampaignDraft;
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
  const topLifecycleOperation = lifecycleOperations.operations.find(
    (operation) => operation.id === lifecycleOperations.summary.topOperationId,
  );
  const localeAnalyticsReadiness = createLocaleAnalyticsReadiness(campaign);
  const aiContentPack = createAiContentPackWorkbench(campaign);
  const campaignTemplatePack = createCampaignTemplatePack();
  const forecastTaskReadiness = createForecastCampaignTaskReadiness(campaign);
  const participantOperations = createParticipantOperationsReadModel(campaign);
  const settingsReadiness = createCampaignSettingsReadiness(campaign);
  const postCampaignCloseout = createPostCampaignCloseout(campaign);
  const stateComponentsDeliveryGallery = createStateComponentsDeliveryGallery(campaign);
  const verificationRulesWorkspace = createVerificationRulesWorkspace(campaign);
  const topVerificationRule = verificationRulesWorkspace.pipeline.paths.find(
    (path) => path.id === verificationRulesWorkspace.topRulePathId,
  );

  const selectWorkspace = (workspace: ProjectWorkspaceKey) => {
    if (!controlledActiveWorkspace) {
      setInternalActiveWorkspace(workspace);
    }

    onWorkspaceChange?.(workspace);
  };

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

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: "100%", minWidth: 0 }}>
      <section aria-label={copy.projectWorkspace} style={workspaceShellStyle}>
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

        <nav aria-label={copy.projectWorkspaceNavigation} style={workspaceNavStyle}>
          {projectWorkspaceKeys.map((workspaceKey) => (
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

        <article style={workspaceIntroStyle}>
          <p style={statLabelStyle}>{copy.activeWorkspace}</p>
          <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>
            {workspaceLabels[activeWorkspace]}
          </h3>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {workspaceSummaries[activeWorkspace]}
          </p>
        </article>
      </section>

      {activeWorkspace === "campaigns" && (
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

      <CampaignBuilderPanel copy={copy} draft={builderDraft} locale={locale} />

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
        </>
      )}

      {activeWorkspace === "templates" && (
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

          <TaskTemplateLibrary locale={locale} />

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

      {activeWorkspace === "create" && (
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
