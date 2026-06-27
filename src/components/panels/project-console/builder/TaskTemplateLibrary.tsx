import { useMemo, useState, type CSSProperties } from "react";
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
  type TaskTemplateFilterOption,
  type TaskTemplateFilterState,
  type TaskTemplate,
} from "../../../../domain";
import { LocaleStatusBadge, WalletCompatibilityBadge } from "../../../badges/Badges";

interface TaskTemplateLibraryProps {
  locale: SupportedLocale;
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
} satisfies Record<SupportedLocale, TaskTemplateLibraryCopy>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
};

const filterPanelStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  padding: 12,
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
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
};

const resetButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #b8c7da",
  borderRadius: 6,
  color: "#0f172a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0,
  minHeight: 34,
  padding: "6px 10px",
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
  padding: 16,
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
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const isSameFilterState = (left: TaskTemplateFilterState, right: TaskTemplateFilterState) =>
  left.wallet.length === right.wallet.length &&
  left.verification.length === right.verification.length &&
  left.language.length === right.language.length &&
  left.wallet.every((value, index) => value === right.wallet[index]) &&
  left.verification.every((value, index) => value === right.verification[index]) &&
  left.language.every((value, index) => value === right.language[index]);

const toggleFilterValue = <TValue extends string>(
  currentValues: readonly TValue[],
  nextValue: TValue,
) =>
  currentValues.includes(nextValue)
    ? currentValues.filter((value) => value !== nextValue)
    : [...currentValues, nextValue];

interface FilterGroupProps<TValue extends string> {
  legend: string;
  options: readonly TaskTemplateFilterOption<TValue>[];
  selectedValues: readonly TValue[];
  locale: SupportedLocale;
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

export const TaskTemplateLibrary = ({
  locale,
  templates = taskTemplateLibrary,
}: TaskTemplateLibraryProps) => {
  const labels = copy[locale];
  const [filters, setFilters] = useState<TaskTemplateFilterState>(defaultTaskTemplateFilters);
  const filteredTemplates = useMemo(() => filterTaskTemplates(templates, filters), [filters, templates]);
  const summary = createTaskTemplateFilterSummary(templates, filteredTemplates, filters);
  const hasChangedFilters = !isSameFilterState(filters, defaultTaskTemplateFilters);

  const updateFilterGroup = <TKey extends keyof TaskTemplateFilterState>(
    key: TKey,
    value: TaskTemplateFilterState[TKey][number],
  ) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: toggleFilterValue(currentFilters[key], value),
    }));
  };

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
      <div aria-label={labels.filters} role="group" style={filterPanelStyle}>
        <div style={filterGridStyle}>
          <FilterGroup
            legend={labels.walletCompatibility}
            locale={locale}
            onToggle={(value) => updateFilterGroup("wallet", value)}
            options={taskTemplateWalletFilterOptions}
            selectedValues={filters.wallet}
          />
          <FilterGroup
            legend={labels.verification}
            locale={locale}
            onToggle={(value) => updateFilterGroup("verification", value)}
            options={taskTemplateVerificationFilterOptions}
            selectedValues={filters.verification}
          />
          <FilterGroup
            legend={labels.languageStatus}
            locale={locale}
            onToggle={(value) => updateFilterGroup("language", value)}
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
              style={resetButtonStyle}
              type="button"
            >
              {labels.clearFilters}
            </button>
          ) : null}
        </div>
      </div>
      {summary.isEmpty ? <p style={emptyStateStyle}>{labels.emptyState}</p> : null}
      <div style={gridStyle}>
        {filteredTemplates.map((template) => (
          <article key={template.id} style={cardStyle}>
            <div>
              <p style={labelStyle}>{template.category}</p>
              <h4 style={{ fontSize: 17, lineHeight: 1.25, margin: "4px 0" }}>
                {getLocalizedText(template.title, locale)}
              </h4>
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
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
              <LocaleStatusBadge
                label={`en-US ${template.localeReadiness["en-US"]}`}
                status={template.localeReadiness["en-US"]}
              />
              <LocaleStatusBadge
                label={`zh-CN ${template.localeReadiness["zh-CN"]}`}
                status={template.localeReadiness["zh-CN"]}
              />
            </span>
          </article>
        ))}
      </div>
    </section>
  );
};
