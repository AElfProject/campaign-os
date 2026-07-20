export const TASK_TEMPLATE_CATALOG_ENABLED_ENV = "CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED" as const;
export const TASK_TEMPLATE_CATALOG_FRONTEND_ENABLED_ENV = "VITE_CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED" as const;

export type TaskTemplateCatalogConfigErrorCode =
  | "TASK_TEMPLATE_CATALOG_ENABLEMENT_INVALID";

export class TaskTemplateCatalogConfigError extends Error {
  readonly code: TaskTemplateCatalogConfigErrorCode;
  readonly field: string;

  constructor(code: TaskTemplateCatalogConfigErrorCode, field: string) {
    super("Task template catalog configuration is invalid.");
    this.name = "TaskTemplateCatalogConfigError";
    this.code = code;
    this.field = field;
  }
}

export interface TaskTemplateCatalogConfig {
  readonly enabled: boolean;
  readonly limits: Readonly<{
    defaultPageSize: 24;
    dependencyTimeoutMs: 2_000;
    maximumPageSize: 100;
    maximumResponseBytes: 262_144;
    shutdownTimeoutMs: 10_000;
  }>;
  readonly mode: "demo" | "durable";
  readonly status: "disabled" | "ready";
}

export interface ResolveTaskTemplateCatalogConfigOptions {
  readonly env: Readonly<Record<string, boolean | string | undefined>>;
}

const limits = Object.freeze({
  defaultPageSize: 24,
  dependencyTimeoutMs: 2_000,
  maximumPageSize: 100,
  maximumResponseBytes: 262_144,
  shutdownTimeoutMs: 10_000,
} as const);

const resolveEnabled = (value: boolean | string | undefined): boolean => {
  if (value === undefined || value === false || value === "0" || value === "false") {
    return false;
  }
  if (value === true || value === "1" || value === "true") {
    return true;
  }

  throw new TaskTemplateCatalogConfigError(
    "TASK_TEMPLATE_CATALOG_ENABLEMENT_INVALID",
    TASK_TEMPLATE_CATALOG_ENABLED_ENV,
  );
};

export const resolveTaskTemplateCatalogConfig = ({
  env,
}: ResolveTaskTemplateCatalogConfigOptions): TaskTemplateCatalogConfig => {
  const enabled = resolveEnabled(env[TASK_TEMPLATE_CATALOG_ENABLED_ENV]);

  return Object.freeze({
    enabled,
    limits,
    mode: enabled ? "durable" : "demo",
    status: enabled ? "ready" : "disabled",
  });
};
