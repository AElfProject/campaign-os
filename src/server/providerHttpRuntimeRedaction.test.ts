import { describe, expect, it } from "vitest";
import {
  containsUnsafeProviderHttpRuntimeMaterial,
  isCredentialedProviderHttpUrl,
  providerHttpRuntimeRedactionPlaceholders,
  redactProviderHttpRuntimeValue,
} from "./providerHttpRuntimeRedaction";

describe("provider HTTP runtime redaction", () => {
  it("redacts nested provider HTTP credential, payload, wallet, lease, and idempotency material", () => {
    const redacted = redactProviderHttpRuntimeValue({
      apiKey: "api-key-live-123",
      authorization: "Bearer live-token-456",
      endpointUrl: "https://user:password@indexer.example/graphql?token=query-secret",
      idempotencyKey: "idem-token=secret-wallet",
      leaseToken: "lease-token=secret-worker",
      nested: {
        objectKey: "tenant/raw/object-key.csv",
        rawRequestBody: "{\"walletAddress\":\"ELF_SECRET\",\"providerPayload\":true}",
        rawResponseBody: "{\"score\":99,\"providerResponse\":true}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        walletAddress: "ELF_SECRET_WALLET",
      },
      stack: "Error: provider failed\n    at secret.ts:1:1",
      thrownError: new Error("provider token=secret payload={\"walletAddress\":\"ELF_SECRET\"}"),
    });

    expect(redacted).toEqual({
      apiKey: "[REDACTED:CREDENTIAL]",
      authorization: "[REDACTED:AUTHORIZATION]",
      endpointUrl: "[REDACTED:URL]",
      idempotencyKey: "[REDACTED:IDEMPOTENCY]",
      leaseToken: "[REDACTED:LEASE]",
      nested: {
        objectKey: "[REDACTED:OBJECT_KEY]",
        rawRequestBody: "[REDACTED:PAYLOAD]",
        rawResponseBody: "[REDACTED:PAYLOAD]",
        signedUrl: "[REDACTED:SIGNED_URL]",
        walletAddress: "[REDACTED:WALLET]",
      },
      stack: "[REDACTED:STACK]",
      thrownError: "[REDACTED:ERROR]",
    });
  });

  it("detects unsafe strings while preserving ordinary refs and ids", () => {
    expect(containsUnsafeProviderHttpRuntimeMaterial("trace-provider-http-1")).toBe(false);
    expect(containsUnsafeProviderHttpRuntimeMaterial("provider.endpoint.dapp_api.status.url")).toBe(
      false,
    );
    expect(containsUnsafeProviderHttpRuntimeMaterial("https://example.com/path")).toBe(false);
    expect(
      containsUnsafeProviderHttpRuntimeMaterial(
        "https://example.com/path?X-Amz-Signature=abc123",
      ),
    ).toBe(true);
    expect(containsUnsafeProviderHttpRuntimeMaterial("Bearer live-token")).toBe(true);
    expect(containsUnsafeProviderHttpRuntimeMaterial("lease-token=secret-worker")).toBe(true);
    expect(containsUnsafeProviderHttpRuntimeMaterial("idem-token=secret-wallet")).toBe(true);
    expect(containsUnsafeProviderHttpRuntimeMaterial("ELF_PRIVATE_WALLET")).toBe(true);
  });

  it("treats credentialed URLs and sensitive query params as unsafe", () => {
    expect(isCredentialedProviderHttpUrl("https://user:pass@indexer.example/graphql")).toBe(true);
    expect(isCredentialedProviderHttpUrl("https://indexer.example/graphql?token=secret")).toBe(
      true,
    );
    expect(isCredentialedProviderHttpUrl("https://indexer.example/graphql?cursor=next")).toBe(
      false,
    );
  });

  it("does not leak raw sensitive strings after redaction", () => {
    const raw = {
      body: "{\"walletAddress\":\"ELF_SECRET\",\"providerPayload\":true}",
      signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
      token: "Bearer provider-secret-token",
    };
    const serialized = JSON.stringify(redactProviderHttpRuntimeValue(raw));

    expect(serialized).toContain(providerHttpRuntimeRedactionPlaceholders.payload);
    expect(serialized).not.toContain("ELF_SECRET");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("provider-secret-token");
  });
});
