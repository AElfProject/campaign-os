export type WalletClientAvailabilityStatus = "available" | "disabled" | "unavailable";

export type WalletClientErrorCode =
  | "WALLET_CLIENT_ADAPTER_NOT_FOUND"
  | "WALLET_CLIENT_ADAPTER_DISABLED"
  | "WALLET_CLIENT_ADAPTER_UNAVAILABLE"
  | "WALLET_CLIENT_ALREADY_CONNECTED"
  | "WALLET_CLIENT_NOT_CONNECTED"
  | "WALLET_CLIENT_CONNECT_FAILED"
  | "WALLET_CLIENT_SIGN_FAILED"
  | "WALLET_CLIENT_DISCONNECT_FAILED"
  | "WALLET_CLIENT_DISCONNECT_IN_PROGRESS"
  | "WALLET_CLIENT_INPUT_INVALID"
  | "WALLET_CLIENT_CLOSED";

export interface WalletClientAdapterAvailability {
  readonly adapterId: string;
  readonly enabled: boolean;
  readonly label: string;
  readonly recommended: boolean;
  readonly status: WalletClientAvailabilityStatus;
}

export interface RequestedWalletConnectionHint {
  readonly adapterId: string;
  readonly caHashHint?: string;
  readonly chainId: string;
  readonly network: "mainnet" | "testnet";
  readonly walletAddressHint: string;
}

export interface WalletClientProof {
  readonly adapterProof?: Readonly<Record<string, unknown>>;
  readonly publicKey?: Uint8Array;
  readonly signature: Uint8Array;
}

export interface WalletClientSignMessageInput {
  readonly exactMessageBytes: Uint8Array;
  readonly signal?: AbortSignal;
}

export type WalletClientEvent =
  | Readonly<{
    chainId: string;
    network: "mainnet" | "testnet";
    type: "chain_changed";
  }>
  | Readonly<{
    type: "disconnected";
  }>
  | Readonly<{
    type: "account_changed";
    walletAddressHint: string;
  }>;

export type WalletClientUnsubscribe = () => void;

export interface WalletClient {
  listAvailableWallets(): Promise<readonly WalletClientAdapterAvailability[]>;
  connect(adapterId: string, signal?: AbortSignal): Promise<RequestedWalletConnectionHint>;
  signMessage(input: WalletClientSignMessageInput): Promise<WalletClientProof>;
  subscribeAccountAndChain(listener: (event: WalletClientEvent) => void): WalletClientUnsubscribe;
  disconnect(): Promise<void>;
  close(): Promise<void>;
}

export class WalletClientError extends Error {
  readonly adapterId?: string;
  readonly code: WalletClientErrorCode;
  readonly traceId?: string;

  constructor(code: WalletClientErrorCode, options: { adapterId?: string; traceId?: string } = {}) {
    super("Wallet client operation is unavailable.");
    this.name = "WalletClientError";
    this.code = code;
    this.adapterId = safeIdentifier(options.adapterId, 64) ? options.adapterId : undefined;
    this.traceId = safeTraceId(options.traceId) ? options.traceId : undefined;
  }
}

export interface InMemoryWalletClientOptions {
  readonly adapters: readonly WalletClientAdapterAvailability[];
  readonly connect: (
    adapterId: string,
    signal?: AbortSignal,
  ) => Promise<RequestedWalletConnectionHint>;
  readonly disconnect?: () => Promise<void>;
  readonly generateProof: (input: Readonly<{
    adapterId: string;
    exactMessageBytes: Uint8Array;
    signal?: AbortSignal;
  }>) => Promise<WalletClientProof>;
}

export interface InMemoryWalletClientHarness {
  readonly client: WalletClient;
  readonly emit: (event: WalletClientEvent) => void;
}

const WALLET_CLIENT_MAX_ADAPTERS = 16;
const WALLET_CLIENT_ADAPTER_LABEL_MAX_LENGTH = 80;
const WALLET_CLIENT_ADAPTER_PROOF_MAX_DEPTH = 8;
const WALLET_CLIENT_ADAPTER_PROOF_MAX_ENTRIES = 256;
const WALLET_CLIENT_ADAPTER_PROOF_MAX_NODES = WALLET_CLIENT_ADAPTER_PROOF_MAX_ENTRIES + 1;
const WALLET_CLIENT_ADAPTER_PROOF_STRING_MAX_LENGTH = 65_536;
const WALLET_CLIENT_PROOF_BYTES_MAX = 262_144;
const WALLET_CLIENT_PUBLIC_KEY_BYTES_MAX = 4_096;

const safeIdentifier = (value: unknown, maximum = 128): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const safeTraceId = (value: unknown): value is string => safeIdentifier(value, 128);

const safeText = (value: unknown, maximum = 256): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && !/[\u0000-\u001f\u007f]/.test(value);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactDataFields = (
  value: Record<string, unknown>,
  fields: ReadonlySet<string>,
): boolean => {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === fields.size
    && ownKeys.every((key) => typeof key === "string" && fields.has(key))
    && [...fields].every((field) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      return descriptor?.enumerable === true && "value" in descriptor;
    });
};

const ownDataValue = (value: Record<string, unknown>, field: string): unknown =>
  Object.getOwnPropertyDescriptor(value, field)?.value;

const inputInvalid = (adapterId?: unknown): never => {
  throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID", {
    adapterId: safeIdentifier(adapterId, 64) ? adapterId : undefined,
  });
};

const throwIfAborted = (signal: AbortSignal | undefined, adapterId?: string): void => {
  if (signal?.aborted) {
    throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID", { adapterId });
  }
};

const availabilityFields = new Set(["adapterId", "enabled", "label", "recommended", "status"]);

const parseAvailability = (value: unknown): WalletClientAdapterAvailability => {
  if (!isPlainRecord(value) || !hasExactDataFields(value, availabilityFields)) {
    return inputInvalid();
  }

  const adapterId = ownDataValue(value, "adapterId");
  const enabled = ownDataValue(value, "enabled");
  const label = ownDataValue(value, "label");
  const recommended = ownDataValue(value, "recommended");
  const status = ownDataValue(value, "status");
  if (
    !safeIdentifier(adapterId, 64)
    || typeof enabled !== "boolean"
    || !safeText(label, WALLET_CLIENT_ADAPTER_LABEL_MAX_LENGTH)
    || typeof recommended !== "boolean"
    || (status !== "available" && status !== "disabled" && status !== "unavailable")
    || (enabled && status !== "available")
    || (!enabled && status === "available")
    || (recommended && !enabled)
  ) {
    return inputInvalid(adapterId);
  }

  return Object.freeze({ adapterId, enabled, label, recommended, status });
};

const cloneAvailability = (
  adapter: WalletClientAdapterAvailability,
): WalletClientAdapterAvailability => Object.freeze({ ...adapter });

const cloneConnectionHint = (
  hint: RequestedWalletConnectionHint,
): RequestedWalletConnectionHint => {
  if (
    !safeIdentifier(hint.adapterId)
    || !safeText(hint.chainId, 32)
    || !safeText(hint.walletAddressHint, 256)
    || (hint.network !== "mainnet" && hint.network !== "testnet")
    || (hint.caHashHint !== undefined && !safeText(hint.caHashHint, 256))
  ) {
    throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID", {
      adapterId: safeIdentifier(hint.adapterId) ? hint.adapterId : undefined,
    });
  }

  return Object.freeze({
    adapterId: hint.adapterId,
    ...(hint.caHashHint === undefined ? {} : { caHashHint: hint.caHashHint }),
    chainId: hint.chainId,
    network: hint.network,
    walletAddressHint: hint.walletAddressHint,
  });
};

interface WalletClientProofBudget {
  bytes: number;
  entries: number;
  nodes: number;
}

const consumeProofBytes = (
  budget: WalletClientProofBudget,
  byteLength: number,
  adapterId: string,
): void => {
  budget.bytes += byteLength;
  if (budget.bytes > WALLET_CLIENT_PROOF_BYTES_MAX) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }
};

const consumeAdapterProofEntries = (
  budget: WalletClientProofBudget,
  count: number,
  adapterId: string,
): void => {
  budget.entries += count;
  if (budget.entries > WALLET_CLIENT_ADAPTER_PROOF_MAX_ENTRIES) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }
};

const consumeAdapterProofNode = (
  budget: WalletClientProofBudget,
  adapterId: string,
): void => {
  budget.nodes += 1;
  if (budget.nodes > WALLET_CLIENT_ADAPTER_PROOF_MAX_NODES) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }
};

const cloneAdapterProofValue = (
  value: unknown,
  adapterId: string,
  budget: WalletClientProofBudget,
  depth = 0,
  ancestors = new Set<object>(),
): unknown => {
  if (depth > WALLET_CLIENT_ADAPTER_PROOF_MAX_DEPTH) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }
  consumeAdapterProofNode(budget, adapterId);

  if (
    value === null
    || value === undefined
    || typeof value === "boolean"
    || typeof value === "bigint"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
    }

    return value;
  }

  if (typeof value === "string") {
    if (value.length > WALLET_CLIENT_ADAPTER_PROOF_STRING_MAX_LENGTH) {
      throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
    }

    consumeProofBytes(budget, new TextEncoder().encode(value).byteLength, adapterId);
    return value;
  }

  if (value instanceof Uint8Array) {
    consumeProofBytes(budget, value.byteLength, adapterId);
    return new Uint8Array(value);
  }

  if (typeof value !== "object" || ancestors.has(value)) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      consumeAdapterProofEntries(budget, value.length, adapterId);

      return Object.freeze(value.map((entry) =>
        cloneAdapterProofValue(entry, adapterId, budget, depth + 1, ancestors)));
    }

    if (!isPlainRecord(value)) {
      throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
    }

    const keys = Reflect.ownKeys(value);
    if (
      keys.length > WALLET_CLIENT_ADAPTER_PROOF_MAX_ENTRIES
      || keys.some((key) => typeof key !== "string" || key.length > 128)
    ) {
      throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
    }
    consumeAdapterProofEntries(budget, keys.length, adapterId);

    const cloned: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
      }

      Object.defineProperty(cloned, key, {
        enumerable: true,
        value: cloneAdapterProofValue(descriptor.value, adapterId, budget, depth + 1, ancestors),
      });
    }

    return Object.freeze(cloned);
  } finally {
    ancestors.delete(value);
  }
};

const proofFields = new Set(["adapterProof", "publicKey", "signature"]);

const cloneProof = (proof: unknown, adapterId: string): WalletClientProof => {
  if (!isPlainRecord(proof)) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }

  const keys = Reflect.ownKeys(proof);
  if (
    keys.some((key) => typeof key !== "string" || !proofFields.has(key))
    || !Object.prototype.hasOwnProperty.call(proof, "signature")
  ) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }

  const signature = ownDataValue(proof, "signature");
  const publicKey = ownDataValue(proof, "publicKey");
  const adapterProof = ownDataValue(proof, "adapterProof");
  if (
    !(signature instanceof Uint8Array)
    || signature.byteLength === 0
    || signature.byteLength > WALLET_CLIENT_PROOF_BYTES_MAX
    || (publicKey !== undefined && (
      !(publicKey instanceof Uint8Array)
      || publicKey.byteLength === 0
      || publicKey.byteLength > WALLET_CLIENT_PUBLIC_KEY_BYTES_MAX
    ))
    || (adapterProof !== undefined && !isPlainRecord(adapterProof))
  ) {
    throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
  }

  const budget: WalletClientProofBudget = { bytes: 0, entries: 0, nodes: 0 };
  consumeProofBytes(budget, signature.byteLength, adapterId);
  if (publicKey !== undefined) {
    consumeProofBytes(budget, publicKey.byteLength, adapterId);
  }

  return Object.freeze({
    ...(adapterProof === undefined
      ? {}
      : {
        adapterProof: cloneAdapterProofValue(
          adapterProof,
          adapterId,
          budget,
        ) as Readonly<Record<string, unknown>>,
      }),
    ...(publicKey === undefined
      ? {}
      : { publicKey: new Uint8Array(publicKey) }),
    signature: new Uint8Array(signature),
  });
};

const disconnectedEventFields = new Set(["type"]);
const accountChangedEventFields = new Set(["type", "walletAddressHint"]);
const chainChangedEventFields = new Set(["chainId", "network", "type"]);

const cloneEvent = (event: unknown): WalletClientEvent => {
  if (!isPlainRecord(event)) {
    return inputInvalid();
  }

  const type = ownDataValue(event, "type");
  if (type === "disconnected" && hasExactDataFields(event, disconnectedEventFields)) {
    return Object.freeze({ type });
  }

  if (type === "account_changed" && hasExactDataFields(event, accountChangedEventFields)) {
    const walletAddressHint = ownDataValue(event, "walletAddressHint");
    if (!safeIdentifier(walletAddressHint, 256)) {
      return inputInvalid();
    }

    return Object.freeze({ type, walletAddressHint });
  }

  if (type === "chain_changed" && hasExactDataFields(event, chainChangedEventFields)) {
    const chainId = ownDataValue(event, "chainId");
    const network = ownDataValue(event, "network");
    if (
      !safeIdentifier(chainId, 32)
      || (network !== "mainnet" && network !== "testnet")
    ) {
      return inputInvalid();
    }

    return Object.freeze({ chainId, network, type });
  }

  return inputInvalid();
};

// This dependency-injected harness exercises the port without static wallet key material.
export const createInMemoryWalletClient = (
  options: InMemoryWalletClientOptions,
): InMemoryWalletClientHarness => {
  if (!Array.isArray(options.adapters) || options.adapters.length > WALLET_CLIENT_MAX_ADAPTERS) {
    return inputInvalid();
  }

  const adapters = options.adapters.map(parseAvailability);
  if (
    new Set(adapters.map(({ adapterId }) => adapterId)).size !== adapters.length
    || adapters.filter(({ recommended }) => recommended).length > 1
  ) {
    return inputInvalid();
  }
  const adapterById = new Map(adapters.map((adapter) => [adapter.adapterId, adapter]));
  const listeners = new Set<(event: WalletClientEvent) => void>();
  let closed = false;
  let closeInFlight: Promise<void> | undefined;
  let connectedAdapterId: string | undefined;
  let disconnectInFlight: Promise<void> | undefined;
  let disconnected = false;
  let pendingConnection: Promise<RequestedWalletConnectionHint> | undefined;

  const disconnectOnce = (): Promise<void> => {
    if (disconnectInFlight) {
      return disconnectInFlight;
    }

    if (disconnected) {
      return Promise.resolve();
    }

    const connection = pendingConnection;
    const operation = (async () => {
      await connection?.catch(() => undefined);
      disconnected = true;
      connectedAdapterId = undefined;

      try {
        await options.disconnect?.();
      } catch {
        throw new WalletClientError("WALLET_CLIENT_DISCONNECT_FAILED");
      }
    })();
    disconnectInFlight = operation;
    void operation.then(
      () => {
        if (disconnectInFlight === operation) {
          disconnectInFlight = undefined;
        }
      },
      () => {
        if (disconnectInFlight === operation) {
          disconnectInFlight = undefined;
        }
      },
    );

    return operation;
  };

  const requireOpen = (adapterId?: string) => {
    if (closed) {
      throw new WalletClientError("WALLET_CLIENT_CLOSED", { adapterId });
    }
  };

  const client: WalletClient = {
    async listAvailableWallets() {
      requireOpen();
      return Object.freeze(adapters.map(cloneAvailability));
    },

    async connect(adapterId, signal) {
      requireOpen(adapterId);
      throwIfAborted(signal, adapterId);

      if (!safeIdentifier(adapterId)) {
        throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
      }

      if (disconnectInFlight) {
        throw new WalletClientError("WALLET_CLIENT_DISCONNECT_IN_PROGRESS", { adapterId });
      }

      const adapter = adapterById.get(adapterId);

      if (!adapter) {
        throw new WalletClientError("WALLET_CLIENT_ADAPTER_NOT_FOUND", { adapterId });
      }

      if (!adapter.enabled || adapter.status !== "available") {
        throw new WalletClientError(
          adapter.status === "unavailable"
            ? "WALLET_CLIENT_ADAPTER_UNAVAILABLE"
            : "WALLET_CLIENT_ADAPTER_DISABLED",
          { adapterId },
        );
      }

      if (connectedAdapterId || pendingConnection) {
        throw new WalletClientError("WALLET_CLIENT_ALREADY_CONNECTED", { adapterId });
      }

      const connection = (async () => {
        const hint = cloneConnectionHint(await options.connect(adapterId, signal));

        if (hint.adapterId !== adapterId) {
          throw new WalletClientError("WALLET_CLIENT_CONNECT_FAILED", { adapterId });
        }
        if (closed) {
          throw new WalletClientError("WALLET_CLIENT_CLOSED", { adapterId });
        }

        connectedAdapterId = adapterId;
        disconnected = false;
        return hint;
      })();
      pendingConnection = connection;

      try {
        return await connection;
      } catch (error) {
        if (error instanceof WalletClientError) {
          throw error;
        }

        throw new WalletClientError("WALLET_CLIENT_CONNECT_FAILED", { adapterId });
      } finally {
        if (pendingConnection === connection) {
          pendingConnection = undefined;
        }
      }
    },

    async signMessage({ exactMessageBytes, signal }) {
      requireOpen(connectedAdapterId);
      throwIfAborted(signal, connectedAdapterId);

      if (!connectedAdapterId) {
        throw new WalletClientError("WALLET_CLIENT_NOT_CONNECTED");
      }

      if (!(exactMessageBytes instanceof Uint8Array) || exactMessageBytes.byteLength === 0) {
        throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID", {
          adapterId: connectedAdapterId,
        });
      }

      const adapterId = connectedAdapterId;
      const messageCopy = new Uint8Array(exactMessageBytes);

      try {
        return cloneProof(await options.generateProof({
          adapterId,
          exactMessageBytes: messageCopy,
          signal,
        }), adapterId);
      } catch (error) {
        if (error instanceof WalletClientError) {
          throw error;
        }

        throw new WalletClientError("WALLET_CLIENT_SIGN_FAILED", { adapterId });
      }
    },

    subscribeAccountAndChain(listener) {
      requireOpen(connectedAdapterId);
      if (typeof listener !== "function") {
        return inputInvalid(connectedAdapterId);
      }

      listeners.add(listener);
      let subscribed = true;

      return () => {
        if (!subscribed) {
          return;
        }

        subscribed = false;
        listeners.delete(listener);
      };
    },

    disconnect() {
      requireOpen(connectedAdapterId);
      return disconnectOnce();
    },

    async close() {
      if (closed) {
        await closeInFlight;
        return;
      }

      closed = true;
      listeners.clear();
      const connection = pendingConnection;
      const closeOperation = (async () => {
        try {
          await connection?.catch(() => undefined);
          await disconnectOnce();
        } finally {
          connectedAdapterId = undefined;
          listeners.clear();
        }
      })();
      closeInFlight = closeOperation;

      try {
        await closeOperation;
      } finally {
        if (closeInFlight === closeOperation) {
          closeInFlight = undefined;
        }
      }
    },
  };

  return Object.freeze({
    client: Object.freeze(client),
    emit: (event: WalletClientEvent) => {
      if (closed) {
        return;
      }

      const copiedEvent = cloneEvent(event);
      for (const listener of [...listeners]) {
        listener(copiedEvent);
      }
    },
  });
};
