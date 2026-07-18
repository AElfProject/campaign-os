import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createAelfWebLoginWalletClient,
  createDefaultAelfWebLoginAdapterBindings,
  createDefaultAelfWebLoginBrowserWalletClient,
  type AelfWebLoginAdapterBinding,
  type AelfWebLoginAdapterDriver,
  type AelfWebLoginRuntimeConfig,
} from "./aelfWebLoginWalletClient";
import type {
  BrowserWalletAdapterConfigEntry,
  WalletAdapterConfig,
} from "./walletAdapterConfig";
import { WalletClientError } from "./walletClient";

const packages = {
  aa: "@aelf-web-login/wallet-adapter-portkey-aa",
  discover: "@aelf-web-login/wallet-adapter-portkey-discover",
  missing: "@aelf-web-login/wallet-adapter-portkey-extension",
  nightElf: "@aelf-web-login/wallet-adapter-night-elf",
} as const;

const requestedAddress = "ELF_test_requested_address";
const changedAddress = "ELF_test_changed_address";
const requestedCaHash = "CA_test_requested_hash";

const packageSignature = (seed = 1): string =>
  Array.from({ length: 65 }, (_, index) => (seed + index) % 256)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const runtime: AelfWebLoginRuntimeConfig = Object.freeze({
  appName: "Campaign OS",
  chainId: "AELF",
  network: "testnet",
  rpcUrl: "http://127.0.0.1:8000",
});

const entry = (
  overrides: Partial<BrowserWalletAdapterConfigEntry> = {},
): BrowserWalletAdapterConfigEntry => Object.freeze({
  adapterId: "portkey-discover-eoa",
  enabled: true,
  label: "Portkey EOA",
  packageName: packages.discover,
  recommended: true,
  status: "available",
  ...overrides,
});

const config = (
  adapters: readonly BrowserWalletAdapterConfigEntry[],
  overrides: Partial<WalletAdapterConfig> = {},
): WalletAdapterConfig => Object.freeze({
  adapters: Object.freeze([...adapters]),
  diagnostics: Object.freeze([]),
  enabled: true,
  status: "ready",
  valid: true,
  ...overrides,
});

interface DriverHarness {
  readonly close: ReturnType<typeof vi.fn>;
  readonly connect: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
  readonly driver: AelfWebLoginAdapterDriver;
  readonly emit: (event: unknown) => void;
  readonly signMessage: ReturnType<typeof vi.fn>;
  readonly unsubscribe: ReturnType<typeof vi.fn>;
}

const createDriverHarness = ({
  connectResult = {
    accountType: "EOA",
    chainId: "AELF",
    network: "testnet",
    walletAddressHint: requestedAddress,
  },
  proofResult = { signature: new Uint8Array([1, 2, 3]) },
}: {
  readonly connectResult?: unknown;
  readonly proofResult?: unknown;
} = {}): DriverHarness => {
  let listener: ((event: unknown) => void) | undefined;
  const close = vi.fn(async () => undefined);
  const connect = vi.fn(async () => connectResult);
  const disconnect = vi.fn(async () => undefined);
  const signMessage = vi.fn(async () => proofResult);
  const unsubscribe = vi.fn(() => {
    listener = undefined;
  });

  return {
    close,
    connect,
    disconnect,
    driver: {
      close,
      connect,
      disconnect,
      signMessage,
      subscribe(nextListener) {
        listener = nextListener;
        return unsubscribe;
      },
    },
    emit(event) {
      listener?.(event);
    },
    signMessage,
    unsubscribe,
  };
};

const binding = (
  driver: AelfWebLoginAdapterDriver,
  overrides: Partial<AelfWebLoginAdapterBinding> = {},
): AelfWebLoginAdapterBinding => Object.freeze({
  accountType: "EOA",
  approved: true,
  createDriver: vi.fn(() => driver),
  packageName: packages.discover,
  providerAvailable: true,
  ...overrides,
});

const createClient = ({
  adapterConfig = config([entry()]),
  bindings,
  driverHarness = createDriverHarness(),
  traceIdFactory = () => "trace-wallet-adapter-test",
}: {
  readonly adapterConfig?: WalletAdapterConfig;
  readonly bindings?: readonly AelfWebLoginAdapterBinding[];
  readonly driverHarness?: DriverHarness;
  readonly traceIdFactory?: () => string;
} = {}) => ({
  client: createAelfWebLoginWalletClient({
    adapterConfig,
    bindings: bindings ?? [binding(driverHarness.driver)],
    runtime,
    traceIdFactory,
  }),
  driverHarness,
});

const deferred = <T,>() => {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });

  return { promise, reject: rejectPromise, resolve: resolvePromise };
};

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) {
      return collectSourceFiles(path);
    }

    return /\.(?:ts|tsx)$/.test(name) ? [path] : [];
  });

describe("AElf Web Login WalletClient adapter", () => {
  it("projects package, provider, disabled, unapproved and ready availability fail closed", async () => {
    const adapters = [
      entry(),
      entry({
        adapterId: "nightelf-disabled",
        enabled: false,
        label: "NightElf disabled",
        packageName: packages.nightElf,
        recommended: false,
        status: "disabled",
      }),
      entry({
        adapterId: "provider-missing",
        label: "Provider missing",
        packageName: "@aelf-web-login/wallet-adapter-provider-missing",
        recommended: false,
      }),
      entry({
        adapterId: "package-missing",
        label: "Package missing",
        packageName: packages.missing,
        recommended: false,
      }),
      entry({
        adapterId: "unapproved",
        label: "Unapproved adapter",
        packageName: packages.aa,
        recommended: false,
      }),
    ];
    const readyHarness = createDriverHarness();
    const disabledHarness = createDriverHarness();
    const providerMissingHarness = createDriverHarness();
    const unapprovedHarness = createDriverHarness();
    const { client } = createClient({
      adapterConfig: config(adapters),
      bindings: [
        binding(readyHarness.driver),
        binding(disabledHarness.driver, { packageName: packages.nightElf }),
        binding(providerMissingHarness.driver, {
          packageName: "@aelf-web-login/wallet-adapter-provider-missing",
          providerAvailable: false,
        }),
        binding(unapprovedHarness.driver, {
          approved: false,
          packageName: packages.aa,
        }),
      ],
    });

    await expect(client.listAvailableWallets()).resolves.toEqual([
      {
        adapterId: "portkey-discover-eoa",
        enabled: true,
        label: "Portkey EOA",
        recommended: true,
        status: "available",
      },
      {
        adapterId: "nightelf-disabled",
        enabled: false,
        label: "NightElf disabled",
        recommended: false,
        status: "disabled",
      },
      {
        adapterId: "provider-missing",
        enabled: false,
        label: "Provider missing",
        recommended: false,
        status: "unavailable",
      },
      {
        adapterId: "package-missing",
        enabled: false,
        label: "Package missing",
        recommended: false,
        status: "unavailable",
      },
      {
        adapterId: "unapproved",
        enabled: false,
        label: "Unapproved adapter",
        recommended: false,
        status: "unavailable",
      },
    ]);

    for (const adapterId of ["provider-missing", "package-missing", "unapproved"]) {
      await expect(client.connect(adapterId)).rejects.toMatchObject({
        adapterId,
        code: "WALLET_CLIENT_ADAPTER_UNAVAILABLE",
        name: "WalletClientError",
        traceId: "trace-wallet-adapter-test",
      });
    }
    expect(providerMissingHarness.connect).not.toHaveBeenCalled();
    expect(unapprovedHarness.connect).not.toHaveBeenCalled();
  });

  it.each([
    [
      "EOA",
      "portkey-discover-eoa",
      packages.discover,
      {
        accountType: "EOA",
        chainId: "AELF",
        network: "testnet",
        packageWallet: { opaque: true },
        walletAddressHint: requestedAddress,
      },
      {
        adapterId: "portkey-discover-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: requestedAddress,
      },
    ],
    [
      "AA",
      "portkey-aa",
      packages.aa,
      {
        accountType: "AA",
        caHashHint: requestedCaHash,
        chainId: "AELF",
        manager: { opaque: true },
        network: "testnet",
        walletAddressHint: requestedAddress,
      },
      {
        adapterId: "portkey-aa",
        caHashHint: requestedCaHash,
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: requestedAddress,
      },
    ],
  ] as const)(
    "returns a bounded internal %s handle without package objects",
    async (accountType, adapterId, packageName, connectResult, expected) => {
      const driverHarness = createDriverHarness({ connectResult });
      const { client } = createClient({
        adapterConfig: config([entry({ adapterId, packageName })]),
        bindings: [binding(driverHarness.driver, { accountType, packageName })],
        driverHarness,
      });

      const connection = await client.connect(adapterId);

      expect(connection).toEqual(expected);
      expect(Object.isFrozen(connection)).toBe(true);
      expect(connection).not.toHaveProperty("accountType");
      expect(connection).not.toHaveProperty("manager");
      expect(connection).not.toHaveProperty("packageWallet");
      expect(JSON.stringify(connection)).not.toContain("opaque");
    },
  );

  it("passes an immediate defensive copy of exact bytes to the binding and bounds proof output", async () => {
    const proofGate = deferred<unknown>();
    const sourceProof = {
      adapterProof: {
        relationRevision: "test-revision",
        witness: new Uint8Array([7, 8]),
      },
      extensionPayload: { opaque: true },
      publicKey: new Uint8Array([2, 3]),
      signature: new Uint8Array([4, 5, 6]),
    };
    const driverHarness = createDriverHarness();
    driverHarness.signMessage.mockImplementation(async () => proofGate.promise);
    const { client } = createClient({ driverHarness });
    await client.connect("portkey-discover-eoa");
    const exactMessageBytes = new Uint8Array([0, 10, 20, 255]);

    const pendingProof = client.signMessage({ exactMessageBytes });
    expect(driverHarness.signMessage).toHaveBeenCalledOnce();
    const bindingInput = driverHarness.signMessage.mock.calls[0][0] as {
      exactMessageBytes: Uint8Array;
      signal: AbortSignal;
    };
    expect(bindingInput.exactMessageBytes).toEqual(new Uint8Array([0, 10, 20, 255]));
    expect(bindingInput.exactMessageBytes).not.toBe(exactMessageBytes);
    expect(bindingInput.signal).toBeInstanceOf(AbortSignal);
    exactMessageBytes.fill(99);
    proofGate.resolve(sourceProof);

    const proof = await pendingProof;
    sourceProof.signature.fill(0);
    sourceProof.publicKey.fill(0);
    sourceProof.adapterProof.witness.fill(0);

    expect(proof).toEqual({
      adapterProof: {
        relationRevision: "test-revision",
        witness: new Uint8Array([7, 8]),
      },
      publicKey: new Uint8Array([2, 3]),
      signature: new Uint8Array([4, 5, 6]),
    });
    expect(proof).not.toHaveProperty("extensionPayload");
    expect(Object.isFrozen(proof)).toBe(true);
    expect(Object.isFrozen(proof.adapterProof)).toBe(true);
  });

  it("does not log package proof material while projecting binding output", async () => {
    const consoleSpies = [
      vi.spyOn(console, "debug").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
    ];
    const driverHarness = createDriverHarness({
      proofResult: {
        providerExtra: { opaque: true },
        signature: new Uint8Array([9, 8, 7]),
      },
    });
    const { client } = createClient({ driverHarness });

    await client.connect("portkey-discover-eoa");
    await client.signMessage({ exactMessageBytes: new Uint8Array([1]) });

    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });

  it("aborts pending connect, returns disconnect promptly and ignores late resolve", async () => {
    const connectGate = deferred<unknown>();
    const driverHarness = createDriverHarness();
    driverHarness.connect.mockImplementation(async ({ signal }: { signal: AbortSignal }) => {
      expect(signal.aborted).toBe(false);
      return connectGate.promise;
    });
    const { client } = createClient({ driverHarness });

    const pendingConnect = client.connect("portkey-discover-eoa");
    const pendingDisconnect = client.disconnect();

    expect((driverHarness.connect.mock.calls[0][0] as { signal: AbortSignal }).signal.aborted).toBe(true);
    await expect(pendingConnect).rejects.toMatchObject({
      code: "WALLET_CLIENT_CONNECT_FAILED",
      name: "WalletClientError",
      traceId: "trace-wallet-adapter-test",
    });
    await expect(pendingDisconnect).resolves.toBeUndefined();
    expect(driverHarness.disconnect).toHaveBeenCalledOnce();
    expect(driverHarness.close).toHaveBeenCalledOnce();
    connectGate.resolve({
      accountType: "EOA",
      chainId: "AELF",
      network: "testnet",
      walletAddressHint: "ELF_test_late_address",
    });
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_NOT_CONNECTED",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it("aborts sign and rejects a proof that resolves after disconnect", async () => {
    const proofGate = deferred<unknown>();
    const driverHarness = createDriverHarness();
    driverHarness.signMessage.mockImplementation(async () => proofGate.promise);
    const { client } = createClient({ driverHarness });
    await client.connect("portkey-discover-eoa");

    const pendingProof = client.signMessage({ exactMessageBytes: new Uint8Array([1, 2]) });
    await client.disconnect();
    expect((driverHarness.signMessage.mock.calls[0][0] as { signal: AbortSignal }).signal.aborted).toBe(true);
    proofGate.resolve({ signature: new Uint8Array([3, 4]) });

    await expect(pendingProof).rejects.toMatchObject({
      code: "WALLET_CLIENT_SIGN_FAILED",
      name: "WalletClientError",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it("makes disconnect idempotent for concurrent and repeated calls", async () => {
    const disconnectGate = deferred<void>();
    const driverHarness = createDriverHarness();
    driverHarness.disconnect.mockImplementation(async () => disconnectGate.promise);
    const { client } = createClient({ driverHarness });
    await client.connect("portkey-discover-eoa");

    const first = client.disconnect();
    const second = client.disconnect();
    expect(driverHarness.disconnect).toHaveBeenCalledOnce();
    disconnectGate.resolve();
    await Promise.all([first, second]);
    await client.disconnect();

    expect(driverHarness.disconnect).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "account",
      {
        accountType: "EOA",
        type: "account_changed",
        walletAddressHint: changedAddress,
      },
      { type: "account_changed", walletAddressHint: changedAddress },
    ],
    [
      "chain/network",
      { chainId: "tDVV", network: "testnet", type: "chain_changed" },
      { chainId: "tDVV", network: "testnet", type: "chain_changed" },
    ],
    ["provider disconnect", { type: "disconnected" }, { type: "disconnected" }],
  ] as const)("projects %s events, invalidates old authority and supports unsubscribe", async (
    _label,
    rawEvent,
    expected,
  ) => {
    const driverHarness = createDriverHarness();
    const { client } = createClient({ driverHarness });
    const listener = vi.fn();
    const unsubscribe = client.subscribeAccountAndChain(listener);
    await client.connect("portkey-discover-eoa");

    driverHarness.emit(rawEvent);
    expect(listener).toHaveBeenCalledWith(expected);
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_NOT_CONNECTED",
      traceId: "trace-wallet-adapter-test",
    });
    unsubscribe();
    unsubscribe();
    driverHarness.emit(rawEvent);
  });

  it.each([
    [
      "unsupported account event",
      { accountType: "AA", type: "account_changed", walletAddressHint: changedAddress },
    ],
    [
      "oversized account event",
      { accountType: "EOA", type: "account_changed", walletAddressHint: "x".repeat(257) },
    ],
    [
      "unsupported provider event",
      { provider: { opaque: true }, type: "provider_changed" },
    ],
    ["unsupported chain event", { chainId: "ETH", network: "testnet", type: "chain_changed" }],
  ])("invalidates the connection on %s", async (_label, rawEvent) => {
    const driverHarness = createDriverHarness();
    const { client } = createClient({ driverHarness });
    const listener = vi.fn();
    client.subscribeAccountAndChain(listener);
    await client.connect("portkey-discover-eoa");

    driverHarness.emit(rawEvent);

    expect(listener).toHaveBeenCalledWith({ type: "disconnected" });
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_NOT_CONNECTED",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it.each([
    ["unknown account type", { accountType: "OWNER" }],
    ["binding account mismatch", { accountType: "AA" }],
    ["unsupported chain", { chainId: "ETH" }],
    ["wrong configured chain", { chainId: "tDVV" }],
    ["unsupported network", { network: "devnet" }],
    ["wrong configured network", { network: "mainnet" }],
    ["oversized address", { walletAddressHint: "x".repeat(257) }],
    ["oversized AA metadata", { accountType: "AA", caHashHint: "x".repeat(257) }],
  ])("fails closed for %s connect output", async (_label, malformedFields) => {
    const driverHarness = createDriverHarness({
      connectResult: {
        accountType: "EOA",
        chainId: "AELF",
        network: "testnet",
        walletAddressHint: requestedAddress,
        ...malformedFields,
      },
    });
    const configuredBinding = binding(driverHarness.driver, {
      accountType: "accountType" in malformedFields
        && malformedFields.accountType === "AA"
        && "caHashHint" in malformedFields
        ? "AA"
        : "EOA",
    });
    const { client } = createClient({ bindings: [configuredBinding], driverHarness });

    await expect(client.connect("portkey-discover-eoa")).rejects.toMatchObject({
      adapterId: "portkey-discover-eoa",
      code: "WALLET_CLIENT_CONNECT_FAILED",
      name: "WalletClientError",
      traceId: "trace-wallet-adapter-test",
    });
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_NOT_CONNECTED",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it.each([
    ["circular proof", () => {
      const proof: Record<string, unknown> = { signature: new Uint8Array([1]) };
      proof.self = proof;
      return proof;
    }],
    ["oversized proof metadata", () => ({
      adapterProof: { metadata: "x".repeat(65_537) },
      signature: new Uint8Array([1]),
    })],
    ["unsupported proof scalar", () => ({
      adapterProof: { scalar: 1n },
      signature: new Uint8Array([1]),
    })],
  ])("fails closed for %s", async (_label, proofFactory) => {
    const driverHarness = createDriverHarness({ proofResult: proofFactory() });
    const { client } = createClient({ driverHarness });
    await client.connect("portkey-discover-eoa");

    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_SIGN_FAILED",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it("maps thrown circular extension errors to safe typed errors with a safe Trace ID", async () => {
    const circularError: Record<string, unknown> = {
      message: "unsafe extension detail",
      provider: { opaque: true },
    };
    circularError.self = circularError;
    const driverHarness = createDriverHarness();
    driverHarness.connect.mockRejectedValue(circularError);
    const { client } = createClient({ driverHarness });

    const error = await client.connect("portkey-discover-eoa").catch((reason) => reason);

    expect(error).toBeInstanceOf(WalletClientError);
    expect(error).toMatchObject({
      adapterId: "portkey-discover-eoa",
      code: "WALLET_CLIENT_CONNECT_FAILED",
      name: "WalletClientError",
      traceId: "trace-wallet-adapter-test",
    });
    expect(error.message).toBe("Wallet client operation is unavailable.");
    expect(JSON.stringify(error)).not.toMatch(/extension detail|provider|opaque/);
    expect(error).not.toHaveProperty("cause");
  });

  it("sanitizes a throwing or unsafe Trace ID factory", async () => {
    const unsafeHarness = createDriverHarness();
    unsafeHarness.connect.mockRejectedValue(new Error("unsafe extension detail"));
    const throwingHarness = createDriverHarness();
    throwingHarness.connect.mockRejectedValue(new Error("unsafe extension detail"));
    const unsafe = createClient({
      driverHarness: unsafeHarness,
      traceIdFactory: () => "/Users/test?token=unsafe",
    }).client;
    const throwing = createClient({
      driverHarness: throwingHarness,
      traceIdFactory: () => {
        throw new Error("unsafe trace generator detail");
      },
    }).client;

    for (const client of [unsafe, throwing]) {
      const error = await client.connect("portkey-discover-eoa").catch((reason) => reason);
      expect(error).toMatchObject({
        code: "WALLET_CLIENT_CONNECT_FAILED",
        traceId: "wallet-client-operation",
      });
      expect(JSON.stringify(error)).not.toMatch(/Users|token|unsafe/);
    }
  });

  it("closes drivers, subscriptions and controllers once and rejects use after close", async () => {
    const proofGate = deferred<unknown>();
    const driverHarness = createDriverHarness();
    driverHarness.signMessage.mockImplementation(async () => proofGate.promise);
    const { client } = createClient({ driverHarness });
    await client.connect("portkey-discover-eoa");
    const pendingProof = client.signMessage({ exactMessageBytes: new Uint8Array([1]) });

    const firstClose = client.close();
    const secondClose = client.close();
    expect((driverHarness.signMessage.mock.calls[0][0] as { signal: AbortSignal }).signal.aborted).toBe(true);
    proofGate.resolve({ signature: new Uint8Array([2]) });

    await expect(pendingProof).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
      traceId: "trace-wallet-adapter-test",
    });
    await Promise.all([firstClose, secondClose]);
    expect(driverHarness.unsubscribe).toHaveBeenCalledOnce();
    expect(driverHarness.disconnect).toHaveBeenCalledOnce();
    expect(driverHarness.close).toHaveBeenCalledOnce();

    await expect(client.connect("portkey-discover-eoa")).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
      traceId: "trace-wallet-adapter-test",
    });
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_CLOSED",
      traceId: "trace-wallet-adapter-test",
    });
  });

  it("binds default Discover encoding, proof projection and provider subscriptions safely", async () => {
    const adapterListeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const providerListeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const getSignature = vi.fn(async () => ({
      error: 0,
      errorMessage: "",
      extensionResult: { opaque: true },
      from: "discover",
      signature: packageSignature(11),
    }));
    const addListener = (
      listeners: Map<string, Set<(...args: unknown[]) => void>>,
      event: string,
      listener: (...args: unknown[]) => void,
    ) => {
      const eventListeners = listeners.get(event) ?? new Set();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    };
    const removeListener = vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      providerListeners.get(event)?.delete(listener);
    });
    const provider = {
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        addListener(providerListeners, event, listener);
      }),
      removeListener,
    };
    class FakeDiscoverWallet {
      getSignature = getSignature;

      async login() {
        return { address: requestedAddress, extraInfo: { provider } };
      }

      async logout() {}

      off(event: string, listener: (...args: unknown[]) => void) {
        adapterListeners.get(event)?.delete(listener);
      }

      on(event: string, listener: (...args: unknown[]) => void) {
        addListener(adapterListeners, event, listener);
      }
    }
    vi.doMock(packages.discover, () => ({ PortkeyDiscoverWallet: FakeDiscoverWallet }));
    const client = createAelfWebLoginWalletClient({
      adapterConfig: config([entry()]),
      bindings: createDefaultAelfWebLoginAdapterBindings({ discover: true, nightElf: false }),
      runtime,
      traceIdFactory: () => "trace-default-discover",
    });
    const listener = vi.fn();
    client.subscribeAccountAndChain(listener);

    await client.connect("portkey-discover-eoa");
    const proof = await client.signMessage({
      exactMessageBytes: new Uint8Array([0, 10, 20, 255]),
    });

    expect(getSignature).toHaveBeenCalledWith({
      address: requestedAddress,
      appName: "Campaign OS",
      hexToBeSign: "",
      signInfo: "000a14ff",
    });
    expect(proof).toEqual({
      signature: Uint8Array.from(
        packageSignature(11).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16)),
      ),
    });
    for (const providerListener of providerListeners.get("accountsChanged") ?? []) {
      providerListener({ AELF: [changedAddress] });
    }
    expect(listener).toHaveBeenCalledWith({
      type: "account_changed",
      walletAddressHint: changedAddress,
    });
    await expect(client.signMessage({ exactMessageBytes: new Uint8Array([1]) })).rejects.toMatchObject({
      code: "WALLET_CLIENT_NOT_CONNECTED",
      traceId: "trace-default-discover",
    });

    await client.close();
    expect(removeListener).toHaveBeenCalled();
    vi.doUnmock(packages.discover);
  });

  it("keeps default alpha packages lazy and unavailable until provider detection passes", async () => {
    const client = createAelfWebLoginWalletClient({
      adapterConfig: config([entry()]),
      bindings: createDefaultAelfWebLoginAdapterBindings(),
      runtime,
    });

    await expect(client.listAvailableWallets()).resolves.toEqual([
      {
        adapterId: "portkey-discover-eoa",
        enabled: false,
        label: "Portkey EOA",
        recommended: false,
        status: "unavailable",
      },
    ]);
    await expect(client.connect("portkey-discover-eoa")).rejects.toMatchObject({
      code: "WALLET_CLIENT_ADAPTER_UNAVAILABLE",
    });
  });

  it.each([
    ["missing globals", undefined],
    ["empty globals", Object.freeze({})],
    [
      "malformed globals",
      Object.freeze({
        NightElf: Object.freeze({ AElf: "not-a-constructor" }),
        Portkey: Object.freeze({ isPortkey: true, request: vi.fn() }),
      }),
    ],
    [
      "throwing globals",
      Object.defineProperties({}, {
        NightElf: { get: () => { throw new Error("unsafe NightElf getter"); } },
        Portkey: { get: () => { throw new Error("unsafe Portkey getter"); } },
      }),
    ],
  ])("composes deny-by-default browser availability for %s", async (_label, browserGlobal) => {
    const client = createDefaultAelfWebLoginBrowserWalletClient({
      adapterConfig: config([
        entry(),
        entry({
          adapterId: "nightelf",
          label: "NightElf",
          packageName: packages.nightElf,
          recommended: false,
        }),
      ]),
      browserGlobal,
      runtime,
      traceIdFactory: () => "trace-default-browser",
    });

    await expect(client.listAvailableWallets()).resolves.toEqual([
      {
        adapterId: "portkey-discover-eoa",
        enabled: false,
        label: "Portkey EOA",
        recommended: false,
        status: "unavailable",
      },
      {
        adapterId: "nightelf",
        enabled: false,
        label: "NightElf",
        recommended: false,
        status: "unavailable",
      },
    ]);
  });

  it("composes available default browser providers behind the internal WalletClient API", async () => {
    const browserGlobal = Object.freeze({
      NightElf: Object.freeze({ AElf: class FakeAElf {} }),
      Portkey: Object.freeze({
        isPortkey: true,
        on: vi.fn(),
        removeListener: vi.fn(),
        request: vi.fn(),
      }),
    });
    const client = createDefaultAelfWebLoginBrowserWalletClient({
      adapterConfig: config([
        entry(),
        entry({
          adapterId: "nightelf",
          label: "NightElf",
          packageName: packages.nightElf,
          recommended: false,
        }),
      ]),
      browserGlobal,
      runtime,
    });

    await expect(client.listAvailableWallets()).resolves.toEqual([
      {
        adapterId: "portkey-discover-eoa",
        enabled: true,
        label: "Portkey EOA",
        recommended: true,
        status: "available",
      },
      {
        adapterId: "nightelf",
        enabled: true,
        label: "NightElf",
        recommended: false,
        status: "available",
      },
    ]);
    expect(Object.keys(client).sort()).toEqual([
      "close",
      "connect",
      "disconnect",
      "listAvailableWallets",
      "signMessage",
      "subscribeAccountAndChain",
    ]);
  });

  it("keeps alpha imports inside the adapter and preserves exact package pins", () => {
    const sourceRoot = resolve(process.cwd(), "src");
    const adapterPath = resolve(sourceRoot, "wallet/aelfWebLoginWalletClient.ts");
    const alphaImport = /(?:from\s+|import\s*\()\s*["']@aelf-web-login\//;
    const importingFiles = collectSourceFiles(sourceRoot).filter((path) =>
      alphaImport.test(readFileSync(path, "utf8")));
    const providerGlobalAccess = /(?:globalThis|window)\s*(?:\.\s*(?:NightElf|Portkey)|\[\s*["'](?:NightElf|Portkey)["']\s*\])/;
    const providerAwareFiles = collectSourceFiles(sourceRoot).filter((path) =>
      providerGlobalAccess.test(readFileSync(path, "utf8")));
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };

    expect(importingFiles).toEqual([adapterPath]);
    expect(providerAwareFiles).toEqual([]);
    expect(packageJson.dependencies).toMatchObject({
      "@aelf-web-login/wallet-adapter-base": "0.4.0-alpha.21",
      "@aelf-web-login/wallet-adapter-night-elf": "0.4.0-alpha.21",
      "@aelf-web-login/wallet-adapter-portkey-discover": "0.4.0-alpha.21",
    });
  });
});
