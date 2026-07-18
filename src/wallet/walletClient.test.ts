import { describe, expect, it, vi } from "vitest";
import {
  WalletClientError,
  createInMemoryWalletClient,
  type WalletClientProof,
} from "./walletClient";

const availableAdapter = {
  adapterId: "ephemeral-eoa",
  enabled: true,
  label: "Ephemeral EOA",
  recommended: false,
  status: "available",
} as const;

const createHarness = (overrides: Record<string, unknown> = {}) =>
  createInMemoryWalletClient({
    adapters: [availableAdapter],
    connect: async (adapterId) => ({
      adapterId,
      chainId: "AELF",
      network: "testnet",
      walletAddressHint: "ELF_ephemeral",
    }),
    generateProof: async () => ({ signature: new Uint8Array([1]) }),
    ...overrides,
  });

describe("WalletClient port", () => {
  it("lists defensive browser-safe availability without package objects", async () => {
    const { client } = createInMemoryWalletClient({
      adapters: [availableAdapter],
      connect: async () => ({
        adapterId: availableAdapter.adapterId,
        caHashHint: undefined,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: "ELF_ephemeral",
      }),
      generateProof: async () => ({ signature: new Uint8Array([1, 2, 3]) }),
    });
    const first = await client.listAvailableWallets();
    const second = await client.listAvailableWallets();

    expect(first).toEqual([availableAdapter]);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/provider|accountType|walletSource|role/i);
  });

  it("separates requested wallet hints from server-verified authority", async () => {
    const { client } = createInMemoryWalletClient({
      adapters: [availableAdapter],
      connect: async (adapterId) => ({
        adapterId,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: "ELF_requested_only",
      }),
      generateProof: async () => ({ signature: new Uint8Array([4, 5, 6]) }),
    });

    const connection = await client.connect("ephemeral-eoa");

    expect(connection).toEqual({
      adapterId: "ephemeral-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddressHint: "ELF_requested_only",
    });
    expect(connection).not.toHaveProperty("accountType");
    expect(connection).not.toHaveProperty("roleIds");
    expect(connection).not.toHaveProperty("verified");
    expect(Object.isFrozen(connection)).toBe(true);
  });

  it("signs a defensive copy of exact bytes with an in-memory generated proof", async () => {
    let sequence = 0;
    const observedBytes: number[][] = [];
    const { client } = createInMemoryWalletClient({
      adapters: [availableAdapter],
      connect: async (adapterId) => ({
        adapterId,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: "ELF_ephemeral",
      }),
      generateProof: async ({ exactMessageBytes }): Promise<WalletClientProof> => {
        observedBytes.push([...exactMessageBytes]);
        sequence += 1;

        return { signature: new Uint8Array([sequence, ...exactMessageBytes.slice(0, 2)]) };
      },
    });
    await client.connect("ephemeral-eoa");
    const exactMessageBytes = new Uint8Array([10, 20, 30]);
    const proof = await client.signMessage({ exactMessageBytes });

    exactMessageBytes.fill(99);

    expect(observedBytes).toEqual([[10, 20, 30]]);
    expect([...proof.signature]).toEqual([1, 10, 20]);
    expect(proof.signature).not.toBe(exactMessageBytes);
    expect(Object.isFrozen(proof)).toBe(true);
  });

  it("deep-copies adapter proof data and rejects malformed public keys", async () => {
    const sourceProof = {
      adapterProof: {
        manager: {
          address: "ELF_manager_before",
        },
        witness: new Uint8Array([7, 8]),
      },
      publicKey: new Uint8Array([3, 4]),
      signature: new Uint8Array([1, 2]),
    };
    const { client } = createHarness({
      generateProof: async () => sourceProof,
    });
    await client.connect("ephemeral-eoa");

    const proof = await client.signMessage({ exactMessageBytes: new Uint8Array([9]) });
    sourceProof.adapterProof.manager.address = "ELF_manager_after";
    sourceProof.adapterProof.witness.fill(0);
    sourceProof.publicKey.fill(0);
    sourceProof.signature.fill(0);

    expect(proof.adapterProof).toEqual({
      manager: { address: "ELF_manager_before" },
      witness: new Uint8Array([7, 8]),
    });
    expect(proof.publicKey).toEqual(new Uint8Array([3, 4]));
    expect(proof.signature).toEqual(new Uint8Array([1, 2]));
    expect(Object.isFrozen(proof.adapterProof)).toBe(true);
    expect(Object.isFrozen((proof.adapterProof as { manager: object }).manager)).toBe(true);

    const malformed = createHarness({
      generateProof: async () => ({
        publicKey: "not-byte-material",
        signature: new Uint8Array([1]),
      }),
    });
    await malformed.client.connect("ephemeral-eoa");
    await expect(malformed.client.signMessage({
      exactMessageBytes: new Uint8Array([9]),
    })).rejects.toMatchObject({
      code: "WALLET_CLIENT_SIGN_FAILED",
      name: "WalletClientError",
    });
  });

  it("enforces one aggregate byte budget across the complete wallet proof", async () => {
    const exactLimit = createHarness({
      generateProof: async () => ({
        adapterProof: {
          left: new Uint8Array(131_071),
          right: new Uint8Array(131_072),
        },
        signature: new Uint8Array([1]),
      }),
    });
    await exactLimit.client.connect("ephemeral-eoa");

    await expect(exactLimit.client.signMessage({
      exactMessageBytes: new Uint8Array([9]),
    })).resolves.toMatchObject({
      signature: new Uint8Array([1]),
    });

    const overLimit = createHarness({
      generateProof: async () => ({
        adapterProof: {
          left: new Uint8Array(131_071),
          right: new Uint8Array(131_073),
        },
        signature: new Uint8Array([1]),
      }),
    });
    await overLimit.client.connect("ephemeral-eoa");

    await expect(overLimit.client.signMessage({
      exactMessageBytes: new Uint8Array([9]),
    })).rejects.toMatchObject({
      code: "WALLET_CLIENT_SIGN_FAILED",
      name: "WalletClientError",
    });
  });

  it("enforces one aggregate entry budget across nested adapter proof containers", async () => {
    const createEntryHarness = (entryCount: number) => createHarness({
      generateProof: async () => ({
        adapterProof: {
          entries: Array.from({ length: entryCount }, () => null),
        },
        signature: new Uint8Array([1]),
      }),
    });
    const exactLimit = createEntryHarness(255);
    await exactLimit.client.connect("ephemeral-eoa");
    await expect(exactLimit.client.signMessage({
      exactMessageBytes: new Uint8Array([9]),
    })).resolves.toBeDefined();

    const overLimit = createEntryHarness(256);
    await overLimit.client.connect("ephemeral-eoa");
    await expect(overLimit.client.signMessage({
      exactMessageBytes: new Uint8Array([9]),
    })).rejects.toMatchObject({
      code: "WALLET_CLIENT_SIGN_FAILED",
      name: "WalletClientError",
    });
  });

  it("returns an idempotent unsubscribe and emits bounded account/chain events", async () => {
    const listener = vi.fn();
    const { client, emit } = createInMemoryWalletClient({
      adapters: [availableAdapter],
      connect: async (adapterId) => ({
        adapterId,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: "ELF_before",
      }),
      generateProof: async () => ({ signature: new Uint8Array([1]) }),
    });
    const unsubscribe = client.subscribeAccountAndChain(listener);

    emit({ chainId: "tDVV", network: "testnet", type: "chain_changed" });
    expect(listener).toHaveBeenCalledWith({
      chainId: "tDVV",
      network: "testnet",
      type: "chain_changed",
    });

    unsubscribe();
    unsubscribe();
    emit({ type: "disconnected" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("fails typed for unavailable adapters and never falls back to seeded identity", async () => {
    const connect = vi.fn();
    const { client } = createInMemoryWalletClient({
      adapters: [{ ...availableAdapter, adapterId: "missing-extension", enabled: false, status: "unavailable" }],
      connect,
      generateProof: async () => ({ signature: new Uint8Array([1]) }),
    });

    await expect(client.connect("missing-extension")).rejects.toMatchObject({
      adapterId: "missing-extension",
      code: "WALLET_CLIENT_ADAPTER_UNAVAILABLE",
      name: "WalletClientError",
    });
    expect(connect).not.toHaveBeenCalled();

    try {
      await client.connect("missing-extension");
    } catch (error) {
      expect(error).toBeInstanceOf(WalletClientError);
      expect(JSON.stringify(error)).not.toContain("seeded");
    }
  });

  it("makes disconnect and close idempotent and rejects use after close", async () => {
    const disconnect = vi.fn(async () => undefined);
    const { client } = createInMemoryWalletClient({
      adapters: [availableAdapter],
      connect: async (adapterId) => ({
        adapterId,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: "ELF_ephemeral",
      }),
      disconnect,
      generateProof: async () => ({ signature: new Uint8Array([1]) }),
    });

    await client.disconnect();
    await client.disconnect();
    expect(disconnect).toHaveBeenCalledTimes(1);

    await client.close();
    await client.close();
    await expect(client.connect("ephemeral-eoa")).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
    });
  });

  it("sanitizes unsafe adapter and trace IDs across direct, aborted and closed errors", async () => {
    const unsafeValue = "/Users/alice/private/wallet?token=raw-wallet-token";
    const directError = new WalletClientError("WALLET_CLIENT_CONNECT_FAILED", {
      adapterId: unsafeValue,
      traceId: unsafeValue,
    });
    const { client } = createHarness();
    const controller = new AbortController();
    controller.abort();

    const abortedError = await client.connect(unsafeValue, controller.signal).catch((error) => error);
    await client.close();
    const closedError = await client.connect(unsafeValue).catch((error) => error);

    for (const error of [directError, abortedError, closedError]) {
      expect(error).toBeInstanceOf(WalletClientError);
      expect(error).not.toHaveProperty("adapterId", unsafeValue);
      expect(error).not.toHaveProperty("traceId", unsafeValue);
      expect(JSON.stringify(error)).not.toContain(unsafeValue);
      expect(JSON.stringify(error)).not.toContain("raw-wallet-token");
    }

    const safeError = new WalletClientError("WALLET_CLIENT_CONNECT_FAILED", {
      adapterId: "ephemeral-eoa",
      traceId: "trace-wallet-connect",
    });
    expect(safeError).toMatchObject({
      adapterId: "ephemeral-eoa",
      traceId: "trace-wallet-connect",
    });
  });

  it.each([
    ["unknown field", [{ ...availableAdapter, provider: "forged" }]],
    ["duplicate adapter ID", [availableAdapter, { ...availableAdapter }]],
    ["oversized label", [{ ...availableAdapter, label: "x".repeat(81) }]],
    ["unknown status", [{ ...availableAdapter, status: "connected" }]],
    ["inconsistent enabled status", [{ ...availableAdapter, enabled: false }]],
    [
      "entry limit",
      Array.from({ length: 17 }, (_, index) => ({
        ...availableAdapter,
        adapterId: `ephemeral-${index}`,
      })),
    ],
  ])("rejects invalid initial availability: %s", (_label, adapters) => {
    expect(() => createHarness({ adapters })).toThrowError(expect.objectContaining({
      code: "WALLET_CLIENT_INPUT_INVALID",
      name: "WalletClientError",
    }));
  });

  it("rejects a non-callable account listener with a typed input error", () => {
    const { client } = createHarness();

    expect(() => (
      client.subscribeAccountAndChain as unknown as (listener: unknown) => void
    )(undefined)).toThrowError(expect.objectContaining({
      code: "WALLET_CLIENT_INPUT_INVALID",
      name: "WalletClientError",
    }));
  });

  it.each([
    ["unknown type", { type: "connected" }],
    ["extra disconnected field", { reason: "forged", type: "disconnected" }],
    ["oversized chain", { chainId: "x".repeat(33), network: "testnet", type: "chain_changed" }],
    ["unknown network", { chainId: "AELF", network: "devnet", type: "chain_changed" }],
    ["oversized account", { type: "account_changed", walletAddressHint: "x".repeat(257) }],
  ])("rejects invalid runtime event shape: %s", (_label, event) => {
    const listener = vi.fn();
    const { client, emit } = createHarness();
    client.subscribeAccountAndChain(listener);

    expect(() => emit(event as never)).toThrowError(expect.objectContaining({
      code: "WALLET_CLIENT_INPUT_INVALID",
      name: "WalletClientError",
    }));
    expect(listener).not.toHaveBeenCalled();
  });

  it("closes and clears listeners even when the injected disconnect rejects", async () => {
    const disconnect = vi.fn(async () => {
      throw new Error("private disconnect token");
    });
    const listener = vi.fn();
    const { client, emit } = createHarness({ disconnect });
    client.subscribeAccountAndChain(listener);

    await expect(client.close()).rejects.toMatchObject({
      code: "WALLET_CLIENT_DISCONNECT_FAILED",
      name: "WalletClientError",
    });

    emit({ type: "disconnected" });
    expect(listener).not.toHaveBeenCalled();
    await expect(client.connect("ephemeral-eoa")).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
    });
    await expect(client.close()).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("drains an in-flight connect before close and never publishes a post-close connection", async () => {
    let resolveConnect: ((value: {
      adapterId: string;
      chainId: string;
      network: "testnet";
      walletAddressHint: string;
    }) => void) | undefined;
    const disconnect = vi.fn(async () => undefined);
    const { client } = createHarness({
      connect: (adapterId: string) => new Promise((resolve) => {
        resolveConnect = resolve;
      }),
      disconnect,
    });

    const connectPromise = client.connect("ephemeral-eoa");
    const closePromise = client.close();
    resolveConnect?.({
      adapterId: "ephemeral-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddressHint: "ELF_ephemeral",
    });

    await expect(connectPromise).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
      name: "WalletClientError",
    });
    await expect(closePromise).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
    await expect(client.signMessage({
      exactMessageBytes: new Uint8Array([1]),
    })).rejects.toMatchObject({ code: "WALLET_CLIENT_CLOSED" });
  });

  it("waits for an in-flight disconnect before close settles", async () => {
    let releaseDisconnect: (() => void) | undefined;
    const disconnect = vi.fn(() => new Promise<void>((resolve) => {
      releaseDisconnect = resolve;
    }));
    const { client } = createHarness({ disconnect });
    await client.connect("ephemeral-eoa");

    const disconnectPromise = client.disconnect();
    const closePromise = client.close();
    const closeState = await Promise.race([
      closePromise.then(() => "settled" as const),
      new Promise<"pending">((resolve) => {
        setTimeout(() => resolve("pending"), 10);
      }),
    ]);

    expect(closeState).toBe("pending");
    expect(disconnect).toHaveBeenCalledTimes(1);

    releaseDisconnect?.();
    await expect(disconnectPromise).resolves.toBeUndefined();
    await expect(closePromise).resolves.toBeUndefined();
  });

  it("rejects reconnect while disconnect cleanup is in flight and allows it after cleanup", async () => {
    let releaseDisconnect: (() => void) | undefined;
    const disconnect = vi.fn(() => new Promise<void>((resolve) => {
      releaseDisconnect = resolve;
    }));
    const { client } = createHarness({ disconnect });
    await client.connect("ephemeral-eoa");

    const disconnectPromise = client.disconnect();
    const reconnectResult = await client.connect("ephemeral-eoa").then(
      () => ({ status: "resolved" as const }),
      (error: unknown) => ({ error, status: "rejected" as const }),
    );
    releaseDisconnect?.();
    await disconnectPromise;

    expect(reconnectResult).toMatchObject({
      error: expect.objectContaining({
        code: "WALLET_CLIENT_DISCONNECT_IN_PROGRESS",
        name: "WalletClientError",
      }),
      status: "rejected",
    });
    await expect(client.connect("ephemeral-eoa")).resolves.toMatchObject({
      adapterId: "ephemeral-eoa",
    });
  });
});
