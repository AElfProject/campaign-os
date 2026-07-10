import { describe, expect, it } from "vitest";
import { ApiRuntimeError } from "./errors";
import {
  bodyRecord,
  exportContractRootMode,
  exportFormat,
  optionalAccountType,
  optionalLocale,
  optionalWalletSource,
  requiredAccountType,
  requiredRouteParam,
  requiredVerificationType,
  requiredWalletCompatibility,
  requiredWalletSource,
} from "./validation";

const expectInvalidRequest = (run: () => unknown, field: string) => {
  expect(run).toThrow(ApiRuntimeError);

  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiRuntimeError);

    if (error instanceof ApiRuntimeError) {
      expect(error.body).toMatchObject({
        code: "INVALID_REQUEST",
        details: {
          field,
        },
        status: 400,
      });
    }
  }
};

const expectRuntimeError = (run: () => unknown, code: string, details: Record<string, unknown>) => {
  expect(run).toThrow(ApiRuntimeError);

  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiRuntimeError);

    if (error instanceof ApiRuntimeError) {
      expect(error.body).toMatchObject({
        code,
        details,
        status: 400,
      });
    }
  }
};

describe("API runtime validation helpers", () => {
  it("validates JSON body and route parameters", () => {
    expect(bodyRecord(undefined)).toEqual({});
    expect(bodyRecord({ ok: true })).toEqual({ ok: true });
    expect(requiredRouteParam({ campaignId: "camp-1" }, "campaignId")).toBe("camp-1");

    expectInvalidRequest(() => bodyRecord([]), "body");
    expectInvalidRequest(() => requiredRouteParam({}, "campaignId"), "campaignId");
  });

  it("validates wallet and task enum boundaries", () => {
    expect(requiredAccountType({ accountType: "EOA" })).toBe("EOA");
    expect(optionalAccountType(undefined)).toBeUndefined();
    expect(optionalAccountType("AA")).toBe("AA");
    expect(requiredWalletSource({ walletSource: "PORTKEY_EOA_EXTENSION" })).toBe("PORTKEY_EOA_EXTENSION");
    expect(optionalWalletSource("NIGHTELF")).toBe("NIGHTELF");
    expect(requiredVerificationType({ verificationType: "ON_CHAIN" })).toBe("ON_CHAIN");
    expect(requiredWalletCompatibility({ walletCompatibility: "ANY" })).toBe("ANY");

    expectInvalidRequest(() => requiredAccountType({ accountType: "SMART" }), "accountType");
    expectInvalidRequest(() => requiredWalletSource({ walletSource: "RAW_PRIVATE_KEY" }), "walletSource");
    expectInvalidRequest(() => requiredVerificationType({ verificationType: "TOKEN" }), "verificationType");
    expectInvalidRequest(() => requiredWalletCompatibility({ walletCompatibility: "PORTKEY_ONLY" }), "walletCompatibility");
  });

  it("validates locale and export option boundaries", () => {
    expect(optionalLocale(undefined)).toBeUndefined();
    expect(optionalLocale("zh-CN")).toBe("zh-CN");
    expect(exportFormat(undefined)).toBe("csv");
    expect(exportFormat("json")).toBe("json");
    expect(exportContractRootMode(undefined)).toBe("none");
    expect(exportContractRootMode("none")).toBe("none");
    expect(exportContractRootMode("eligibility_root")).toBe("eligibility_root");

    expectRuntimeError(() => optionalLocale("fr-FR", "targetLocale"), "UNSUPPORTED_LOCALE", { locale: "fr-FR" });
    expectInvalidRequest(() => exportFormat("xml"), "format");
    expectRuntimeError(
      () => exportContractRootMode("winners_root"),
      "UNSUPPORTED_EXPORT_MODE",
      { mode: "winners_root" },
    );
    expectRuntimeError(
      () => exportContractRootMode("contract_claim"),
      "UNSUPPORTED_EXPORT_MODE",
      { mode: "contract_claim" },
    );
  });
});
