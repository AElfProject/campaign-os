// @vitest-environment node

import { createHash, randomBytes } from "node:crypto";
import {
  createServer,
  type AddressInfo,
  type Server,
  type Socket,
} from "node:net";
import AElf from "aelf-sdk";
import { describe, expect, it, vi } from "vitest";
import type { PortkeyCaRelationRequest } from "./walletAuthentication";
import type {
  WalletAuthenticationEnvironment,
  WalletCaRelationProviderConfig,
} from "./walletAuthenticationConfig";
import {
  PORTKEY_CA_RELATION_RESPONSE_VERSION,
  PortkeyCaRelationProviderConfigurationError,
  createNodePortkeyCaRelationTransport,
  createPortkeyCaRelationEndpointResolver,
  createPortkeyCaRelationProvider,
  resolvePortkeyCaRelationProviderAuthority,
  type PortkeyCaRelationDnsAddress,
  type PortkeyCaRelationDnsResolver,
  type PortkeyCaRelationEndpointResolver,
  type PortkeyCaRelationTransport,
} from "./portkeyCaRelationProvider";

const NOW = new Date("2026-07-18T06:00:00.000Z");

const ephemeralAddress = (): string => {
  const keyPair = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  return AElf.wallet.getAddressFromPubKey(keyPair.getPublic());
};

const facts = () => ({
  blockHeight: 12_345,
  caAddress: ephemeralAddress(),
  caHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
  chainId: "AELF" as const,
  managerAddress: ephemeralAddress(),
  observedAt: NOW.toISOString(),
  relationRevision: `revision-${randomBytes(8).toString("hex")}`,
  relationVersion: 7,
});

const config = (
  overrides: Partial<WalletCaRelationProviderConfig> = {},
): WalletCaRelationProviderConfig => ({
  enabled: true,
  endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
  id: "stage-portkey-ca",
  productionApproved: false,
  timeoutMs: 100,
  ...overrides,
});

const request = (
  value: ReturnType<typeof facts>,
  overrides: Partial<PortkeyCaRelationRequest> = {},
): PortkeyCaRelationRequest => ({
  caAddressHint: value.caAddress,
  caHash: value.caHash,
  chainId: value.chainId,
  managerAddress: value.managerAddress,
  traceId: "trace-ca-provider-1",
  ...overrides,
});

const currentBody = (
  value: ReturnType<typeof facts>,
  overrides: Record<string, unknown> = {},
) => ({
  blockHeight: value.blockHeight,
  caAddress: value.caAddress,
  caHash: value.caHash,
  chainId: value.chainId,
  managerAddress: value.managerAddress,
  observedAt: value.observedAt,
  relationRevision: value.relationRevision,
  relationVersion: value.relationVersion,
  status: "current",
  version: PORTKEY_CA_RELATION_RESPONSE_VERSION,
  ...overrides,
});

const jsonResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response => new Response(JSON.stringify(body), {
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
  status,
});

const provider = ({
  approvedProductionHosts,
  body,
  dnsAddresses = [{ address: "93.184.216.34", family: 4 }],
  endpoint = "http://127.0.0.1:5195/relation",
  environment = "stage",
  transportImplementation,
  providerConfig = config(),
}: {
  approvedProductionHosts?: readonly string[];
  body?: unknown;
  dnsAddresses?: readonly PortkeyCaRelationDnsAddress[];
  endpoint?: string;
  environment?: WalletAuthenticationEnvironment;
  transportImplementation?: PortkeyCaRelationTransport["execute"];
  providerConfig?: WalletCaRelationProviderConfig;
} = {}) => {
  const execute = transportImplementation
    ?? vi.fn<PortkeyCaRelationTransport["execute"]>(async () => jsonResponse(body));
  const transport: PortkeyCaRelationTransport = {
    close: vi.fn(async () => undefined),
    execute,
  };
  const dnsResolver = vi.fn<PortkeyCaRelationDnsResolver>(async () => dnsAddresses);
  const endpointResolver = vi.fn<PortkeyCaRelationEndpointResolver>(async () => endpoint);
  const adapter = createPortkeyCaRelationProvider({
    approvedProductionHosts: approvedProductionHosts
      ?? (environment === "production" ? ["provider.example"] : undefined),
    clock: { now: () => new Date(NOW) },
    config: providerConfig,
    dnsResolver,
    endpointResolver,
    environment,
    freshnessPolicy: {
      maxAgeMs: 5_000,
      maxFutureSkewMs: 1_000,
      minimumBlockHeight: 12_000,
      minimumRelationVersion: 5,
    },
    maxResponseBytes: 2_048,
    shutdownTimeoutMs: 100,
    transport,
  });
  return { adapter, dnsResolver, endpointResolver, transport };
};

describe("Portkey CA relation provider", () => {
  it("normalizes one exact current relation without exposing endpoint or response material", async () => {
    const value = facts();
    const { adapter, endpointResolver, transport } = provider({ body: currentBody(value) });

    const result = await adapter.verifyRelation(request(value));

    expect(result).toMatchObject({
      caAddress: value.caAddress,
      caHash: value.caHash,
      chainId: value.chainId,
      managerAddress: value.managerAddress,
      relationRevision: value.relationRevision,
      status: "verified",
    });
    expect(result.status === "verified" && result.relationDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(endpointResolver).toHaveBeenCalledTimes(1);
    expect(transport.execute).toHaveBeenCalledTimes(1);
    const [transportRequest] = vi.mocked(transport.execute).mock.calls[0] ?? [];
    const query = JSON.parse(String(transportRequest?.body)) as Record<string, unknown>;
    expect(Object.keys(query).sort()).toEqual([
      "caAddress",
      "caHash",
      "chainId",
      "managerAddress",
      "version",
    ]);
    expect(Object.keys(result).sort()).toEqual([
      "caAddress",
      "caHash",
      "chainId",
      "managerAddress",
      "relationDigest",
      "relationRevision",
      "status",
    ]);
    expect(JSON.stringify(result)).not.toContain("127.0.0.1");
    expect(adapter.state()).toEqual({
      accepting: true,
      activeCallCount: 0,
      environment: "stage",
      productionApproved: false,
    });
    expect(resolvePortkeyCaRelationProviderAuthority(adapter)).toEqual({
      accepting: true,
      environment: "stage",
      productionApproved: false,
    });
    expect(resolvePortkeyCaRelationProviderAuthority({ ...adapter })).toBeUndefined();
    await adapter.close();
    expect(resolvePortkeyCaRelationProviderAuthority(adapter)?.accepting).toBe(false);
  });

  it("rejects wrong CA hash, CA address, manager and chain after exactly one HTTP call", async () => {
    const value = facts();
    const variants = [
      { caHash: "0".repeat(64) },
      { caAddress: ephemeralAddress() },
      { managerAddress: ephemeralAddress() },
      { chainId: "tDVV" },
    ];

    for (const override of variants) {
      const execute = vi.fn<PortkeyCaRelationTransport["execute"]>(
        async () => jsonResponse(currentBody(value, override)),
      );
      const { adapter } = provider({ transportImplementation: execute });
      expect(await adapter.verifyRelation(request(value))).toMatchObject({
        retryable: false,
        status: "rejected",
      });
      expect(execute).toHaveBeenCalledTimes(1);
      await adapter.close();
    }
  });

  it("accepts only the current manager after rotation", async () => {
    const value = facts();
    const previousManager = ephemeralAddress();
    const execute = vi.fn<PortkeyCaRelationTransport["execute"]>(
      async () => jsonResponse(currentBody(value)),
    );
    const { adapter } = provider({ transportImplementation: execute });

    expect(await adapter.verifyRelation(request(value, { managerAddress: previousManager })))
      .toMatchObject({ status: "rejected" });
    expect(await adapter.verifyRelation(request(value))).toMatchObject({ status: "verified" });
    expect(execute).toHaveBeenCalledTimes(2);
    await adapter.close();
  });

  it("fails closed for unknown, stale timestamp, stale block and stale relation version", async () => {
    const value = facts();
    const variants = [
      { status: "unknown", version: PORTKEY_CA_RELATION_RESPONSE_VERSION },
      currentBody(value, { observedAt: new Date(NOW.getTime() - 5_001).toISOString() }),
      currentBody(value, { blockHeight: 11_999 }),
      currentBody(value, { relationVersion: 4 }),
    ];

    for (const body of variants) {
      const { adapter } = provider({ body });
      const result = await adapter.verifyRelation(request(value));
      expect(result).toMatchObject({ retryable: false, status: "rejected" });
      expect(JSON.stringify(result)).not.toMatch(/observedAt|blockHeight|relationVersion/i);
      await adapter.close();
    }
  });

  it("rejects malformed, non-JSON, unknown-field, oversized and oversized chunked responses", async () => {
    const value = facts();
    const unknownField = currentBody(value, { rawProviderPayload: "not-authority" });
    const oversized = { value: randomBytes(3_000).toString("hex") };
    const chunk = randomBytes(256);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(chunk);
      },
      cancel() {},
    });
    const responses = [
      () => new Response("{not-json", { headers: { "content-type": "application/json" } }),
      () => new Response("plain", { headers: { "content-type": "text/plain" } }),
      () => jsonResponse(unknownField),
      () => jsonResponse(oversized),
      () => new Response(stream, { headers: { "content-type": "application/json" } }),
    ];

    for (const response of responses) {
      const execute = vi.fn<PortkeyCaRelationTransport["execute"]>(async () => response());
      const { adapter } = provider({ transportImplementation: execute });
      const result = await adapter.verifyRelation(request(value));
      expect(result).toMatchObject({ status: "unavailable" });
      expect(JSON.stringify(result).length).toBeLessThan(512);
      expect(execute).toHaveBeenCalledTimes(1);
      await adapter.close();
    }
  });

  it("maps timeout, caller abort and transport errors to bounded safe diagnostics", async () => {
    const value = facts();
    const unsafeCause = `unsafe-${randomBytes(32).toString("hex")}`;
    const hangingExecute = vi.fn<PortkeyCaRelationTransport["execute"]>((input) => new Promise((_resolve, reject) => {
      input.signal.addEventListener("abort", () => reject(new Error(unsafeCause)), { once: true });
    }));
    const timed = provider({ transportImplementation: hangingExecute });
    const timeoutResult = await timed.adapter.verifyRelation(request(value));
    expect(timeoutResult).toMatchObject({ retryable: true, status: "unavailable" });
    await timed.adapter.close();

    const controller = new AbortController();
    controller.abort();
    const aborted = provider({ body: currentBody(value) });
    const abortResult = await aborted.adapter.verifyRelation(request(value), controller.signal);
    expect(abortResult).toMatchObject({ retryable: false, status: "unavailable" });
    expect(aborted.transport.execute).not.toHaveBeenCalled();
    await aborted.adapter.close();

    const thrown = provider({
      transportImplementation: vi.fn<PortkeyCaRelationTransport["execute"]>(async () => {
        throw new Error(unsafeCause);
      }),
    });
    const thrownResult = await thrown.adapter.verifyRelation(request(value));
    const serialized = JSON.stringify(thrownResult);
    expect(thrownResult).toMatchObject({ retryable: true, status: "unavailable" });
    expect(serialized).not.toContain(unsafeCause);
    expect(serialized).not.toMatch(/stack|cause|message|url/i);
    expect(serialized.length).toBeLessThan(512);
    await thrown.adapter.close();
  });

  it("reports 429 retry posture and 5xx outage without retrying", async () => {
    const value = facts();
    const cases: Array<{
      headers: Record<string, string>;
      retryAfterMs?: number;
      status: number;
    }> = [
      { headers: { "retry-after": "2" }, retryAfterMs: 2_000, status: 429 },
      { headers: {}, retryAfterMs: undefined, status: 503 },
    ];

    for (const candidate of cases) {
      const execute = vi.fn<PortkeyCaRelationTransport["execute"]>(async () => jsonResponse(
        { status: "unavailable" },
        candidate.status,
        candidate.headers,
      ));
      const { adapter } = provider({ transportImplementation: execute });
      const result = await adapter.verifyRelation(request(value));
      expect(result).toMatchObject({ retryable: true, status: "unavailable" });
      if (candidate.retryAfterMs !== undefined) {
        expect(result).toMatchObject({ retryAfterMs: candidate.retryAfterMs });
      }
      expect(execute).toHaveBeenCalledTimes(1);
      await adapter.close();
    }
  });

  it("enforces loopback Stage and separately approved HTTPS production endpoints", async () => {
    const value = facts();
    const invalidStageEndpoints = [
      "https://provider.example/relation",
      "http://user:password@127.0.0.1:5195/relation",
      "http://127.0.0.1:5195/relation?token=unsafe",
    ];
    for (const endpoint of invalidStageEndpoints) {
      const candidate = provider({ body: currentBody(value), endpoint });
      expect(await candidate.adapter.verifyRelation(request(value))).toMatchObject({
        retryable: false,
        status: "unavailable",
      });
      expect(candidate.transport.execute).not.toHaveBeenCalled();
      await candidate.adapter.close();
    }

    expect(() => provider({
      approvedProductionHosts: [],
      environment: "production",
      providerConfig: config({ productionApproved: true }),
    })).toThrowError(PortkeyCaRelationProviderConfigurationError);

    expect(() => provider({
      environment: "production",
      providerConfig: config({ productionApproved: false }),
    })).toThrowError(PortkeyCaRelationProviderConfigurationError);

    for (const endpoint of [
      "https://10.0.0.1/relation",
      "https://[2606:4700:4700::1111]/relation",
      "https://unapproved.example/relation",
    ]) {
      const rejectedEndpoint = provider({
        body: currentBody(value),
        endpoint,
        environment: "production",
        providerConfig: config({ productionApproved: true }),
      });
      expect(await rejectedEndpoint.adapter.verifyRelation(request(value)))
        .toMatchObject({ status: "unavailable" });
      expect(rejectedEndpoint.dnsResolver).not.toHaveBeenCalled();
      expect(rejectedEndpoint.transport.execute).not.toHaveBeenCalled();
      await rejectedEndpoint.adapter.close();
    }

    const nonGlobalAddresses: readonly PortkeyCaRelationDnsAddress[] = [
      { address: "0.0.0.0", family: 4 },
      { address: "10.0.0.1", family: 4 },
      { address: "100.64.0.1", family: 4 },
      { address: "127.0.0.1", family: 4 },
      { address: "169.254.1.1", family: 4 },
      { address: "192.0.2.1", family: 4 },
      { address: "224.0.0.1", family: 4 },
      { address: "240.0.0.1", family: 4 },
      { address: "::", family: 6 },
      { address: "::1", family: 6 },
      { address: "::ffff:10.0.0.1", family: 6 },
      { address: "fc00::1", family: 6 },
      { address: "fe80::1", family: 6 },
      { address: "ff02::1", family: 6 },
      { address: "2001:db8::1", family: 6 },
      { address: "2002::1", family: 6 },
    ];
    for (const address of nonGlobalAddresses) {
      const rejectedAddress = provider({
        body: currentBody(value),
        dnsAddresses: [address],
        endpoint: "https://provider.example/relation",
        environment: "production",
        providerConfig: config({ productionApproved: true }),
      });
      expect(await rejectedAddress.adapter.verifyRelation(request(value)))
        .toMatchObject({ status: "unavailable" });
      expect(rejectedAddress.dnsResolver).toHaveBeenCalledTimes(1);
      expect(rejectedAddress.transport.execute).not.toHaveBeenCalled();
      await rejectedAddress.adapter.close();
    }

    const mixedResolution = provider({
      body: currentBody(value),
      dnsAddresses: [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ],
      endpoint: "https://provider.example/relation",
      environment: "production",
      providerConfig: config({ productionApproved: true }),
    });
    expect(await mixedResolution.adapter.verifyRelation(request(value)))
      .toMatchObject({ status: "unavailable" });
    expect(mixedResolution.transport.execute).not.toHaveBeenCalled();
    await mixedResolution.adapter.close();

    const production = provider({
      body: currentBody(value),
      endpoint: "https://provider.example/relation",
      environment: "production",
      providerConfig: config({ productionApproved: true }),
    });
    expect(await production.adapter.verifyRelation(request(value))).toMatchObject({ status: "verified" });
    expect(production.dnsResolver).toHaveBeenCalledTimes(1);
    expect(production.transport.execute).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "https://provider.example/relation",
      pinnedAddress: { address: "93.184.216.34", family: 4 },
    }));
    expect(production.adapter.state().productionApproved).toBe(true);
    await production.adapter.close();

    const productionIpv6 = provider({
      body: currentBody(value),
      dnsAddresses: [{ address: "2606:4700:4700::1111", family: 6 }],
      endpoint: "https://provider.example/relation",
      environment: "production",
      providerConfig: config({ productionApproved: true }),
    });
    expect(await productionIpv6.adapter.verifyRelation(request(value)))
      .toMatchObject({ status: "verified" });
    expect(productionIpv6.transport.execute).toHaveBeenCalledWith(expect.objectContaining({
      pinnedAddress: { address: "2606:4700:4700::1111", family: 6 },
    }));
    await productionIpv6.adapter.close();
  });

  it("resolves endpoint material by config-owned env key without retaining it", async () => {
    const endpoint = "http://127.0.0.1:5195/relation";
    const env = Object.freeze({ CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: endpoint });
    const resolver = createPortkeyCaRelationEndpointResolver(env);
    const controller = new AbortController();
    expect(await resolver({ config: config(), signal: controller.signal })).toBe(endpoint);
    controller.abort();
    await expect(resolver({ config: config(), signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("pins the real Node TLS transport while preserving the endpoint hostname as SNI", async () => {
    const sockets = new Set<Socket>();
    let clientHello = Buffer.alloc(0);
    let connectionCount = 0;
    const server = createServer((socket) => {
      connectionCount += 1;
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      socket.setTimeout(1_000, () => socket.destroy());
      socket.once("data", (chunk) => {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        clientHello = Buffer.concat([clientHello, bytes]).subarray(0, 8_192);
        socket.destroy();
      });
    });
    const port = await listenTcpServer(server);
    const transport = createNodePortkeyCaRelationTransport();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_000);

    try {
      await expect(transport.execute({
        body: "{}",
        endpoint: `https://pin-target.invalid:${port}/relation`,
        headers: {
          "accept": "application/json",
          "content-type": "application/json; charset=utf-8",
        },
        pinnedAddress: { address: "127.0.0.1", family: 4 },
        signal: controller.signal,
      })).rejects.toMatchObject({ name: "PortkeyCaRelationTransportError" });
      expect(connectionCount).toBe(1);
      expect(clientHello.byteLength).toBeGreaterThan(0);
      expect(clientHello.byteLength).toBeLessThanOrEqual(8_192);
      expect(clientHello.includes(Buffer.from("pin-target.invalid", "ascii"))).toBe(true);
    } finally {
      clearTimeout(timeout);
      await transport.close();
      for (const socket of sockets) {
        socket.destroy();
      }
      await closeTcpServer(server);
    }

    expect(server.listening).toBe(false);
    expect(sockets.size).toBe(0);
  });

  it("closes idempotently, aborts active work and rejects call-after-close", async () => {
    const value = facts();
    const execute = vi.fn<PortkeyCaRelationTransport["execute"]>((input) => new Promise((_resolve, reject) => {
      input.signal.addEventListener("abort", () => reject(new Error("closed")), { once: true });
    }));
    const { adapter, transport } = provider({ transportImplementation: execute });
    const active = adapter.verifyRelation(request(value));
    await vi.waitFor(() => expect(adapter.state().activeCallCount).toBe(1));

    const firstClose = adapter.close();
    expect(adapter.close()).toBe(firstClose);
    await expect(active).resolves.toMatchObject({ status: "unavailable" });
    await expect(firstClose).resolves.toBeUndefined();
    expect(adapter.state()).toMatchObject({ accepting: false, activeCallCount: 0 });
    expect(await adapter.verifyRelation(request(value))).toMatchObject({
      retryable: false,
      status: "unavailable",
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(transport.close).toHaveBeenCalledTimes(1);
  });
});

async function listenTcpServer(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });
  return (server.address() as AddressInfo).port;
}

async function closeTcpServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
