import { describe, expect, it } from "vitest";
import type { VerificationType } from "../domain/types";
import {
  allowedVerificationDegradationOutcomes,
  createVerificationSourceHandoff,
  resolveVerificationSourceHandoff,
  verificationSourcePolicies,
} from "./verificationSourceHandoff";

const verificationTypes: VerificationType[] = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"];

describe("verification source handoff", () => {
  it("maps every v0.2 verification type to safe evidence sources and provider groups", () => {
    expect(verificationSourcePolicies.map((policy) => policy.verificationType)).toEqual(verificationTypes);

    const handoff = createVerificationSourceHandoff();

    expect(handoff.valid).toBe(true);
    expect(handoff.entries.map((entry) => entry.verificationType)).toEqual(verificationTypes);
    expect(handoff.entries.map((entry) => entry.providerGroupIds)).toEqual([
      ["wallet-auth-session"],
      ["aefinder-aelfscan-indexers"],
      ["dapp-api-adapters"],
      ["social-api-adapters"],
      ["manual-review"],
    ]);
    expect(handoff.entries.every((entry) => entry.liveExecutionEnabled === false)).toBe(true);
    expect(handoff.entries.every((entry) => entry.evidenceSourceLabels.length > 0)).toBe(true);
    expect(handoff.entries.every((entry) => entry.diagnosticNotes.length > 0)).toBe(true);
  });

  it("declares deterministic degradation outcomes that never complete provider-backed tasks", () => {
    expect(allowedVerificationDegradationOutcomes).toEqual([
      "pending",
      "manual_review",
      "disable_provider_task_templates",
      "local_only",
      "blocked",
    ]);

    const degradationByType = Object.fromEntries(
      createVerificationSourceHandoff().entries.map((entry) => [
        entry.verificationType,
        entry.defaultDegradationOutcome,
      ]),
    );

    expect(degradationByType).toEqual({
      WALLET: "local_only",
      ON_CHAIN: "pending",
      DAPP_API: "disable_provider_task_templates",
      SOCIAL: "manual_review",
      MANUAL: "manual_review",
    });
    expect(Object.values(degradationByType)).not.toContain("completed");
  });

  it("preserves wallet auth/session separation from provider readiness", () => {
    const wallet = resolveVerificationSourceHandoff("WALLET");

    expect(wallet.valid).toBe(true);
    expect(wallet.entry).toMatchObject({
      authSessionRequired: true,
      liveExecutionEnabled: false,
      providerReadinessSatisfiesAuthentication: false,
      verificationType: "WALLET",
      workerRequired: false,
    });
    expect(wallet.entry?.evidenceSourceLabels).toEqual(["Auth/session wallet proof"]);
    expect(wallet.entry?.providerGroupIds).toEqual(["wallet-auth-session"]);
    expect(wallet.entry?.diagnosticNotes.join(" ")).toContain("auth/session");
    expect(wallet.entry?.diagnosticNotes.join(" ")).not.toContain("provider readiness authenticates");
  });

  it("marks provider-backed unavailable states as blocked, pending, or review only", () => {
    const providerBackedTypes: VerificationType[] = ["ON_CHAIN", "DAPP_API", "SOCIAL"];

    for (const verificationType of providerBackedTypes) {
      const handoff = resolveVerificationSourceHandoff(verificationType, {
        providerGroupAvailability: "unavailable",
      });

      expect(handoff.valid).toBe(false);
      expect(handoff.degradationOutcome).not.toBe("completed");
      expect(["pending", "manual_review", "disable_provider_task_templates", "blocked"]).toContain(
        handoff.degradationOutcome,
      );
      expect(handoff.diagnosticCodes).toContain("PROVIDER_GROUP_UNAVAILABLE");
    }
  });

  it("fails closed for unknown verification types, provider groups, and evidence sources", () => {
    const unknownType = resolveVerificationSourceHandoff("TOKEN_DROP");
    const unknownGroup = resolveVerificationSourceHandoff("ON_CHAIN", {
      providerGroupIds: ["unknown-indexer"],
    });
    const unsupportedEvidence = resolveVerificationSourceHandoff("SOCIAL", {
      evidenceSourceLabels: ["Raw bearer social payload"],
    });

    expect(unknownType).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["UNKNOWN_VERIFICATION_TYPE"],
      entry: undefined,
      valid: false,
    });
    expect(unknownGroup).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["UNKNOWN_PROVIDER_GROUP"],
      valid: false,
    });
    expect(unsupportedEvidence).toMatchObject({
      degradationOutcome: "blocked",
      diagnosticCodes: ["UNSUPPORTED_EVIDENCE_SOURCE"],
      valid: false,
    });
  });

  it("serializes safe diagnostic notes without leaking secret-like fragments", () => {
    const handoff = createVerificationSourceHandoff({
      diagnosticNotes: [
        "api-key-live-123",
        "Bearer social-token-456",
        "https://indexer.example/graphql?token=query-secret",
        "{\"address\":\"ELF_raw_wallet\",\"score\":99}",
      ],
    });
    const serialized = JSON.stringify(handoff);

    expect(serialized).not.toContain("api-key-live-123");
    expect(serialized).not.toContain("social-token-456");
    expect(serialized).not.toContain("query-secret");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
