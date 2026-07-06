import { describe, expect, it } from "vitest";
import {
  createApiErrorEnvelope,
  createApiSuccessEnvelope,
} from "./apiEnvelope";

const forbiddenFragments = [
  "apikey",
  "bearer",
  "mnemonic",
  "objectkey",
  "oauth",
  "privatekey",
  "seedphrase",
  "signature",
  "signedurl",
];

const flattenKeys = (value: unknown, keys: string[] = []): string[] => {
  if (value === null || typeof value !== "object") {
    return keys;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      flattenKeys(item, keys);
    }

    return keys;
  }

  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase());
    flattenKeys(nested, keys);
  }

  return keys;
};

describe("API foundation envelopes", () => {
  it("creates traceable success envelopes without mutating payloads", () => {
    const payload = {
      campaignId: "camp_local",
      status: "draft",
    };

    const envelope = createApiSuccessEnvelope({
      payload,
      routeId: "campaigns.create",
      serviceId: "campaign-service",
      supportMode: "local_seeded",
      timestamp: "2026-07-06T13:40:00.000Z",
      traceId: "trace-success",
    });

    expect(envelope).toEqual({
      ok: true,
      payload,
      routeId: "campaigns.create",
      serviceId: "campaign-service",
      supportMode: "local_seeded",
      timestamp: "2026-07-06T13:40:00.000Z",
      traceId: "trace-success",
    });
    expect(envelope.payload).toBe(payload);
  });

  it("creates normalized validation error envelopes", () => {
    const envelope = createApiErrorEnvelope({
      category: "validation",
      diagnostics: [
        {
          field: "body.projectId",
          message: "projectId is required.",
        },
      ],
      message: "The request does not match the API contract.",
      routeId: "campaigns.create",
      serviceId: "campaign-service",
      supportMode: "local_seeded",
      timestamp: "2026-07-06T13:41:00.000Z",
      traceId: "trace-validation",
    });

    expect(envelope).toEqual({
      category: "validation",
      code: "API_VALIDATION_ERROR",
      diagnostics: [
        {
          code: "DIAGNOSTIC",
          field: "body.projectId",
          message: "projectId is required.",
        },
      ],
      message: "The request does not match the API contract.",
      ok: false,
      routeId: "campaigns.create",
      serviceId: "campaign-service",
      supportMode: "local_seeded",
      timestamp: "2026-07-06T13:41:00.000Z",
      traceId: "trace-validation",
    });
  });

  it("supports stable error categories and custom codes", () => {
    const cases = [
      ["missing_resource", "API_MISSING_RESOURCE"],
      ["unsupported_mode", "API_UNSUPPORTED_MODE"],
      ["unexpected", "API_UNEXPECTED_ERROR"],
    ] as const;

    for (const [category, expectedCode] of cases) {
      expect(
        createApiErrorEnvelope({
          category,
          message: "Example failure.",
          routeId: "runtime.contracts",
          serviceId: "runtime-observability",
          supportMode: "local_seeded",
          traceId: `trace-${category}`,
        }),
      ).toMatchObject({
        category,
        code: expectedCode,
        ok: false,
      });
    }

    expect(
      createApiErrorEnvelope({
        category: "unsupported_mode",
        code: "CONTRACT_CLAIM_REQUIRES_REVIEW",
        message: "Contract claim mode requires admin review.",
        routeId: "campaigns.export.preview",
        serviceId: "export-service",
        supportMode: "local_seeded",
        traceId: "trace-custom-code",
      }),
    ).toMatchObject({
      code: "CONTRACT_CLAIM_REQUIRES_REVIEW",
    });
  });

  it("normalizes incomplete diagnostics into stable objects", () => {
    const envelope = createApiErrorEnvelope({
      category: "unexpected",
      diagnostics: [
        {},
        {
          code: "EMPTY_MESSAGE",
          field: "",
          message: "",
        },
      ],
      message: "Unexpected failure.",
      routeId: "runtime.health",
      serviceId: "runtime-observability",
      supportMode: "local_seeded",
      traceId: "trace-diagnostics",
    });

    expect(envelope.diagnostics).toEqual([
      {
        code: "DIAGNOSTIC",
        field: "diagnostics[0]",
        message: "No diagnostic message provided.",
      },
      {
        code: "EMPTY_MESSAGE",
        field: "diagnostics[1]",
        message: "No diagnostic message provided.",
      },
    ]);
  });

  it("does not expose sensitive metadata keys in representative output", () => {
    const success = createApiSuccessEnvelope({
      payload: {
        campaignId: "camp_safe",
        walletSource: "PORTKEY_AA",
      },
      routeId: "wallet.session.create",
      serviceId: "wallet-session-service",
      supportMode: "local_seeded",
      traceId: "trace-safe-success",
    });
    const failure = createApiErrorEnvelope({
      category: "validation",
      diagnostics: [
        {
          code: "MISSING_FIELD",
          field: "body.address",
          message: "Address is required.",
        },
      ],
      message: "Request validation failed.",
      routeId: "wallet.session.create",
      serviceId: "wallet-session-service",
      supportMode: "local_seeded",
      traceId: "trace-safe-error",
    });
    const keys = flattenKeys({ failure, success });

    for (const fragment of forbiddenFragments) {
      expect(keys.join(" ")).not.toContain(fragment);
    }
  });
});
