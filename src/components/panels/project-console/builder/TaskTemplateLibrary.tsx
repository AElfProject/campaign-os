import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Check, CircleAlert, Plus, RefreshCw, Sparkles, Unplug } from "lucide-react";
import type {
  AddOwnerCampaignTaskInput,
  GenerateOwnerTaskPreviewInput,
  OwnerTaskPreviewSuggestion,
} from "../../../../api/projectOwnerCampaignApiBridge";
import {
  createTaskTemplateFilterSummary,
  defaultTaskTemplateFilters,
  filterTaskTemplates,
  getLocalizedText,
  taskTemplateLanguageFilterOptions,
  taskTemplateLibrary,
  taskTemplateVerificationFilterOptions,
  taskTemplateWalletFilterOptions,
  type SupportedLocale,
  type TaskTemplate,
  type TaskTemplateFilterOption,
  type TaskTemplateFilterState,
  type TaskTemplateLanguageFilter,
  type TaskTemplateVerificationFilter,
  type TaskTemplateWalletFilter,
  type VerificationType,
  type WalletPolicy,
} from "../../../../domain";
import { LocaleStatusBadge, WalletCompatibilityBadge } from "../../../badges/Badges";
import { projectConsoleCopy } from "../copy";
import {
  createOwnerCampaignAddPendingTargetKey,
  createOwnerCampaignAdoptPendingTargetKey,
  ownerCampaignGeneratePendingTargetKey,
  type OwnerCampaignTaskIntentContract,
  type OwnerCampaignTaskPendingTargetKey,
} from "../ownerCampaignWorkflow";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;

interface TaskTemplateLibraryProps {
  locale: BusinessContentLocale;
  ownerWorkflow: OwnerCampaignTaskIntentContract;
  templates?: TaskTemplate[];
}

interface TaskTemplateLibraryCopy {
  clearFilters: string;
  defaultPoints: string;
  emptyState: string;
  filterResults: (visible: number, total: number) => string;
  filters: string;
  languageStatus: string;
  optional: string;
  required: string;
  risk: string;
  title: string;
  verification: string;
  walletCompatibility: string;
}

interface GenerateFormState {
  goal: string;
  product: string;
  targetUsers: string;
  walletPolicy: WalletPolicy;
}

const copy = {
  "en-US": {
    clearFilters: "Reset filters",
    defaultPoints: "Default points",
    emptyState: "No task templates match the selected filters.",
    filterResults: (visible: number, total: number) => `${visible} of ${total} templates`,
    filters: "Filters",
    languageStatus: "Language status",
    optional: "Optional",
    required: "Required",
    risk: "Risk",
    title: "Task template library",
    verification: "Verification",
    walletCompatibility: "Wallet compatibility",
  },
  "zh-CN": {
    clearFilters: "重置筛选",
    defaultPoints: "默认积分",
    emptyState: "没有任务模板匹配当前筛选条件。",
    filterResults: (visible: number, total: number) => `${visible} / ${total} 个模板`,
    filters: "筛选",
    languageStatus: "语言状态",
    optional: "可选",
    required: "必做",
    risk: "风险",
    title: "任务模板库",
    verification: "验证方式",
    walletCompatibility: "钱包兼容性",
  },
  "zh-TW": {
    clearFilters: "重置篩選",
    defaultPoints: "預設積分",
    emptyState: "沒有任務模板符合目前篩選條件。",
    filterResults: (visible: number, total: number) => `${visible} / ${total} 個模板`,
    filters: "篩選",
    languageStatus: "語言狀態",
    optional: "可選",
    required: "必做",
    risk: "風險",
    title: "任務模板庫",
    verification: "驗證方式",
    walletCompatibility: "錢包相容性",
  },
} satisfies Record<BusinessContentLocale, TaskTemplateLibraryCopy>;

const unsupportedPersistenceReason = "UNSUPPORTED_PERSISTENCE_TYPE";
const referralPersistenceReason = "REFERRAL_TASK_ADD_UNSUPPORTED";
const globalDisabledReasonId = "owner-task-command-disabled-reason";
const generateDisabledReasonId = "owner-task-generate-disabled-reason";

const evidenceSourceByVerificationType = {
  DAPP_API: "DAPP_API",
  MANUAL: "OWNER_REVIEW",
  ON_CHAIN: "AELFSCAN",
  SOCIAL: "OWNER_REVIEW",
  WALLET: "WALLET_SESSION",
} as const satisfies Record<VerificationType, string>;

const isPersistenceVerificationType = (value: string): value is VerificationType =>
  Object.prototype.hasOwnProperty.call(evidenceSourceByVerificationType, value);

const templateCodeFromId = (templateId: string) =>
  templateId.startsWith("tpl-") ? templateId.slice(4) : templateId;

const persistenceTemplateRegistry = new Map<string, AddOwnerCampaignTaskInput>(
  taskTemplateLibrary.flatMap((template) => {
    if (!isPersistenceVerificationType(template.verificationType)) {
      return [];
    }

    return [[template.id, {
      evidenceRule: {
        category: template.category,
        source: evidenceSourceByVerificationType[template.verificationType],
        templateId: template.id,
      },
      points: template.defaultPoints,
      required: template.requiredByDefault,
      templateCode: templateCodeFromId(template.id),
      verificationType: template.verificationType,
      walletCompatibility: template.walletCompatibility,
    } satisfies AddOwnerCampaignTaskInput]];
  }),
);

const supportedSuggestionTemplateCodes = new Set(
  [...persistenceTemplateRegistry.values()].map((entry) => entry.templateCode),
);

const taskInputForTemplate = (template: TaskTemplate) => {
  const registered = persistenceTemplateRegistry.get(template.id);

  if (
    !registered
    || registered.evidenceRule.category !== template.category
    || registered.points !== template.defaultPoints
    || registered.required !== template.requiredByDefault
    || registered.verificationType !== template.verificationType
    || registered.walletCompatibility !== template.walletCompatibility
  ) {
    return null;
  }

  return {
    ...registered,
    evidenceRule: { ...registered.evidenceRule },
  };
};

const suggestionDisabledReason = (suggestion: OwnerTaskPreviewSuggestion) => {
  if (
    suggestion.verificationType === "REFERRAL"
    || suggestion.rejectionCode === referralPersistenceReason
  ) {
    return referralPersistenceReason;
  }

  if (
    !suggestion.adoptable
    || !isPersistenceVerificationType(suggestion.verificationType)
    || !supportedSuggestionTemplateCodes.has(suggestion.templateCode)
  ) {
    return unsupportedPersistenceReason;
  }

  return null;
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  minWidth: 0,
};

const filterPanelStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  minWidth: 0,
  padding: 12,
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  minWidth: 0,
};

const fieldsetStyle: CSSProperties = {
  border: 0,
  display: "grid",
  gap: 8,
  margin: 0,
  minInlineSize: 0,
  padding: 0,
};

const legendStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 0,
  marginBottom: 2,
  padding: 0,
};

const checkboxLabelStyle: CSSProperties = {
  alignItems: "flex-start",
  color: "#334155",
  display: "flex",
  fontSize: 13,
  fontWeight: 700,
  gap: 8,
  lineHeight: 1.35,
};

const checkboxStyle: CSSProperties = {
  flex: "0 0 auto",
  marginTop: 2,
};

const filterMetaStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
  minWidth: 0,
};

const commandButtonStyle: CSSProperties = {
  alignItems: "center",
  background: "#071426",
  border: "1px solid #071426",
  borderRadius: 6,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 800,
  gap: 7,
  justifyContent: "center",
  letterSpacing: 0,
  maxWidth: "100%",
  minHeight: 40,
  minWidth: 120,
  outlineOffset: 2,
  overflowWrap: "anywhere",
  padding: "7px 11px",
  whiteSpace: "normal",
  width: "fit-content",
};

const secondaryButtonStyle: CSSProperties = {
  ...commandButtonStyle,
  background: "#ffffff",
  border: "1px solid #b8c7da",
  color: "#0f172a",
};

const disabledButtonStyle: CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.62,
};

const emptyStateStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px dashed #b8c7da",
  borderRadius: 8,
  color: "#475569",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.45,
  margin: 0,
  overflowWrap: "anywhere",
  padding: 14,
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const valueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
  overflowWrap: "anywhere",
};

const bodyStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
  overflowWrap: "anywhere",
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  minWidth: 0,
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  minWidth: 0,
};

const headingRowStyle: CSSProperties = {
  alignItems: "start",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
  minWidth: 0,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
  minWidth: 0,
};

const inputStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #b8c7da",
  borderRadius: 6,
  color: "#071426",
  minHeight: 40,
  minWidth: 0,
  outlineOffset: 2,
  padding: "7px 9px",
  width: "100%",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  listStyle: "none",
  margin: 0,
  minWidth: 0,
  padding: 0,
};

const isSameFilterState = (left: TaskTemplateFilterState, right: TaskTemplateFilterState) =>
  left.wallet.length === right.wallet.length
  && left.verification.length === right.verification.length
  && left.language.length === right.language.length
  && left.wallet.every((value, index) => value === right.wallet[index])
  && left.verification.every((value, index) => value === right.verification[index])
  && left.language.every((value, index) => value === right.language[index]);

const toggleFilterValue = <TValue extends string>(
  currentValues: readonly TValue[],
  nextValue: TValue,
) => currentValues.includes(nextValue)
  ? currentValues.filter((value) => value !== nextValue)
  : [...currentValues, nextValue];

interface FilterGroupProps<TValue extends string> {
  legend: string;
  options: readonly TaskTemplateFilterOption<TValue>[];
  selectedValues: readonly TValue[];
  locale: BusinessContentLocale;
  onToggle: (value: TValue) => void;
}

const FilterGroup = <TValue extends string>({
  legend,
  locale,
  onToggle,
  options,
  selectedValues,
}: FilterGroupProps<TValue>) => (
  <fieldset style={fieldsetStyle}>
    <legend style={legendStyle}>{legend}</legend>
    {options.map((option) => (
      <label key={option.value} style={checkboxLabelStyle} title={getLocalizedText(option.description, locale)}>
        <input
          checked={selectedValues.includes(option.value)}
          onChange={() => onToggle(option.value)}
          style={checkboxStyle}
          type="checkbox"
        />
        <span>{getLocalizedText(option.label, locale)}</span>
      </label>
    ))}
  </fieldset>
);

const targetUsersFromInput = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((targetUser) => targetUser.trim())
    .filter(Boolean);

const workflowStatusText = (
  ownerWorkflow: OwnerCampaignTaskIntentContract,
  locale: BusinessContentLocale,
) => {
  const labels = projectConsoleCopy[locale];
  const targetKey = ownerWorkflow.pendingTargetKey;

  if (!ownerWorkflow.issuedSessionReady || !ownerWorkflow.ownerContext) {
    return labels.ownerTaskNoSession;
  }
  if (ownerWorkflow.status === "recovering") {
    return labels.ownerTaskRecovering;
  }
  if (targetKey === ownerCampaignGeneratePendingTargetKey) {
    return labels.ownerTaskGeneratingPreview;
  }
  if (targetKey?.startsWith("add:")) {
    const templateCode = targetKey.slice("add:".length);
    const template = taskTemplateLibrary.find(
      (candidate) => templateCodeFromId(candidate.id) === templateCode,
    );
    return `${labels.ownerTaskAdding} ${template ? getLocalizedText(template.title, locale) : templateCode}`;
  }
  if (targetKey?.startsWith("adopt:")) {
    const suggestionId = targetKey.slice("adopt:".length);
    const suggestion = ownerWorkflow.preview?.suggestions.find(
      (candidate) => candidate.id === suggestionId,
    );
    return `${labels.ownerTaskAdopting} ${suggestion?.templateCode ?? suggestionId}`;
  }
  if (ownerWorkflow.status === "degraded") {
    return labels.ownerTaskDegraded;
  }
  if (ownerWorkflow.status === "error") {
    return labels.ownerTaskError;
  }
  if (!ownerWorkflow.activeCampaignId) {
    return labels.ownerTaskNoActiveCampaign;
  }
  if (ownerWorkflow.status === "loading_detail") {
    return labels.ownerTaskPendingRefresh;
  }
  if (ownerWorkflow.status === "mutation_pending") {
    return labels.ownerTaskCommandPending;
  }
  if (ownerWorkflow.status === "empty" || ownerWorkflow.status === "selection_required") {
    return labels.ownerTaskEmpty;
  }

  return labels.ownerTaskReady;
};

const globalCommandDisabledReason = (
  ownerWorkflow: OwnerCampaignTaskIntentContract,
  locale: BusinessContentLocale,
) => {
  const labels = projectConsoleCopy[locale];

  if (!ownerWorkflow.issuedSessionReady || !ownerWorkflow.ownerContext) {
    return labels.ownerTaskNoSession;
  }
  if (ownerWorkflow.status === "recovering") {
    return labels.ownerTaskRecovering;
  }
  if (ownerWorkflow.pendingCommand || ownerWorkflow.pendingTargetKey) {
    return labels.ownerTaskCommandPending;
  }
  if (ownerWorkflow.status === "degraded") {
    return labels.ownerTaskDegraded;
  }
  if (ownerWorkflow.status === "error") {
    return labels.ownerTaskError;
  }
  if (!ownerWorkflow.activeCampaignId) {
    return labels.ownerTaskNoActiveCampaign;
  }
  if (ownerWorkflow.status === "loading_detail") {
    return labels.ownerTaskLoadingDetail;
  }
  if (ownerWorkflow.status === "mutation_pending") {
    return labels.ownerTaskCommandPending;
  }
  if (ownerWorkflow.commandsDisabled) {
    return labels.ownerTaskEmpty;
  }

  return null;
};

export const TaskTemplateLibrary = ({
  locale,
  ownerWorkflow,
  templates = taskTemplateLibrary,
}: TaskTemplateLibraryProps) => {
  const labels = copy[locale];
  const ownerLabels = projectConsoleCopy[locale];
  const [filters, setFilters] = useState<TaskTemplateFilterState>(defaultTaskTemplateFilters);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>({
    goal: "",
    product: ownerWorkflow.detail?.campaign.projectId ?? "",
    targetUsers: "",
    walletPolicy: "ANY",
  });
  const filteredTemplates = useMemo(() => filterTaskTemplates(templates, filters), [filters, templates]);
  const summary = createTaskTemplateFilterSummary(templates, filteredTemplates, filters);
  const hasChangedFilters = !isSameFilterState(filters, defaultTaskTemplateFilters);
  const globalDisabledReason = globalCommandDisabledReason(ownerWorkflow, locale);
  const targetUsers = targetUsersFromInput(generateForm.targetUsers);
  const generateFormValid = Boolean(generateForm.goal.trim())
    && Boolean(generateForm.product.trim())
    && targetUsers.length > 0;
  const generateDisabledReason = globalDisabledReason
    ?? (!generateFormValid ? ownerLabels.ownerTaskRequiredGenerateFields : null);
  const visiblePreview = ownerWorkflow.preview?.campaignId === ownerWorkflow.activeCampaignId
    ? ownerWorkflow.preview
    : null;
  const showRetry = Boolean(ownerWorkflow.activeCampaignId)
    && Boolean(ownerWorkflow.error?.retryable);
  const showReconnect = !ownerWorkflow.issuedSessionReady
    || Boolean(ownerWorkflow.error?.reconnectRequired);
  const commandDispatchGuardRef = useRef<OwnerCampaignTaskPendingTargetKey | null>(
    ownerWorkflow.pendingTargetKey,
  );
  const controlledPendingObservedRef = useRef(Boolean(
    ownerWorkflow.pendingCommand || ownerWorkflow.pendingTargetKey,
  ));

  useEffect(() => {
    if (ownerWorkflow.pendingCommand || ownerWorkflow.pendingTargetKey) {
      controlledPendingObservedRef.current = true;
      commandDispatchGuardRef.current = ownerWorkflow.pendingTargetKey
        ?? commandDispatchGuardRef.current;
      return;
    }

    if (controlledPendingObservedRef.current) {
      commandDispatchGuardRef.current = null;
      controlledPendingObservedRef.current = false;
    }
  }, [ownerWorkflow.pendingCommand, ownerWorkflow.pendingTargetKey]);

  const dispatchCommandOnce = (
    targetKey: OwnerCampaignTaskPendingTargetKey,
    dispatch: () => void,
  ) => {
    if (globalDisabledReason || commandDispatchGuardRef.current) {
      return;
    }

    commandDispatchGuardRef.current = targetKey;

    try {
      dispatch();
    } catch (error) {
      commandDispatchGuardRef.current = null;
      throw error;
    }
  };

  const toggleWalletFilter = (value: TaskTemplateWalletFilter) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      wallet: toggleFilterValue(currentFilters.wallet, value),
    }));
  };

  const toggleVerificationFilter = (value: TaskTemplateVerificationFilter) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      verification: toggleFilterValue(currentFilters.verification, value),
    }));
  };

  const toggleLanguageFilter = (value: TaskTemplateLanguageFilter) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      language: toggleFilterValue(currentFilters.language, value),
    }));
  };

  const submitGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (generateDisabledReason) {
      return;
    }

    const input: GenerateOwnerTaskPreviewInput = {
      goal: generateForm.goal.trim(),
      product: generateForm.product.trim(),
      targetUsers,
      walletPolicy: generateForm.walletPolicy,
    };
    dispatchCommandOnce(
      ownerCampaignGeneratePendingTargetKey,
      () => ownerWorkflow.onGenerate(input),
    );
  };

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <div style={headingRowStyle}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
          <p style={bodyStyle}>
            <strong>{ownerLabels.ownerTaskActiveCampaign}: </strong>
            <span title={ownerWorkflow.activeCampaignId ?? ownerLabels.ownerTaskNoActiveCampaign}>
              {ownerWorkflow.activeCampaignId ?? ownerLabels.ownerTaskNoActiveCampaign}
            </span>
          </p>
          {ownerWorkflow.ownerContext ? (
            <p style={bodyStyle} title={ownerWorkflow.ownerContext.address}>
              {ownerWorkflow.ownerContext.address}
            </p>
          ) : null}
        </div>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {showRetry ? (
            <button
              aria-label={ownerLabels.ownerTaskRetryDetail}
              onClick={ownerWorkflow.onRetryDetail}
              style={secondaryButtonStyle}
              title={ownerLabels.ownerTaskRetryDetail}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} strokeWidth={2.4} />
              {ownerLabels.ownerTaskRetryDetail}
            </button>
          ) : null}
          {showReconnect ? (
            <button
              aria-label={ownerLabels.ownerTaskReconnect}
              disabled={!ownerWorkflow.onReconnect}
              onClick={() => ownerWorkflow.onReconnect?.()}
              style={{ ...secondaryButtonStyle, ...(!ownerWorkflow.onReconnect ? disabledButtonStyle : {}) }}
              title={ownerLabels.ownerTaskReconnect}
              type="button"
            >
              <Unplug aria-hidden="true" size={16} strokeWidth={2.4} />
              {ownerLabels.ownerTaskReconnect}
            </button>
          ) : null}
        </div>
      </div>

      <div
        aria-atomic="true"
        aria-live="polite"
        role="status"
        style={{ ...bodyStyle, fontWeight: 800, minHeight: 22 }}
      >
        {workflowStatusText(ownerWorkflow, locale)}
      </div>

      {globalDisabledReason ? (
        <p id={globalDisabledReasonId} style={bodyStyle}>
          {globalDisabledReason}
        </p>
      ) : null}

      {ownerWorkflow.error ? (
        <div
          role="alert"
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: 6,
            color: "#7c2d12",
            display: "grid",
            gap: 4,
            minWidth: 0,
            padding: 10,
          }}
        >
          <strong style={{ alignItems: "center", display: "flex", gap: 7 }}>
            <CircleAlert aria-hidden="true" size={16} strokeWidth={2.4} />
            {ownerWorkflow.error.message}
          </strong>
          <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>
            {ownerWorkflow.error.code}
            {ownerWorkflow.error.httpStatus !== undefined ? ` · HTTP ${ownerWorkflow.error.httpStatus}` : ""}
            {` · ${ownerLabels.ownerTaskTraceId}: ${ownerWorkflow.error.traceId}`}
          </span>
        </div>
      ) : null}

      <section
        aria-label={ownerLabels.ownerTaskCanonicalTasks}
        role="region"
        style={{ display: "grid", gap: 8, minWidth: 0 }}
      >
        <div style={headingRowStyle}>
          <h4 style={{ fontSize: 16, lineHeight: 1.25, margin: 0 }}>
            {ownerLabels.ownerTaskCanonicalTasks}
          </h4>
          <span style={{ ...labelStyle, textTransform: "none" }}>{ownerWorkflow.tasks.length}</span>
        </div>
        {ownerWorkflow.tasks.length > 0 ? (
          <ul style={listStyle}>
            {ownerWorkflow.tasks.map((task) => (
              <li
                data-task-id={task.id}
                key={task.id}
                style={{
                  alignItems: "center",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "space-between",
                  minWidth: 0,
                  padding: "7px 0",
                }}
              >
                <strong style={{ fontSize: 13, overflowWrap: "anywhere" }} title={task.id}>
                  {task.id}
                </strong>
                <span style={bodyStyle}>
                  {task.templateCode ?? task.verificationType} · {task.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={emptyStateStyle}>{ownerLabels.ownerTaskNoCanonicalTasks}</p>
        )}
      </section>

      <form
        aria-label={ownerLabels.ownerTaskGeneratePreview}
        onSubmit={submitGenerate}
        style={{ ...filterPanelStyle, background: "#ffffff" }}
      >
        <div style={headingRowStyle}>
          <h4 style={{ fontSize: 16, lineHeight: 1.25, margin: 0 }}>
            {ownerLabels.ownerTaskGeneratePreview}
          </h4>
          <span style={labelStyle}>{generateForm.walletPolicy}</span>
        </div>
        <div style={formGridStyle}>
          <label style={{ ...checkboxLabelStyle, display: "grid", minWidth: 0 }}>
            <span>{ownerLabels.ownerTaskGoal}</span>
            <input
              aria-label={ownerLabels.ownerTaskGoal}
              onChange={(event) => setGenerateForm((current) => ({ ...current, goal: event.target.value }))}
              style={inputStyle}
              type="text"
              value={generateForm.goal}
            />
          </label>
          <label style={{ ...checkboxLabelStyle, display: "grid", minWidth: 0 }}>
            <span>{ownerLabels.ownerTaskProduct}</span>
            <input
              aria-label={ownerLabels.ownerTaskProduct}
              onChange={(event) => setGenerateForm((current) => ({ ...current, product: event.target.value }))}
              style={inputStyle}
              type="text"
              value={generateForm.product}
            />
          </label>
          <label style={{ ...checkboxLabelStyle, display: "grid", minWidth: 0 }}>
            <span>{ownerLabels.ownerTaskTargetUsers}</span>
            <input
              aria-label={ownerLabels.ownerTaskTargetUsers}
              onChange={(event) => setGenerateForm((current) => ({ ...current, targetUsers: event.target.value }))}
              style={inputStyle}
              type="text"
              value={generateForm.targetUsers}
            />
          </label>
          <label style={{ ...checkboxLabelStyle, display: "grid", minWidth: 0 }}>
            <span>{ownerLabels.ownerTaskWalletPolicy}</span>
            <select
              aria-label={ownerLabels.ownerTaskWalletPolicy}
              onChange={(event) => setGenerateForm((current) => ({
                ...current,
                walletPolicy: event.target.value as WalletPolicy,
              }))}
              style={inputStyle}
              value={generateForm.walletPolicy}
            >
              <option value="ANY">ANY</option>
              <option value="AA_ONLY">AA_ONLY</option>
              <option value="EOA_ONLY">EOA_ONLY</option>
            </select>
          </label>
        </div>
        <button
          aria-describedby={generateDisabledReason
            ? globalDisabledReason ? globalDisabledReasonId : generateDisabledReasonId
            : undefined}
          aria-label={ownerLabels.ownerTaskGeneratePreview}
          disabled={Boolean(generateDisabledReason)}
          style={{
            ...commandButtonStyle,
            width: 220,
            ...(generateDisabledReason ? disabledButtonStyle : {}),
          }}
          title={generateDisabledReason ?? ownerLabels.ownerTaskGeneratePreview}
          type="submit"
        >
          <Sparkles aria-hidden="true" size={16} strokeWidth={2.4} />
          {ownerWorkflow.pendingTargetKey === ownerCampaignGeneratePendingTargetKey
            ? ownerLabels.ownerTaskGeneratingPreview
            : ownerLabels.ownerTaskGeneratePreview}
        </button>
        {generateDisabledReason && !globalDisabledReason ? (
          <p id={generateDisabledReasonId} style={bodyStyle}>{generateDisabledReason}</p>
        ) : null}
      </form>

      {visiblePreview ? (
        <section
          aria-label={ownerLabels.ownerTaskPreview}
          role="region"
          style={{ display: "grid", gap: 10, minWidth: 0 }}
        >
          <h4 style={{ fontSize: 16, lineHeight: 1.25, margin: 0 }}>{ownerLabels.ownerTaskPreview}</h4>
          {visiblePreview.suggestions.length > 0 ? (
            <div style={gridStyle}>
              {visiblePreview.suggestions.map((item, index) => {
                const reason = suggestionDisabledReason(item);
                const reasonId = `owner-task-suggestion-reason-${index}`;
                const pendingKey = createOwnerCampaignAdoptPendingTargetKey(item);
                const pending = ownerWorkflow.pendingTargetKey === pendingKey;
                const disabledReason = globalDisabledReason ?? reason;

                return (
                  <article data-suggestion-id={item.id} key={item.id} style={cardStyle}>
                    <div style={headingRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <p style={labelStyle}>{item.verificationType}</p>
                        <h5 style={{ fontSize: 15, lineHeight: 1.25, margin: "3px 0" }}>
                          {item.templateCode}
                        </h5>
                      </div>
                      <span style={{ ...labelStyle, textTransform: "none" }}>{item.points}</span>
                    </div>
                    <p style={bodyStyle} title={item.id}>{item.id}</p>
                    <button
                      aria-describedby={disabledReason
                        ? globalDisabledReason ? globalDisabledReasonId : reasonId
                        : undefined}
                      aria-label={`${ownerLabels.ownerTaskAdopt} ${item.templateCode}`}
                      disabled={Boolean(disabledReason)}
                      onClick={() => dispatchCommandOnce(
                        pendingKey,
                        () => ownerWorkflow.onAdopt(item),
                      )}
                      style={{
                        ...commandButtonStyle,
                        width: "100%",
                        ...(disabledReason ? disabledButtonStyle : {}),
                      }}
                      title={disabledReason ?? `${ownerLabels.ownerTaskAdopt} ${item.templateCode}`}
                      type="button"
                    >
                      <Check aria-hidden="true" size={16} strokeWidth={2.4} />
                      {pending
                        ? `${ownerLabels.ownerTaskAdopting} ${item.templateCode}`
                        : `${ownerLabels.ownerTaskAdopt} ${item.templateCode}`}
                    </button>
                    {reason ? <p id={reasonId} style={bodyStyle}>{reason}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p style={emptyStateStyle}>{ownerLabels.ownerTaskPreviewEmpty}</p>
          )}
        </section>
      ) : null}

      <div aria-label={labels.filters} role="group" style={filterPanelStyle}>
        <div style={filterGridStyle}>
          <FilterGroup
            legend={labels.walletCompatibility}
            locale={locale}
            onToggle={toggleWalletFilter}
            options={taskTemplateWalletFilterOptions}
            selectedValues={filters.wallet}
          />
          <FilterGroup
            legend={labels.verification}
            locale={locale}
            onToggle={toggleVerificationFilter}
            options={taskTemplateVerificationFilterOptions}
            selectedValues={filters.verification}
          />
          <FilterGroup
            legend={labels.languageStatus}
            locale={locale}
            onToggle={toggleLanguageFilter}
            options={taskTemplateLanguageFilterOptions}
            selectedValues={filters.language}
          />
        </div>
        <div style={filterMetaStyle}>
          <p style={{ color: "#475569", fontSize: 13, fontWeight: 800, margin: 0 }}>
            {labels.filterResults(summary.visibleTemplates, summary.totalTemplates)}
          </p>
          {hasChangedFilters ? (
            <button
              onClick={() => setFilters(defaultTaskTemplateFilters)}
              style={secondaryButtonStyle}
              type="button"
            >
              {labels.clearFilters}
            </button>
          ) : null}
        </div>
      </div>

      {summary.isEmpty ? <p style={emptyStateStyle}>{labels.emptyState}</p> : null}
      <div style={gridStyle}>
        {filteredTemplates.map((template, index) => {
          const taskInput = taskInputForTemplate(template);
          const reason = globalDisabledReason ?? (!taskInput ? unsupportedPersistenceReason : null);
          const reasonId = `owner-task-template-reason-${index}`;
          const pending = taskInput
            ? ownerWorkflow.pendingTargetKey === createOwnerCampaignAddPendingTargetKey(taskInput)
            : false;
          const templateTitle = getLocalizedText(template.title, locale);

          return (
            <article key={template.id} style={cardStyle}>
              <div>
                <p style={labelStyle}>{template.category}</p>
                <h4 style={{ fontSize: 17, lineHeight: 1.25, margin: "4px 0" }}>
                  {templateTitle}
                </h4>
                <p style={{ color: "#475569", lineHeight: 1.45, margin: 0, overflowWrap: "anywhere" }}>
                  {getLocalizedText(template.description, locale)}
                </p>
              </div>
              <div style={metaGridStyle}>
                <div>
                  <p style={labelStyle}>{labels.verification}</p>
                  <p style={valueStyle}>{template.verificationType}</p>
                </div>
                <div>
                  <p style={labelStyle}>{labels.defaultPoints}</p>
                  <p style={valueStyle}>{template.defaultPoints}</p>
                </div>
                <div>
                  <p style={labelStyle}>{labels.risk}</p>
                  <p style={valueStyle}>{template.riskLevel}</p>
                </div>
                <div>
                  <p style={labelStyle}>{template.requiredByDefault ? labels.required : labels.optional}</p>
                  <p style={valueStyle}>{template.requiredByDefault ? labels.required : labels.optional}</p>
                </div>
              </div>
              <span style={badgeRowStyle}>
                <WalletCompatibilityBadge compatibility={template.walletCompatibility} />
                {Object.entries(template.localeReadiness).map(([readinessLocale, status]) => (
                  <LocaleStatusBadge
                    key={readinessLocale}
                    label={`${readinessLocale} ${status}`}
                    status={status}
                  />
                ))}
              </span>
              <button
                aria-describedby={reason
                  ? globalDisabledReason ? globalDisabledReasonId : reasonId
                  : undefined}
                aria-label={`${ownerLabels.ownerTaskAdd} ${templateTitle}`}
                disabled={Boolean(reason)}
                onClick={() => taskInput && dispatchCommandOnce(
                  createOwnerCampaignAddPendingTargetKey(taskInput),
                  () => ownerWorkflow.onAdd(taskInput),
                )}
                style={{
                  ...commandButtonStyle,
                  width: "100%",
                  ...(reason ? disabledButtonStyle : {}),
                }}
                title={reason ?? `${ownerLabels.ownerTaskAdd} ${templateTitle}`}
                type="button"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
                {pending
                  ? `${ownerLabels.ownerTaskAdding} ${templateTitle}`
                  : `${ownerLabels.ownerTaskAdd} ${templateTitle}`}
              </button>
              {!globalDisabledReason && !taskInput ? (
                <p id={reasonId} style={bodyStyle}>{unsupportedPersistenceReason}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};
