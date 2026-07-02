import type {
  ExternalServiceCategory,
  ExternalServiceFallback,
  ExternalServiceId,
  ExternalServiceLiveEvidenceStatus,
  ExternalServiceOwnerRole,
  ExternalServiceRegistryEntry,
  ExternalServiceReleaseImpact,
  ExternalServiceState,
  LocalizedText,
  RiskLevel,
  ServiceDegradationGovernance,
  ServiceDegradationGovernanceGroup,
  ServiceRegistry,
} from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const noLiveBoundary = text(
  "Seeded/local service governance only. No live SDK, provider API, wallet signature, backend persistence, AI provider, analytics SDK, export file, contract write, reward custody, or reward distribution is executed.",
  "仅 seeded/本地服务治理。不会执行实时 SDK、provider API、钱包签名、后端持久化、AI provider、analytics SDK、导出文件、合约写入、奖励托管或发奖。",
  "僅 seeded/本地服務治理。不會執行即時 SDK、provider API、錢包簽名、後端持久化、AI provider、analytics SDK、匯出檔案、合約寫入、獎勵託管或發獎。",
);

const categoryLabels: Record<ExternalServiceCategory, LocalizedText> = {
  ai: text("AI", "AI", "AI"),
  analytics: text("Analytics", "分析", "分析"),
  app_hub: text("App Hub", "App Hub", "App Hub"),
  contract: text("Contract", "合约", "合約"),
  dapp: text("dApp", "dApp", "dApp"),
  export: text("Export", "导出", "匯出"),
  forecast: text("Forecast", "Forecast", "Forecast"),
  payment: text("Payment", "支付", "支付"),
  portfolio: text("Portfolio", "Portfolio", "Portfolio"),
  social: text("Social", "社交", "社交"),
  unknown: text("Unknown", "未知", "未知"),
  verification: text("Verification", "验证", "驗證"),
  wallet: text("Wallet", "钱包", "錢包"),
};

const fallbackFor = (
  state: ExternalServiceState,
  serviceName: LocalizedText,
  blocksLaunch: boolean,
): ExternalServiceFallback => {
  const labels: Record<ExternalServiceState, LocalizedText> = {
    disabled: text("Disabled fallback", "已关闭 fallback", "已關閉 fallback"),
    enabled_preview: text("Seeded preview", "Seeded 预览", "Seeded 預覽"),
    maintenance: text("Maintenance fallback", "维护中 fallback", "維護中 fallback"),
    offline: text("Offline fallback", "已下线 fallback", "已下線 fallback"),
    review_required: text("Review fallback", "审核 fallback", "審核 fallback"),
  };
  const reasons: Record<ExternalServiceState, LocalizedText> = {
    disabled: text(
      `${serviceName["en-US"]} is disabled for live execution and remains available as local review context only.`,
      `${serviceName["zh-CN"]} 已关闭真实执行，仅作为本地审核上下文展示。`,
      `${serviceName["zh-TW"]} 已關閉真實執行，僅作為本地審核上下文展示。`,
    ),
    enabled_preview: text(
      `${serviceName["en-US"]} can be shown as seeded preview; live execution still requires separate approval.`,
      `${serviceName["zh-CN"]} 可作为 seeded 预览展示；真实执行仍需单独审批。`,
      `${serviceName["zh-TW"]} 可作為 seeded 預覽展示；真實執行仍需單獨審批。`,
    ),
    maintenance: text(
      `${serviceName["en-US"]} is in maintenance. Keep the main campaign flow visible with a fallback notice.`,
      `${serviceName["zh-CN"]} 维护中。保持活动主流程可见，并展示 fallback 提示。`,
      `${serviceName["zh-TW"]} 維護中。保持活動主流程可見，並展示 fallback 提示。`,
    ),
    offline: text(
      `${serviceName["en-US"]} is offline. Disable live actions and route users to review or retry later.`,
      `${serviceName["zh-CN"]} 已下线。禁用真实操作，并引导用户审核或稍后重试。`,
      `${serviceName["zh-TW"]} 已下線。禁用真實操作，並引導使用者審核或稍後重試。`,
    ),
    review_required: text(
      `${serviceName["en-US"]} requires human review before any live operation can be enabled.`,
      `${serviceName["zh-CN"]} 在启用任何真实操作前需要人工审核。`,
      `${serviceName["zh-TW"]} 在啟用任何真實操作前需要人工審核。`,
    ),
  };

  return { blocksLaunch, label: labels[state], reason: reasons[state] };
};

const serviceEntry = ({
  category,
  highImpact = false,
  id,
  liveEvidenceStatus = "missing",
  name,
  ownerRole,
  releaseImpact,
  riskLevel,
  state,
}: {
  category: ExternalServiceCategory;
  highImpact?: boolean;
  id: ExternalServiceId;
  liveEvidenceStatus?: ExternalServiceLiveEvidenceStatus;
  name: LocalizedText;
  ownerRole: ExternalServiceOwnerRole;
  releaseImpact: ExternalServiceReleaseImpact;
  riskLevel: RiskLevel;
  state: ExternalServiceState;
}): ExternalServiceRegistryEntry => {
  const blocksLaunch = releaseImpact === "release_blocker";

  return {
    boundary: noLiveBoundary,
    category,
    fallback: fallbackFor(state, name, blocksLaunch),
    featureGate: {
      enabled: state === "enabled_preview",
      key: `service.${id}.enabled`,
      label: text(
        `${name["en-US"]} feature gate`,
        `${name["zh-CN"]} 功能门禁`,
        `${name["zh-TW"]} 功能門禁`,
      ),
      reviewRequired: state === "review_required" || highImpact || releaseImpact === "release_blocker",
      state,
    },
    highImpact,
    id,
    liveEvidenceStatus,
    name,
    operatorNextAction: text(
      `Review ${name["en-US"].toLowerCase()} owner evidence before enabling live execution.`,
      `启用真实执行前，先审核 ${name["zh-CN"]} owner evidence。`,
      `啟用真實執行前，先審核 ${name["zh-TW"]} owner evidence。`,
    ),
    ownerRole,
    releaseImpact,
    riskLevel,
    state,
    userNotice: text(
      `${name["en-US"]} is governed by local service readiness and may degrade gracefully.`,
      `${name["zh-CN"]} 受本地服务 readiness 管控，可能优雅降级。`,
      `${name["zh-TW"]} 受本地服務 readiness 管控，可能優雅降級。`,
    ),
  };
};

export const externalServiceRegistryEntries: ExternalServiceRegistryEntry[] = [
  serviceEntry({
    category: "wallet",
    id: "wallet-connector",
    liveEvidenceStatus: "ready",
    name: text("Wallet connector", "钱包连接器", "錢包連接器"),
    ownerRole: "wallet_ops",
    releaseImpact: "ready",
    riskLevel: "medium",
    state: "enabled_preview",
  }),
  serviceEntry({
    category: "wallet",
    highImpact: true,
    id: "wallet-signing",
    name: text("Wallet signing", "钱包签名", "錢包簽名"),
    ownerRole: "wallet_ops",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "review_required",
  }),
  serviceEntry({
    category: "verification",
    id: "ebridge",
    liveEvidenceStatus: "ready",
    name: text("eBridge", "eBridge", "eBridge"),
    ownerRole: "integration_owner",
    releaseImpact: "ready",
    riskLevel: "medium",
    state: "enabled_preview",
  }),
  serviceEntry({
    category: "dapp",
    id: "awaken",
    name: text("Awaken", "Awaken", "Awaken"),
    ownerRole: "integration_owner",
    releaseImpact: "needs_review",
    riskLevel: "medium",
    state: "maintenance",
  }),
  serviceEntry({
    category: "verification",
    id: "aefinder",
    name: text("AeFinder", "AeFinder", "AeFinder"),
    ownerRole: "data_ops",
    releaseImpact: "needs_review",
    riskLevel: "medium",
    state: "review_required",
  }),
  serviceEntry({
    category: "verification",
    id: "aelfscan",
    liveEvidenceStatus: "blocked",
    name: text("AelfScan", "AelfScan", "AelfScan"),
    ownerRole: "data_ops",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "offline",
  }),
  serviceEntry({
    category: "social",
    id: "social-api",
    name: text("Social API", "社交 API", "社交 API"),
    ownerRole: "growth_ops",
    releaseImpact: "needs_review",
    riskLevel: "medium",
    state: "review_required",
  }),
  serviceEntry({
    category: "ai",
    id: "ai-provider",
    name: text("AI provider", "AI provider", "AI provider"),
    ownerRole: "product_owner",
    releaseImpact: "needs_review",
    riskLevel: "medium",
    state: "review_required",
  }),
  serviceEntry({
    category: "analytics",
    id: "analytics-collector",
    liveEvidenceStatus: "not_applicable",
    name: text("Analytics collector", "Analytics 采集器", "Analytics 採集器"),
    ownerRole: "data_ops",
    releaseImpact: "informational",
    riskLevel: "low",
    state: "disabled",
  }),
  serviceEntry({
    category: "export",
    highImpact: true,
    id: "export-storage",
    name: text("Export storage", "导出存储", "匯出儲存"),
    ownerRole: "risk_reviewer",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "review_required",
  }),
  serviceEntry({
    category: "contract",
    highImpact: true,
    id: "contract-root-writer",
    liveEvidenceStatus: "blocked",
    name: text("Contract root writer", "合约 root 写入器", "合約 root 寫入器"),
    ownerRole: "contract_reviewer",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "offline",
  }),
  serviceEntry({
    category: "app_hub",
    id: "telegram-app-hub",
    name: text("Telegram / App Hub", "Telegram / App Hub", "Telegram / App Hub"),
    ownerRole: "product_owner",
    releaseImpact: "needs_review",
    riskLevel: "medium",
    state: "maintenance",
  }),
  serviceEntry({
    category: "payment",
    highImpact: true,
    id: "pay",
    name: text("Pay", "Pay", "Pay"),
    ownerRole: "risk_reviewer",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "disabled",
  }),
  serviceEntry({
    category: "forecast",
    id: "forecast",
    liveEvidenceStatus: "ready",
    name: text("Forecast", "Forecast", "Forecast"),
    ownerRole: "product_owner",
    releaseImpact: "ready",
    riskLevel: "low",
    state: "enabled_preview",
  }),
  serviceEntry({
    category: "portfolio",
    id: "portfolio",
    liveEvidenceStatus: "ready",
    name: text("Portfolio", "Portfolio", "Portfolio"),
    ownerRole: "product_owner",
    releaseImpact: "ready",
    riskLevel: "low",
    state: "enabled_preview",
  }),
];

const unknownEntry = (id: string): ExternalServiceRegistryEntry =>
  ({
    ...serviceEntry({
    category: "unknown",
    highImpact: true,
    id,
    liveEvidenceStatus: "blocked",
    name: text(`Unknown service: ${id}`, `未知服务：${id}`, `未知服務：${id}`),
    ownerRole: "risk_reviewer",
    releaseImpact: "release_blocker",
    riskLevel: "high",
    state: "disabled",
    }),
    fallback: {
      blocksLaunch: true,
      label: text("Unregistered service", "未登记服务", "未登記服務"),
      reason: text(
        `Service ${id} is not registered in the Campaign OS service registry and is fail-closed until an owner adds review evidence.`,
        `服务 ${id} 未登记在 Campaign OS service registry 中；在 owner 添加审核 evidence 前保持 fail-closed。`,
        `服務 ${id} 未登記在 Campaign OS service registry 中；在 owner 新增審核 evidence 前保持 fail-closed。`,
      ),
    },
  });

const isHighImpactBlocked = (entry: ExternalServiceRegistryEntry) =>
  entry.highImpact && entry.liveEvidenceStatus !== "ready";

export const createServiceRegistry = (
  entries: ExternalServiceRegistryEntry[] = externalServiceRegistryEntries,
): ServiceRegistry => ({
  entries: [...entries],
  entriesById: Object.fromEntries(entries.map((entry) => [entry.id, entry])),
  unknownFallback: unknownEntry("unknown-service"),
});

export const getExternalService = (
  registry: ServiceRegistry,
  id: string,
): ExternalServiceRegistryEntry => registry.entriesById[id] ?? unknownEntry(id);

export const isServiceEnabled = (registry: ServiceRegistry, id: string) => {
  const entry = getExternalService(registry, id);

  return entry.state === "enabled_preview" && !isHighImpactBlocked(entry);
};

export const requiresServiceReview = (registry: ServiceRegistry, id: string) => {
  const entry = getExternalService(registry, id);

  return (
    entry.state === "review_required" ||
    entry.state === "maintenance" ||
    entry.state === "offline" ||
    entry.releaseImpact === "release_blocker" ||
    isHighImpactBlocked(entry) ||
    !registry.entriesById[id]
  );
};

export const getServiceFallback = (
  registry: ServiceRegistry,
  id: string,
): ExternalServiceFallback => getExternalService(registry, id).fallback;

const stateCount = (entries: ExternalServiceRegistryEntry[], state: ExternalServiceState) =>
  entries.filter((entry) => entry.state === state).length;

const releaseImpactWeight: Record<ExternalServiceReleaseImpact, number> = {
  release_blocker: 0,
  needs_review: 1,
  ready: 2,
  informational: 3,
};

const stateWeight: Record<ExternalServiceState, number> = {
  offline: 0,
  review_required: 1,
  maintenance: 2,
  disabled: 3,
  enabled_preview: 4,
};

const riskWeight: Record<RiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const sortByPriority = (entries: ExternalServiceRegistryEntry[]) =>
  [...entries].sort((left, right) => {
    const release = releaseImpactWeight[left.releaseImpact] - releaseImpactWeight[right.releaseImpact];

    if (release !== 0) return release;

    const impact = Number(right.highImpact) - Number(left.highImpact);

    if (impact !== 0) return impact;

    const state = stateWeight[left.state] - stateWeight[right.state];

    if (state !== 0) return state;

    return riskWeight[left.riskLevel] - riskWeight[right.riskLevel];
  });

const groupByCategory = (
  entries: ExternalServiceRegistryEntry[],
): ServiceDegradationGovernanceGroup[] =>
  Array.from(new Set(entries.map((entry) => entry.category))).map((category) => ({
    category,
    entries: entries.filter((entry) => entry.category === category),
    label: categoryLabels[category],
  }));

export const createServiceDegradationGovernance = (
  entries: ExternalServiceRegistryEntry[] = externalServiceRegistryEntries,
): ServiceDegradationGovernance => {
  const registry = createServiceRegistry(entries);
  const blockers = sortByPriority(
    entries.filter((entry) => entry.releaseImpact === "release_blocker" || isHighImpactBlocked(entry)),
  );
  const needsReview = sortByPriority(
    entries.filter((entry) => requiresServiceReview(registry, entry.id)),
  );
  const maintenanceOrOffline = entries.filter(
    (entry) => entry.state === "maintenance" || entry.state === "offline",
  );
  const top = blockers[0] ?? needsReview[0] ?? entries[0];

  return {
    blockers,
    boundary: noLiveBoundary,
    entries: [...entries],
    groups: groupByCategory(entries),
    maintenanceOrOffline,
    needsReview,
    summary: {
      disabledServices: stateCount(entries, "disabled"),
      enabledPreviewServices: stateCount(entries, "enabled_preview"),
      highImpactBlockers: entries.filter(isHighImpactBlocked).length,
      maintenanceServices: stateCount(entries, "maintenance"),
      offlineServices: stateCount(entries, "offline"),
      releaseBlockers: blockers.length,
      reviewRequiredServices: stateCount(entries, "review_required"),
      topServiceId: top?.id ?? "unknown-service",
      totalServices: entries.length,
    },
    topOwnerAction:
      top?.operatorNextAction ??
      text("Review service registry before launch.", "上线前审核服务 registry。", "上線前審核服務 registry。"),
  };
};
