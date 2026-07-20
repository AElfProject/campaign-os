import { describe, expect, it } from "vitest";
import {
  TASK_TEMPLATE_CATALOG_ENABLED_ENV,
  TASK_TEMPLATE_CATALOG_FRONTEND_ENABLED_ENV,
  TaskTemplateCatalogConfigError,
  resolveTaskTemplateCatalogConfig,
} from "./taskTemplateCatalogConfig";

describe("task template catalog config", () => {
  it("is default-disabled with bounded public limits", () => {
    expect(resolveTaskTemplateCatalogConfig({ env: {} })).toEqual({
      enabled: false,
      limits: {
        defaultPageSize: 24,
        dependencyTimeoutMs: 2_000,
        maximumPageSize: 100,
        maximumResponseBytes: 262_144,
        shutdownTimeoutMs: 10_000,
      },
      mode: "demo",
      status: "disabled",
    });
  });

  it.each([
    [true, true],
    [false, false],
    ["1", true],
    ["0", false],
    ["true", true],
    ["false", false],
  ] as const)("parses the explicit enablement value %j", (value, enabled) => {
    expect(resolveTaskTemplateCatalogConfig({
      env: { [TASK_TEMPLATE_CATALOG_ENABLED_ENV]: value },
    })).toMatchObject({
      enabled,
      mode: enabled ? "durable" : "demo",
      status: enabled ? "ready" : "disabled",
    });
  });

  it.each(["", " true ", "TRUE", "yes", "2"])("rejects ambiguous enablement %j", (value) => {
    expect(() => resolveTaskTemplateCatalogConfig({
      env: { [TASK_TEMPLATE_CATALOG_ENABLED_ENV]: value },
    })).toThrow(TaskTemplateCatalogConfigError);
  });

  it("returns a safe typed error without exposing the raw value", () => {
    const raw = "do-not-echo-config-material";

    try {
      resolveTaskTemplateCatalogConfig({ env: { [TASK_TEMPLATE_CATALOG_ENABLED_ENV]: raw } });
      throw new Error("Expected config failure.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "TASK_TEMPLATE_CATALOG_ENABLEMENT_INVALID",
        field: TASK_TEMPLATE_CATALOG_ENABLED_ENV,
      });
      expect((error as Error).message).toBe("Task template catalog configuration is invalid.");
      expect(JSON.stringify(error)).not.toContain(raw);
      expect(String(error)).not.toContain(raw);
    }
  });

  it("publishes only stable server and frontend feature key names", () => {
    expect(TASK_TEMPLATE_CATALOG_ENABLED_ENV).toBe("CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED");
    expect(TASK_TEMPLATE_CATALOG_FRONTEND_ENABLED_ENV)
      .toBe("VITE_CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED");
  });
});
