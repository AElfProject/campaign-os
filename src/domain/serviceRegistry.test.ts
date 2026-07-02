import { describe, expect, it } from "vitest";
import {
  createServiceDegradationGovernance,
  createServiceRegistry,
  externalServiceRegistryEntries,
  getExternalService,
  getServiceFallback,
  isServiceEnabled,
  requiresServiceReview,
} from "./index";

const localizedFields = ["en-US", "zh-CN", "zh-TW"] as const;

const expectLocalized = (value: Record<(typeof localizedFields)[number], string>) => {
  for (const locale of localizedFields) {
    expect(value[locale]?.trim().length).toBeGreaterThan(0);
  }
};

describe("service registry degradation governance", () => {
  it("registers the required external dependency coverage in stable order", () => {
    const registry = createServiceRegistry();

    expect(registry.entries.map((entry) => entry.id)).toEqual([
      "wallet-connector",
      "wallet-signing",
      "ebridge",
      "awaken",
      "aefinder",
      "aelfscan",
      "social-api",
      "ai-provider",
      "analytics-collector",
      "export-storage",
      "contract-root-writer",
      "telegram-app-hub",
      "pay",
      "forecast",
      "portfolio",
    ]);
    expect(registry.entries).toHaveLength(externalServiceRegistryEntries.length);
    expect(new Set(registry.entries.map((entry) => entry.id)).size).toBe(registry.entries.length);
  });

  it("derives deterministic governance counts and owner action from service entries", () => {
    const governance = createServiceDegradationGovernance();
    const repeated = createServiceDegradationGovernance();

    expect(governance).toEqual(repeated);
    expect(governance.summary).toMatchObject({
      totalServices: 15,
      enabledPreviewServices: 4,
      disabledServices: 2,
      maintenanceServices: 2,
      reviewRequiredServices: 5,
      offlineServices: 2,
      releaseBlockers: 5,
      highImpactBlockers: 4,
    });
    expect(
      governance.summary.enabledPreviewServices +
        governance.summary.disabledServices +
        governance.summary.maintenanceServices +
        governance.summary.reviewRequiredServices +
        governance.summary.offlineServices,
    ).toBe(governance.summary.totalServices);
    expect(governance.topOwnerAction["en-US"]).toContain("wallet signing");
    expect(governance.blockers[0]?.id).toBe("wallet-signing");
  });

  it("keeps helper semantics fail-closed for review, maintenance, offline, and unknown services", () => {
    const registry = createServiceRegistry();

    expect(isServiceEnabled(registry, "wallet-connector")).toBe(true);
    expect(isServiceEnabled(registry, "wallet-signing")).toBe(false);
    expect(isServiceEnabled(registry, "awaken")).toBe(false);
    expect(isServiceEnabled(registry, "aelfscan")).toBe(false);
    expect(isServiceEnabled(registry, "unregistered-provider")).toBe(false);

    expect(requiresServiceReview(registry, "wallet-connector")).toBe(false);
    expect(requiresServiceReview(registry, "wallet-signing")).toBe(true);
    expect(requiresServiceReview(registry, "awaken")).toBe(true);
    expect(requiresServiceReview(registry, "aelfscan")).toBe(true);
    expect(requiresServiceReview(registry, "unregistered-provider")).toBe(true);

    expect(getExternalService(registry, "unregistered-provider")).toMatchObject({
      id: "unregistered-provider",
      state: "disabled",
      releaseImpact: "release_blocker",
      highImpact: true,
    });
    expect(getServiceFallback(registry, "unregistered-provider").reason["en-US"]).toContain(
      "not registered",
    );
  });

  it("requires review for high-impact services without live evidence", () => {
    const registry = createServiceRegistry();

    for (const serviceId of ["wallet-signing", "export-storage", "contract-root-writer"]) {
      const service = getExternalService(registry, serviceId);

      expect(service.highImpact).toBe(true);
      expect(service.liveEvidenceStatus).not.toBe("ready");
      expect(isServiceEnabled(registry, serviceId)).toBe(false);
      expect(requiresServiceReview(registry, serviceId)).toBe(true);
    }
  });

  it("keeps every visible service field localized and free of sensitive live output", () => {
    const governance = createServiceDegradationGovernance();

    for (const entry of governance.entries) {
      expectLocalized(entry.name);
      expectLocalized(entry.featureGate.label);
      expectLocalized(entry.fallback.label);
      expectLocalized(entry.fallback.reason);
      expectLocalized(entry.userNotice);
      expectLocalized(entry.operatorNextAction);
      expectLocalized(entry.boundary);
    }
    for (const group of governance.groups) {
      expectLocalized(group.label);
      expect(group.entries.length).toBeGreaterThan(0);
    }
    expectLocalized(governance.boundary);
    expectLocalized(governance.topOwnerAction);

    const serialized = JSON.stringify(governance).toLowerCase();

    for (const unsafe of [
      "privatekey",
      "private key",
      "seedphrase",
      "seed phrase",
      "oauthtoken",
      "telegramtoken",
      "signaturepayload",
      "contractroot",
      "transactionid",
      "downloadurl",
      "fileurl",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });
});
