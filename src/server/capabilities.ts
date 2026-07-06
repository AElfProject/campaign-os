import type { LocalizedText } from "../domain/types";
import type {
  ApiRuntimeCapability,
  ApiRuntimeCapabilityCatalog,
  ApiRuntimeCapabilityId,
  ApiRuntimeCapabilityStatus,
  ApiRuntimeServiceGroup,
  ApiRuntimeServiceGroupId,
} from "./contracts";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const capability = (item: ApiRuntimeCapability): ApiRuntimeCapability => item;
const serviceGroup = (group: ApiRuntimeServiceGroup): ApiRuntimeServiceGroup => group;

export const apiRuntimeCapabilities = [
  capability({
    category: "local_adapter",
    id: "local_api_runtime",
    requiredForProduction: true,
    riskLevel: "low",
    status: "ready",
    summary: text("Local HTTP runtime is available.", "本地 HTTP runtime 可用。"),
  }),
  capability({
    category: "local_adapter",
    id: "local_persistence_adapter",
    requiredForProduction: false,
    riskLevel: "low",
    status: "local_only",
    summary: text("Memory/local JSON persistence is available for review.", "memory/local JSON 持久化仅供评审使用。"),
  }),
  capability({
    category: "production_dependency",
    id: "production_database",
    requiredForProduction: true,
    riskLevel: "high",
    status: "deferred",
    summary: text("Production campaign databases are not configured.", "生产活动数据库尚未配置。"),
  }),
  capability({
    category: "production_dependency",
    id: "migration_runner",
    requiredForProduction: true,
    riskLevel: "high",
    status: "disabled",
    summary: text("Database migrations are not executed by this runtime.", "当前 runtime 不执行数据库 migration。"),
  }),
  capability({
    category: "production_dependency",
    id: "auth_session",
    requiredForProduction: true,
    riskLevel: "high",
    status: "deferred",
    summary: text("Wallet signature, session, and RBAC services are deferred.", "钱包签名、session 与 RBAC 服务延后实现。"),
  }),
  capability({
    category: "production_dependency",
    id: "provider_adapters",
    requiredForProduction: true,
    riskLevel: "high",
    status: "deferred",
    summary: text("Indexer, dApp, wallet, social, and AI provider adapters are deferred.", "Indexer、dApp、钱包、社交与 AI provider adapter 延后实现。"),
  }),
  capability({
    category: "production_dependency",
    id: "worker_queue",
    requiredForProduction: true,
    riskLevel: "medium",
    status: "deferred",
    summary: text("Background worker queue is not configured.", "后台 worker queue 尚未配置。"),
  }),
  capability({
    category: "production_dependency",
    id: "scheduler",
    requiredForProduction: true,
    riskLevel: "medium",
    status: "deferred",
    summary: text("Scheduler is not configured.", "scheduler 尚未配置。"),
  }),
  capability({
    category: "production_dependency",
    id: "contract_writer",
    requiredForProduction: true,
    riskLevel: "high",
    status: "disabled",
    summary: text("Contract write operations are disabled.", "合约写入操作已禁用。"),
  }),
  capability({
    category: "production_dependency",
    id: "object_storage_export",
    requiredForProduction: true,
    riskLevel: "high",
    status: "deferred",
    summary: text("Storage-backed exports and download URLs are deferred.", "storage-backed 导出与下载 URL 延后实现。"),
  }),
  capability({
    category: "production_dependency",
    id: "reward_custody",
    requiredForProduction: true,
    riskLevel: "high",
    status: "disabled",
    summary: text("Reward custody is disabled.", "奖励托管已禁用。"),
  }),
  capability({
    category: "production_dependency",
    id: "reward_distribution",
    requiredForProduction: true,
    riskLevel: "high",
    status: "disabled",
    summary: text("Reward distribution is disabled.", "发奖已禁用。"),
  }),
  capability({
    category: "safety_boundary",
    id: "sensitive_material_boundary",
    requiredForProduction: true,
    riskLevel: "high",
    status: "disabled",
    summary: text("The runtime does not handle private credentials or raw signatures.", "runtime 不处理私密凭据或原始签名。"),
  }),
] as const satisfies readonly ApiRuntimeCapability[];

export const apiRuntimeCapabilityById = Object.fromEntries(
  apiRuntimeCapabilities.map((item) => [item.id, item]),
) as Record<ApiRuntimeCapabilityId, ApiRuntimeCapability>;

export const createApiRuntimeCapabilityCatalog = (): ApiRuntimeCapabilityCatalog => {
  const countByStatus = (status: ApiRuntimeCapabilityStatus) =>
    apiRuntimeCapabilities.filter((item) => item.status === status).length;

  return {
    items: [...apiRuntimeCapabilities],
    summary: {
      blockedCount: countByStatus("blocked"),
      deferredCount: countByStatus("deferred"),
      disabledCount: countByStatus("disabled"),
      localOnlyCount: countByStatus("local_only"),
      readyCount: countByStatus("ready"),
      totalCapabilities: apiRuntimeCapabilities.length,
    },
  };
};

export const apiRuntimeServiceGroups = [
  serviceGroup({
    deferredDependencies: [],
    id: "runtime",
    label: text("Runtime", "Runtime"),
    readiness: "ready",
    summary: text("Local API runtime health and route contracts.", "本地 API runtime 健康状态与 route contract。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["provider_adapters"],
    id: "service_registry",
    label: text("Service Registry", "Service Registry"),
    readiness: "local_only",
    summary: text("External service readiness registry.", "外部服务 readiness registry。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["auth_session", "production_database"],
    id: "wallet_session",
    label: text("Wallet Session", "钱包 Session"),
    readiness: "local_only",
    summary: text("Normalized local wallet session boundary.", "本地归一化钱包 session 边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["production_database", "auth_session"],
    id: "campaign",
    label: text("Campaign", "活动"),
    readiness: "local_only",
    summary: text("Campaign draft and discovery boundary.", "活动草稿与发现边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["production_database", "provider_adapters"],
    id: "task",
    label: text("Task", "任务"),
    readiness: "local_only",
    summary: text("Task template and draft boundary.", "任务模板与草稿边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["provider_adapters", "worker_queue"],
    id: "verification",
    label: text("Verification", "验证"),
    readiness: "review_required",
    summary: text("Task verification review boundary.", "任务验证评审边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["production_database", "provider_adapters"],
    id: "eligibility",
    label: text("Eligibility", "资格"),
    readiness: "local_only",
    summary: text("Wallet-aware eligibility boundary.", "wallet-aware 资格边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["production_database"],
    id: "analytics",
    label: text("Analytics", "Analytics"),
    readiness: "ready",
    summary: text("Local analytics summary boundary.", "本地 analytics 汇总边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["production_database", "provider_adapters"],
    id: "i18n",
    label: text("i18n", "多语言"),
    readiness: "local_only",
    summary: text("Local i18n draft and review boundary.", "本地 i18n 草稿与评审边界。"),
    supportMode: "local_seeded",
  }),
  serviceGroup({
    deferredDependencies: ["object_storage_export", "contract_writer"],
    id: "export",
    label: text("Export", "导出"),
    readiness: "review_required",
    summary: text("Review-safe export preview boundary.", "评审安全的导出预览边界。"),
    supportMode: "local_seeded",
  }),
] as const satisfies readonly ApiRuntimeServiceGroup[];

export const apiRuntimeServiceGroupById = Object.fromEntries(
  apiRuntimeServiceGroups.map((group) => [group.id, group]),
) as Record<ApiRuntimeServiceGroupId, ApiRuntimeServiceGroup>;
