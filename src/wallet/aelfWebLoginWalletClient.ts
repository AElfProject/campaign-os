import type {
  BrowserWalletAdapterConfigEntry,
  WalletAdapterConfig,
} from "./walletAdapterConfig";
import {
  WalletClientError,
  type RequestedWalletConnectionHint,
  type WalletClient,
  type WalletClientErrorCode,
  type WalletClientEvent,
  type WalletClientProof,
  type WalletClientSignMessageInput,
  type WalletClientUnsubscribe,
} from "./walletClient";

const DEFAULT_TRACE_ID = "wallet-client-operation";
const DEFAULT_ALPHA_TRACE_ID = "aelf-web-login-wallet-client";
const MAX_ADAPTERS = 16;
const MAX_PACKAGE_NAME_LENGTH = 160;
const MAX_TEXT_LENGTH = 256;
const MAX_MESSAGE_BYTES = 65_536;
const MAX_PROOF_BYTES = 262_144;
const MAX_PUBLIC_KEY_BYTES = 4_096;
const MAX_PROOF_DEPTH = 8;
const MAX_PROOF_ENTRIES = 256;
const MAX_PROOF_NODES = MAX_PROOF_ENTRIES + 1;
const MAX_PROOF_STRING_LENGTH = 65_536;
const OPERATION_TIMEOUT_MS = 30_000;
const supportedChainIds = new Set(["AELF", "tDVV", "tDVW"]);
const textEncoder = new TextEncoder();

const discoverPackageName = "@aelf-web-login/wallet-adapter-portkey-discover";
const nightElfPackageName = "@aelf-web-login/wallet-adapter-night-elf";

export type AelfWebLoginAccountType = "AA" | "EOA";

export interface AelfWebLoginRuntimeConfig {
  readonly appName: string;
  readonly chainId: string;
  readonly network: "mainnet" | "testnet";
  readonly rpcUrl?: string;
}

export interface AelfWebLoginAdapterRuntimeConfig {
  readonly appName: string;
  readonly chainId: string;
  readonly factoryConfig: Readonly<Record<string, unknown>>;
  readonly network: "mainnet" | "testnet";
}

export interface AelfWebLoginAdapterFactoryContext {
  readonly adapterId: string;
  readonly factoryConfig: Readonly<Record<string, unknown>>;
  readonly packageName: string;
}

export interface AelfWebLoginAdapterProjectionContext {
  readonly adapterId: string;
  readonly accountType: AelfWebLoginAccountType;
  readonly runtime: AelfWebLoginAdapterRuntimeConfig;
}

export interface AelfWebLoginAdapterFactoryRegistration {
  readonly accountType: AelfWebLoginAccountType;
  readonly approved: boolean;
  readonly create: (
    context: AelfWebLoginAdapterFactoryContext,
  ) => unknown | Promise<unknown>;
  readonly messageEncoding: "hex" | "utf8";
  readonly packageName: string;
  readonly projectConnection?: (
    packageWallet: unknown,
    context: AelfWebLoginAdapterProjectionContext,
  ) => unknown;
  readonly projectProof?: (
    packageProof: unknown,
    context: AelfWebLoginAdapterProjectionContext,
  ) => unknown;
  readonly providerAvailable: boolean;
}

export interface AelfWebLoginAdapterFactoryRegistry {
  get(packageName: string): AelfWebLoginAdapterFactoryRegistration | undefined;
}

export type AelfWebLoginWalletClientDiagnosticCode =
  | "AELF_WEB_LOGIN_ADAPTER_CONSTRUCTION_FAILED"
  | "AELF_WEB_LOGIN_ADAPTER_EVENT_INVALID"
  | "AELF_WEB_LOGIN_ADAPTER_FACTORY_MISSING"
  | "AELF_WEB_LOGIN_ADAPTER_NOT_APPROVED"
  | "AELF_WEB_LOGIN_ADAPTER_RUNTIME_CONFIG_INVALID"
  | "AELF_WEB_LOGIN_CONNECT_FAILED"
  | "AELF_WEB_LOGIN_DISCONNECT_FAILED"
  | "AELF_WEB_LOGIN_SIGN_FAILED";

export interface AelfWebLoginWalletClientDiagnostic {
  readonly adapterId?: string;
  readonly code: AelfWebLoginWalletClientDiagnosticCode;
  readonly operation: "availability" | "connect" | "disconnect" | "event" | "sign";
  readonly severity: "error";
  readonly traceId: string;
}

export interface AelfWebLoginAdapterConnectInput {
  readonly runtime: AelfWebLoginRuntimeConfig;
  readonly signal: AbortSignal;
}

export interface AelfWebLoginAdapterSignInput {
  readonly exactMessageBytes: Uint8Array;
  readonly signal: AbortSignal;
}

export interface AelfWebLoginAdapterDriver {
  close(): Promise<void>;
  connect(input: AelfWebLoginAdapterConnectInput): Promise<unknown>;
  disconnect(): Promise<void>;
  signMessage(input: AelfWebLoginAdapterSignInput): Promise<unknown>;
  subscribe(listener: (event: unknown) => void): WalletClientUnsubscribe;
}

export interface AelfWebLoginAdapterBinding {
  readonly accountType: AelfWebLoginAccountType;
  readonly approved: boolean;
  readonly createDriver: (
    runtime: AelfWebLoginRuntimeConfig,
    adapterId?: string,
  ) => AelfWebLoginAdapterDriver;
  readonly packageName: string;
  readonly providerAvailable: boolean;
}

export interface CreateAelfWebLoginWalletClientOptions {
  readonly adapterConfig: WalletAdapterConfig;
  readonly bindings: readonly AelfWebLoginAdapterBinding[];
  readonly runtime: AelfWebLoginRuntimeConfig;
  readonly traceIdFactory?: () => string;
}

export interface CreateRegisteredAelfWebLoginWalletClientOptions {
  readonly config: WalletAdapterConfig;
  readonly onDiagnostic?: (diagnostic: AelfWebLoginWalletClientDiagnostic) => void;
  readonly registry: AelfWebLoginAdapterFactoryRegistry;
  readonly runtimeByAdapterId: Readonly<Record<string, AelfWebLoginAdapterRuntimeConfig>>;
  readonly traceId?: string;
}

interface NormalizedClientOptions {
  readonly adapterConfig: WalletAdapterConfig;
  readonly bindings: readonly AelfWebLoginAdapterBinding[];
  readonly onDiagnostic?: (diagnostic: AelfWebLoginWalletClientDiagnostic) => void;
  readonly runtimeByAdapterId: Readonly<Record<string, AelfWebLoginRuntimeConfig>>;
  readonly traceIdFactory?: () => string;
}

interface DriverResource {
  readonly driver: AelfWebLoginAdapterDriver;
  closePromise?: Promise<void>;
  disconnectPromise?: Promise<void>;
  unsubscribed: boolean;
  unsubscribe?: WalletClientUnsubscribe;
}

interface SignOperation {
  abortCode: WalletClientErrorCode;
  readonly controller: AbortController;
  readonly rawPromise: Promise<unknown>;
}

interface ConnectedHandle {
  readonly accountType: AelfWebLoginAccountType;
  readonly adapterId: string;
  readonly resource: DriverResource;
  chainId: string;
  network: "mainnet" | "testnet";
  signOperation?: SignOperation;
  walletAddressHint: string;
}

interface PendingConnect {
  readonly adapterId: string;
  abortCode: WalletClientErrorCode;
  cleanupPromise?: Promise<void>;
  readonly controller: AbortController;
  readonly publicPromise: Promise<RequestedWalletConnectionHint>;
  readonly rawPromise: Promise<unknown>;
  readonly resource: DriverResource;
  readonly traceId: string;
}

interface ProofBudget {
  bytes: number;
  entries: number;
  nodes: number;
}

interface InternalAlphaAdapter {
  readonly close?: () => unknown | Promise<unknown>;
  readonly getSignature: (params: Readonly<{
    address: string;
    appName: string;
    hexToBeSign: string;
    signInfo: string;
  }>) => unknown | Promise<unknown>;
  readonly login: () => unknown | Promise<unknown>;
  readonly logout: () => unknown | Promise<unknown>;
  readonly off: (event: string, listener: (...args: unknown[]) => void) => void;
  readonly on: (event: string, listener: (...args: unknown[]) => void) => void;
}

const safeIdentifier = (value: unknown, maximum = 128): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const safeText = (value: unknown, maximum = MAX_TEXT_LENGTH): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && !/[\u0000-\u001f\u007f]/.test(value);

const safePackageName = (value: unknown): value is string =>
  safeText(value, MAX_PACKAGE_NAME_LENGTH);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const ownDataValue = (record: object, field: string): unknown => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(record, field);
    return descriptor?.enumerable === true && "value" in descriptor
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
};

const exactDataFields = (record: object, fields: ReadonlySet<string>): boolean => {
  try {
    const keys = Reflect.ownKeys(record);
    return keys.length === fields.size
      && keys.every((key) => typeof key === "string" && fields.has(key))
      && [...fields].every((field) => {
        const descriptor = Object.getOwnPropertyDescriptor(record, field);
        return descriptor?.enumerable === true && "value" in descriptor;
      });
  } catch {
    return false;
  }
};

const walletError = (
  code: WalletClientErrorCode,
  traceId: string,
  adapterId?: string,
): WalletClientError => new WalletClientError(code, { adapterId, traceId });

const nextTraceId = (factory: (() => string) | undefined): string => {
  try {
    const candidate = factory?.();
    return safeIdentifier(candidate, 128) ? candidate : DEFAULT_TRACE_ID;
  } catch {
    return DEFAULT_TRACE_ID;
  }
};

const validRuntime = (runtime: unknown): runtime is AelfWebLoginRuntimeConfig => {
  if (!isPlainRecord(runtime)) {
    return false;
  }
  const appName = ownDataValue(runtime, "appName");
  const chainId = ownDataValue(runtime, "chainId");
  const network = ownDataValue(runtime, "network");
  const rpcUrl = ownDataValue(runtime, "rpcUrl");
  if (
    !safeText(appName, 80)
    || !safeText(chainId, 32)
    || !supportedChainIds.has(chainId)
    || (network !== "mainnet" && network !== "testnet")
    || (rpcUrl !== undefined && !safeText(rpcUrl, 2_048))
  ) {
    return false;
  }
  if (rpcUrl === undefined) {
    return true;
  }
  try {
    const parsedUrl = new URL(rpcUrl);
    return (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:")
      && !parsedUrl.username
      && !parsedUrl.password;
  } catch {
    return false;
  }
};

const validFactoryConfig = (value: unknown): value is Readonly<Record<string, unknown>> => {
  if (!isPlainRecord(value)) {
    return false;
  }
  try {
    const keys = Reflect.ownKeys(value);
    return keys.length <= 64 && keys.every((key) => {
      if (typeof key !== "string" || key.length === 0 || key.length > 128) {
        return false;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor?.enumerable === true && "value" in descriptor;
    });
  } catch {
    return false;
  }
};

const validAdapterRuntime = (value: unknown): value is AelfWebLoginAdapterRuntimeConfig =>
  isPlainRecord(value)
  && safeText(value.appName, 80)
  && safeText(value.chainId, 32)
  && (value.network === "mainnet" || value.network === "testnet")
  && validFactoryConfig(value.factoryConfig);

const validRegistration = (value: unknown): value is AelfWebLoginAdapterFactoryRegistration =>
  isPlainRecord(value)
  && (value.accountType === "AA" || value.accountType === "EOA")
  && typeof value.approved === "boolean"
  && typeof value.create === "function"
  && (value.messageEncoding === "hex" || value.messageEncoding === "utf8")
  && safePackageName(value.packageName)
  && (value.projectConnection === undefined || typeof value.projectConnection === "function")
  && (value.projectProof === undefined || typeof value.projectProof === "function")
  && typeof value.providerAvailable === "boolean";

export const createAelfWebLoginAdapterFactoryRegistry = (
  registrations: readonly AelfWebLoginAdapterFactoryRegistration[],
): AelfWebLoginAdapterFactoryRegistry => {
  if (!Array.isArray(registrations) || registrations.length > MAX_ADAPTERS) {
    throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
  }
  const byPackageName = new Map<string, AelfWebLoginAdapterFactoryRegistration>();
  for (const registration of registrations) {
    if (!validRegistration(registration) || byPackageName.has(registration.packageName)) {
      throw new WalletClientError("WALLET_CLIENT_INPUT_INVALID");
    }
    byPackageName.set(registration.packageName, Object.freeze({ ...registration }));
  }
  return Object.freeze({
    get(packageName: string) {
      return byPackageName.get(packageName);
    },
  });
};

const validBinding = (binding: unknown): binding is AelfWebLoginAdapterBinding =>
  isPlainRecord(binding)
  && (binding.accountType === "AA" || binding.accountType === "EOA")
  && typeof binding.approved === "boolean"
  && typeof binding.providerAvailable === "boolean"
  && typeof binding.createDriver === "function"
  && safePackageName(binding.packageName);

const method = (value: object, name: string): ((...args: unknown[]) => unknown) | undefined => {
  try {
    const candidate = Reflect.get(value, name) as unknown;
    return typeof candidate === "function"
      ? candidate as (...args: unknown[]) => unknown
      : undefined;
  } catch {
    return undefined;
  }
};

const normalizeDriver = (value: unknown): AelfWebLoginAdapterDriver | undefined => {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return undefined;
  }
  const close = method(value, "close");
  const connect = method(value, "connect");
  const disconnect = method(value, "disconnect");
  const signMessage = method(value, "signMessage");
  const subscribe = method(value, "subscribe");
  if (!close || !connect || !disconnect || !signMessage || !subscribe) {
    return undefined;
  }
  return Object.freeze({
    close: () => Promise.resolve(Reflect.apply(close, value, [])) as Promise<void>,
    connect: (input: AelfWebLoginAdapterConnectInput) =>
      Promise.resolve(Reflect.apply(connect, value, [input])),
    disconnect: () => Promise.resolve(Reflect.apply(disconnect, value, [])) as Promise<void>,
    signMessage: (input: AelfWebLoginAdapterSignInput) =>
      Promise.resolve(Reflect.apply(signMessage, value, [input])),
    subscribe: (listener: (event: unknown) => void) =>
      Reflect.apply(subscribe, value, [listener]) as WalletClientUnsubscribe,
  });
};

const validateBoundedValue = (
  value: unknown,
  budget: ProofBudget,
  depth = 0,
  ancestors = new Set<object>(),
): boolean => {
  if (depth > MAX_PROOF_DEPTH) {
    return false;
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_PROOF_NODES) {
    return false;
  }
  if (value === null || value === undefined || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    if (value.length > MAX_PROOF_STRING_LENGTH) {
      return false;
    }
    budget.bytes += textEncoder.encode(value).byteLength;
    return budget.bytes <= MAX_PROOF_BYTES;
  }
  if (value instanceof Uint8Array) {
    budget.bytes += value.byteLength;
    return budget.bytes <= MAX_PROOF_BYTES;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      budget.entries += value.length;
      return budget.entries <= MAX_PROOF_ENTRIES
        && value.every((entry) => validateBoundedValue(
          entry,
          budget,
          depth + 1,
          ancestors,
        ));
    }
    if (!isPlainRecord(value)) {
      return false;
    }
    const keys = Reflect.ownKeys(value);
    budget.entries += keys.length;
    if (
      budget.entries > MAX_PROOF_ENTRIES
      || keys.some((key) => typeof key !== "string" || key.length === 0 || key.length > 128)
    ) {
      return false;
    }
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return false;
      }
      budget.bytes += textEncoder.encode(key).byteLength;
      if (
        budget.bytes > MAX_PROOF_BYTES
        || !validateBoundedValue(descriptor.value, budget, depth + 1, ancestors)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    ancestors.delete(value);
  }
};

const cloneProofValue = (
  value: unknown,
  budget: ProofBudget,
  traceId: string,
  adapterId: string,
  depth = 0,
  ancestors = new Set<object>(),
): unknown => {
  const fail = (): never => {
    throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, adapterId);
  };
  if (depth > MAX_PROOF_DEPTH) {
    return fail();
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_PROOF_NODES) {
    return fail();
  }
  if (value === null || value === undefined || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fail();
  }
  if (typeof value === "string") {
    if (value.length > MAX_PROOF_STRING_LENGTH) {
      return fail();
    }
    budget.bytes += textEncoder.encode(value).byteLength;
    return budget.bytes <= MAX_PROOF_BYTES ? value : fail();
  }
  if (value instanceof Uint8Array) {
    budget.bytes += value.byteLength;
    return budget.bytes <= MAX_PROOF_BYTES ? new Uint8Array(value) : fail();
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return fail();
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      budget.entries += value.length;
      if (budget.entries > MAX_PROOF_ENTRIES) {
        return fail();
      }
      return Object.freeze(value.map((entry) => cloneProofValue(
        entry,
        budget,
        traceId,
        adapterId,
        depth + 1,
        ancestors,
      )));
    }
    if (!isPlainRecord(value)) {
      return fail();
    }
    const keys = Reflect.ownKeys(value);
    budget.entries += keys.length;
    if (
      budget.entries > MAX_PROOF_ENTRIES
      || keys.some((key) => typeof key !== "string" || key.length === 0 || key.length > 128)
    ) {
      return fail();
    }
    const clone: Record<string, unknown> = {};
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        return fail();
      }
      budget.bytes += textEncoder.encode(key).byteLength;
      if (budget.bytes > MAX_PROOF_BYTES) {
        return fail();
      }
      Object.defineProperty(clone, key, {
        enumerable: true,
        value: cloneProofValue(
          descriptor.value,
          budget,
          traceId,
          adapterId,
          depth + 1,
          ancestors,
        ),
      });
    }
    return Object.freeze(clone);
  } catch (error) {
    if (error instanceof WalletClientError) {
      throw error;
    }
    return fail();
  } finally {
    ancestors.delete(value);
  }
};

const projectProof = (
  raw: unknown,
  traceId: string,
  adapterId: string,
): WalletClientProof => {
  if (
    !isPlainRecord(raw)
    || !validateBoundedValue(raw, { bytes: 0, entries: 0, nodes: 0 })
  ) {
    throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, adapterId);
  }
  const signature = ownDataValue(raw, "signature");
  const publicKey = ownDataValue(raw, "publicKey");
  const adapterProof = ownDataValue(raw, "adapterProof");
  if (
    !(signature instanceof Uint8Array)
    || signature.byteLength === 0
    || signature.byteLength > MAX_PROOF_BYTES
    || (publicKey !== undefined && (
      !(publicKey instanceof Uint8Array)
      || publicKey.byteLength === 0
      || publicKey.byteLength > MAX_PUBLIC_KEY_BYTES
    ))
    || (adapterProof !== undefined && !isPlainRecord(adapterProof))
  ) {
    throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, adapterId);
  }
  const budget: ProofBudget = { bytes: signature.byteLength, entries: 0, nodes: 0 };
  if (publicKey) {
    budget.bytes += publicKey.byteLength;
  }
  if (budget.bytes > MAX_PROOF_BYTES) {
    throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, adapterId);
  }
  return Object.freeze({
    ...(adapterProof === undefined
      ? {}
      : {
        adapterProof: cloneProofValue(
          adapterProof,
          budget,
          traceId,
          adapterId,
        ) as Readonly<Record<string, unknown>>,
      }),
    ...(publicKey === undefined ? {} : { publicKey: new Uint8Array(publicKey) }),
    signature: new Uint8Array(signature),
  });
};

const connectOutputFields = new Set([
  "accountType",
  "caHashHint",
  "chainId",
  "network",
  "walletAddressHint",
]);

const projectConnection = ({
  adapterId,
  binding,
  raw,
  runtime,
  traceId,
}: {
  readonly adapterId: string;
  readonly binding: AelfWebLoginAdapterBinding;
  readonly raw: unknown;
  readonly runtime: AelfWebLoginRuntimeConfig;
  readonly traceId: string;
}): RequestedWalletConnectionHint => {
  if (
    !isPlainRecord(raw)
    || !validateBoundedValue(raw, { bytes: 0, entries: 0, nodes: 0 })
  ) {
    throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
  }
  const accountType = ownDataValue(raw, "accountType");
  const caHashHint = ownDataValue(raw, "caHashHint");
  const chainId = ownDataValue(raw, "chainId");
  const network = ownDataValue(raw, "network");
  const walletAddressHint = ownDataValue(raw, "walletAddressHint");
  if (
    (accountType !== "AA" && accountType !== "EOA")
    || accountType !== binding.accountType
    || !safeText(chainId, 32)
    || !supportedChainIds.has(chainId)
    || chainId !== runtime.chainId
    || (network !== "mainnet" && network !== "testnet")
    || network !== runtime.network
    || !safeText(walletAddressHint)
    || (accountType === "AA" && !safeText(caHashHint))
    || (accountType === "EOA" && caHashHint !== undefined)
  ) {
    throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
  }
  for (const field of connectOutputFields) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, field);
    if (descriptor && (!descriptor.enumerable || !("value" in descriptor))) {
      throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
    }
  }
  const boundedCaHashHint = accountType === "AA" ? caHashHint as string : undefined;
  return Object.freeze({
    adapterId,
    ...(boundedCaHashHint === undefined ? {} : { caHashHint: boundedCaHashHint }),
    chainId,
    network,
    walletAddressHint,
  });
};

const raceOperation = <T>({
  controller,
  error,
  onTimeout,
  rawPromise,
}: {
  readonly controller: AbortController;
  readonly error: () => WalletClientError;
  readonly onTimeout: () => void;
  readonly rawPromise: Promise<T>;
}): Promise<T> => new Promise<T>((resolve, reject) => {
  let settled = false;
  const finish = (callback: () => void): void => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeout);
    controller.signal.removeEventListener("abort", onAbort);
    callback();
  };
  const onAbort = () => finish(() => reject(error()));
  const timeout = setTimeout(() => {
    onTimeout();
    controller.abort();
  }, OPERATION_TIMEOUT_MS);
  if (controller.signal.aborted) {
    finish(() => reject(error()));
    return;
  }
  controller.signal.addEventListener("abort", onAbort, { once: true });
  void rawPromise.then(
    (value) => finish(() => resolve(value)),
    (reason: unknown) => finish(() => reject(reason)),
  );
});

const unsubscribeResource = (resource: DriverResource): void => {
  if (resource.unsubscribed) {
    return;
  }
  resource.unsubscribed = true;
  try {
    resource.unsubscribe?.();
  } catch {
    // Package unsubscribe failures cannot restore an invalidated connection.
  }
};

const disconnectResource = (
  resource: DriverResource,
  traceId: string,
  adapterId: string,
): Promise<void> => {
  unsubscribeResource(resource);
  if (resource.disconnectPromise) {
    return resource.disconnectPromise;
  }
  try {
    resource.disconnectPromise = Promise.resolve(resource.driver.disconnect()).catch(() => {
      throw walletError("WALLET_CLIENT_DISCONNECT_FAILED", traceId, adapterId);
    });
  } catch {
    resource.disconnectPromise = Promise.reject(
      walletError("WALLET_CLIENT_DISCONNECT_FAILED", traceId, adapterId),
    );
  }
  return resource.disconnectPromise;
};

const closeResource = (
  resource: DriverResource,
  traceId: string,
  adapterId: string,
): Promise<void> => {
  unsubscribeResource(resource);
  if (resource.closePromise) {
    return resource.closePromise;
  }
  const disconnectPromise = disconnectResource(resource, traceId, adapterId);
  resource.closePromise = (async () => {
    let disconnectFailure: unknown;
    try {
      await disconnectPromise;
    } catch (error) {
      disconnectFailure = error;
    }
    try {
      await resource.driver.close();
    } catch {
      if (!disconnectFailure) {
        disconnectFailure = walletError("WALLET_CLIENT_DISCONNECT_FAILED", traceId, adapterId);
      }
    }
    if (disconnectFailure) {
      throw disconnectFailure;
    }
  })();
  return resource.closePromise;
};

const availabilityFor = (
  entry: BrowserWalletAdapterConfigEntry,
  config: WalletAdapterConfig,
  binding: AelfWebLoginAdapterBinding | undefined,
) => {
  let status: "available" | "disabled" | "unavailable";
  if (
    !config.valid
    || config.status === "invalid"
    || entry.status === "unavailable"
  ) {
    status = "unavailable";
  } else if (
    !config.enabled
    || config.status === "disabled"
    || !entry.enabled
    || entry.status === "disabled"
  ) {
    status = "disabled";
  } else if (!binding || !binding.approved || !binding.providerAvailable) {
    status = "unavailable";
  } else {
    status = "available";
  }
  return Object.freeze({
    adapterId: entry.adapterId,
    enabled: status === "available",
    label: entry.label,
    recommended: entry.recommended && status === "available",
    status,
  });
};

const eventFields = {
  account_changed: new Set(["accountType", "type", "walletAddressHint"]),
  chain_changed: new Set(["chainId", "network", "type"]),
  disconnected: new Set(["type"]),
};

const projectEvent = (
  raw: unknown,
  accountType: AelfWebLoginAccountType,
): WalletClientEvent | undefined => {
  if (
    !isPlainRecord(raw)
    || !validateBoundedValue(raw, { bytes: 0, entries: 0, nodes: 0 })
  ) {
    return undefined;
  }
  const type = ownDataValue(raw, "type");
  if (type === "disconnected" && exactDataFields(raw, eventFields.disconnected)) {
    return Object.freeze({ type });
  }
  if (type === "account_changed" && exactDataFields(raw, eventFields.account_changed)) {
    const eventAccountType = ownDataValue(raw, "accountType");
    const walletAddressHint = ownDataValue(raw, "walletAddressHint");
    return eventAccountType === accountType && safeIdentifier(walletAddressHint, 256)
      ? Object.freeze({ type, walletAddressHint })
      : undefined;
  }
  if (type === "chain_changed" && exactDataFields(raw, eventFields.chain_changed)) {
    const chainId = ownDataValue(raw, "chainId");
    const network = ownDataValue(raw, "network");
    return safeIdentifier(chainId, 32)
      && supportedChainIds.has(chainId)
      && (network === "mainnet" || network === "testnet")
      ? Object.freeze({ chainId, network, type })
      : undefined;
  }
  return undefined;
};

const runtimeForAdapter = (
  runtimeByAdapterId: Readonly<Record<string, AelfWebLoginRuntimeConfig>>,
  adapterId: string,
): AelfWebLoginRuntimeConfig | undefined => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(runtimeByAdapterId, adapterId);
    return descriptor?.enumerable === true && "value" in descriptor && validRuntime(descriptor.value)
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
};

const exactUtf8 = (bytes: Uint8Array): string | undefined => {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const rebuilt = textEncoder.encode(decoded);
    return rebuilt.length === bytes.length && rebuilt.every((byte, index) => byte === bytes[index])
      ? decoded
      : undefined;
  } catch {
    return undefined;
  }
};

const packageWalletFields = new Set(["address", "extraInfo", "name"]);

const validatePackageWallet = (value: unknown): value is Record<string, unknown> => {
  if (
    !isPlainRecord(value)
    || !validateBoundedValue(value, { bytes: 0, entries: 0, nodes: 0 })
  ) {
    return false;
  }
  try {
    const keys = Reflect.ownKeys(value);
    if (
      keys.some((key) => typeof key !== "string" || !packageWalletFields.has(key))
      || !Object.prototype.hasOwnProperty.call(value, "address")
      || !Object.prototype.hasOwnProperty.call(value, "extraInfo")
    ) {
      return false;
    }
  } catch {
    return false;
  }
  const address = ownDataValue(value, "address");
  const extraInfo = ownDataValue(value, "extraInfo");
  const name = ownDataValue(value, "name");
  return safeIdentifier(address, 256)
    && isPlainRecord(extraInfo)
    && (name === undefined || safeText(name, 80));
};

const packageProofToEoaProof = (value: unknown): WalletClientProof => {
  if (
    !isPlainRecord(value)
    || !validateBoundedValue(value, { bytes: 0, entries: 0, nodes: 0 })
  ) {
    throw new Error("Package proof is invalid.");
  }
  const error = ownDataValue(value, "error");
  const errorMessage = ownDataValue(value, "errorMessage");
  const from = ownDataValue(value, "from");
  const signature = ownDataValue(value, "signature");
  if (
    error !== 0
    || typeof errorMessage !== "string"
    || errorMessage.length > MAX_TEXT_LENGTH
    || /[\u0000-\u001f\u007f]/.test(errorMessage)
    || !safeIdentifier(from, 64)
    || typeof signature !== "string"
    || signature.length === 0
    || signature.length > MAX_PUBLIC_KEY_BYTES * 2
    || !/^(?:[0-9a-fA-F]{2})+$/.test(signature)
  ) {
    throw new Error("Package proof is invalid.");
  }
  const signatureBytes = new Uint8Array(signature.length / 2);
  for (let index = 0; index < signature.length; index += 2) {
    signatureBytes[index / 2] = Number.parseInt(signature.slice(index, index + 2), 16);
  }
  return Object.freeze({ signature: signatureBytes });
};

const createRegisteredAlphaDriver = (
  registration: AelfWebLoginAdapterFactoryRegistration,
  runtime: AelfWebLoginAdapterRuntimeConfig,
  adapterId: string,
  traceId: string,
): AelfWebLoginAdapterDriver => {
  const listeners = new Set<(event: unknown) => void>();
  const projectionContext: AelfWebLoginAdapterProjectionContext = Object.freeze({
    accountType: registration.accountType,
    adapterId,
    runtime,
  });
  const factoryContext: AelfWebLoginAdapterFactoryContext = Object.freeze({
    adapterId,
    factoryConfig: runtime.factoryConfig,
    packageName: registration.packageName,
  });
  let adapterPromise: Promise<InternalAlphaAdapter> | undefined;
  let alphaUnsubscribe: (() => void) | undefined;
  let closePromise: Promise<void> | undefined;
  let disconnectPromise: Promise<void> | undefined;
  let closed = false;
  let currentChainId = runtime.chainId;
  let currentNetwork = runtime.network;
  let walletAddressHint: string | undefined;

  const emit = (event: unknown): void => {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        // The client boundary owns listener isolation.
      }
    }
  };
  const invalidEvent = () => emit(Object.freeze({ type: "invalid" }));
  const ensureAdapter = (): Promise<InternalAlphaAdapter> => {
    if (adapterPromise) {
      return adapterPromise;
    }
    adapterPromise = Promise.resolve(registration.create(factoryContext)).then((rawAdapter) => {
      const adapter = parseAlphaAdapter(rawAdapter);
      const accountsChanged = (accounts: unknown) => {
        if (!isPlainRecord(accounts)) {
          invalidEvent();
          return;
        }
        const chainAccounts = ownDataValue(accounts, currentChainId);
        const address = Array.isArray(chainAccounts) ? chainAccounts[0] : undefined;
        if (!safeIdentifier(address, 256)) {
          invalidEvent();
          return;
        }
        walletAddressHint = address;
        emit(Object.freeze({
          accountType: registration.accountType,
          type: "account_changed",
          walletAddressHint: address,
        }));
      };
      const chainChanged = (chainIds: unknown) => {
        const chainId = Array.isArray(chainIds) ? chainIds[0] : chainIds;
        if (!safeIdentifier(chainId, 32) || !supportedChainIds.has(chainId)) {
          invalidEvent();
          return;
        }
        currentChainId = chainId;
        emit(Object.freeze({
          chainId,
          network: currentNetwork,
          type: "chain_changed",
        }));
      };
      const networkChanged = (networkValue: unknown) => {
        const network = networkValue === "MAINNET" || networkValue === "mainnet"
          ? "mainnet"
          : networkValue === "TESTNET" || networkValue === "testnet"
            ? "testnet"
            : undefined;
        if (!network) {
          invalidEvent();
          return;
        }
        currentNetwork = network;
        emit(Object.freeze({
          chainId: currentChainId,
          network,
          type: "chain_changed",
        }));
      };
      const disconnected = () => emit(Object.freeze({ type: "disconnected" }));
      const bindings: Array<readonly [string, (...args: unknown[]) => void]> = [
        ["accountsChanged", accountsChanged],
        ["chainChanged", chainChanged],
        ["networkChanged", networkChanged],
        ["disconnected", disconnected],
        ["lock", disconnected],
      ];
      for (const [event, listener] of bindings) {
        adapter.on(event, listener);
      }
      alphaUnsubscribe = () => {
        for (const [event, listener] of bindings) {
          try {
            adapter.off(event, listener);
          } catch {
            // Closing remains fail-closed even when an alpha emitter misbehaves.
          }
        }
      };
      return adapter;
    });
    return adapterPromise;
  };

  const driver: AelfWebLoginAdapterDriver = {
    async connect({ signal }) {
      if (closed || signal.aborted) {
        throw new Error("Package connect is unavailable.");
      }
      const adapter = await ensureAdapter();
      const packageWallet = await adapter.login();
      if (closed || signal.aborted || !validatePackageWallet(packageWallet)) {
        throw new Error("Package wallet output is invalid.");
      }
      const projected = registration.projectConnection
        ? registration.projectConnection(packageWallet, projectionContext)
        : {
          accountType: registration.accountType,
          walletAddressHint: ownDataValue(packageWallet, "address"),
        };
      if (
        !isPlainRecord(projected)
        || !validateBoundedValue(projected, { bytes: 0, entries: 0, nodes: 0 })
      ) {
        throw new Error("Package connection projection is invalid.");
      }
      const projectedAddress = ownDataValue(projected, "walletAddressHint");
      if (safeIdentifier(projectedAddress, 256)) {
        walletAddressHint = projectedAddress;
      }
      return Object.freeze({
        accountType: ownDataValue(projected, "accountType"),
        ...(Object.prototype.hasOwnProperty.call(projected, "caHashHint")
          ? { caHashHint: ownDataValue(projected, "caHashHint") }
          : {}),
        chainId: runtime.chainId,
        network: runtime.network,
        walletAddressHint: projectedAddress,
      });
    },
    async signMessage({ exactMessageBytes, signal }) {
      if (closed || signal.aborted || !walletAddressHint) {
        throw new Error("Package signing is unavailable.");
      }
      const adapter = await ensureAdapter();
      const message = registration.messageEncoding === "hex"
        ? bytesToHex(new Uint8Array(exactMessageBytes))
        : exactUtf8(new Uint8Array(exactMessageBytes));
      if (message === undefined) {
        throw walletError("WALLET_CLIENT_INPUT_INVALID", traceId, adapterId);
      }
      const packageProof = await adapter.getSignature(Object.freeze({
        address: walletAddressHint,
        appName: runtime.appName,
        hexToBeSign: "",
        signInfo: message,
      }));
      if (closed || signal.aborted) {
        throw new Error("Package signing is unavailable.");
      }
      return registration.projectProof
        ? registration.projectProof(packageProof, projectionContext)
        : packageProofToEoaProof(packageProof);
    },
    subscribe(listener) {
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
      if (disconnectPromise) {
        return disconnectPromise;
      }
      disconnectPromise = (async () => {
        if (adapterPromise) {
          const adapter = await adapterPromise;
          await adapter.logout();
        }
        walletAddressHint = undefined;
      })();
      return disconnectPromise;
    },
    close() {
      if (closePromise) {
        return closePromise;
      }
      closed = true;
      closePromise = (async () => {
        await driver.disconnect();
        alphaUnsubscribe?.();
        alphaUnsubscribe = undefined;
        if (adapterPromise) {
          const adapter = await adapterPromise;
          await adapter.close?.();
        }
        listeners.clear();
      })();
      return closePromise;
    },
  };
  return Object.freeze(driver);
};

const normalizeClientOptions = (
  options: CreateAelfWebLoginWalletClientOptions | CreateRegisteredAelfWebLoginWalletClientOptions,
): NormalizedClientOptions => {
  if ("adapterConfig" in options) {
    const runtimeByAdapterId = Object.freeze(Object.fromEntries(
      options.adapterConfig.adapters.map(({ adapterId }) => [adapterId, options.runtime]),
    ));
    return {
      adapterConfig: options.adapterConfig,
      bindings: options.bindings,
      runtimeByAdapterId,
      traceIdFactory: options.traceIdFactory,
    };
  }

  const fixedTraceId = safeIdentifier(options.traceId, 128)
    ? options.traceId
    : DEFAULT_ALPHA_TRACE_ID;
  const bindingsByPackageName = new Map<string, AelfWebLoginAdapterBinding>();
  for (const entry of options.config.adapters) {
    if (bindingsByPackageName.has(entry.packageName)) {
      continue;
    }
    const registration = options.registry.get(entry.packageName);
    if (!registration) {
      continue;
    }
    bindingsByPackageName.set(entry.packageName, Object.freeze({
      accountType: registration.accountType,
      approved: registration.approved,
      createDriver: (_runtime: AelfWebLoginRuntimeConfig, adapterId = "unknown") => {
        const candidate = runtimeForAdapter(
          options.runtimeByAdapterId as Readonly<Record<string, AelfWebLoginRuntimeConfig>>,
          adapterId,
        );
        const registeredRuntime = (() => {
          try {
            const descriptor = Object.getOwnPropertyDescriptor(options.runtimeByAdapterId, adapterId);
            return descriptor?.enumerable === true && "value" in descriptor
              && validAdapterRuntime(descriptor.value)
              ? descriptor.value
              : undefined;
          } catch {
            return undefined;
          }
        })();
        if (!candidate || !registeredRuntime) {
          throw walletError("WALLET_CLIENT_ADAPTER_UNAVAILABLE", fixedTraceId, adapterId);
        }
        return createRegisteredAlphaDriver(registration, registeredRuntime, adapterId, fixedTraceId);
      },
      packageName: registration.packageName,
      providerAvailable: registration.providerAvailable,
    }));
  }
  const runtimeByAdapterId: Record<string, AelfWebLoginRuntimeConfig> = {};
  for (const entry of options.config.adapters) {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(options.runtimeByAdapterId, entry.adapterId);
      if (
        descriptor?.enumerable === true
        && "value" in descriptor
        && validAdapterRuntime(descriptor.value)
      ) {
        runtimeByAdapterId[entry.adapterId] = Object.freeze({
          appName: ownDataValue(descriptor.value, "appName") as string,
          chainId: ownDataValue(descriptor.value, "chainId") as string,
          network: ownDataValue(descriptor.value, "network") as "mainnet" | "testnet",
        });
      }
    } catch {
      // Missing or hostile per-adapter runtime remains unavailable.
    }
  }
  return {
    adapterConfig: options.config,
    bindings: Object.freeze([...bindingsByPackageName.values()]),
    onDiagnostic: options.onDiagnostic,
    runtimeByAdapterId: Object.freeze(runtimeByAdapterId),
    traceIdFactory: () => fixedTraceId,
  };
};

export function createAelfWebLoginWalletClient(
  options: CreateAelfWebLoginWalletClientOptions,
): WalletClient;
export function createAelfWebLoginWalletClient(
  options: CreateRegisteredAelfWebLoginWalletClientOptions,
): WalletClient;
export function createAelfWebLoginWalletClient(
  options: CreateAelfWebLoginWalletClientOptions | CreateRegisteredAelfWebLoginWalletClientOptions,
): WalletClient {
  const {
    adapterConfig,
    bindings,
    onDiagnostic,
    runtimeByAdapterId,
    traceIdFactory,
  } = normalizeClientOptions(options);
  const startupTraceId = nextTraceId(traceIdFactory);
  if (
    !adapterConfig
    || !Array.isArray(adapterConfig.adapters)
    || adapterConfig.adapters.length > MAX_ADAPTERS
    || !Array.isArray(bindings)
    || bindings.length > MAX_ADAPTERS
    || !bindings.every(validBinding)
    || !isPlainRecord(runtimeByAdapterId)
  ) {
    throw walletError("WALLET_CLIENT_INPUT_INVALID", startupTraceId);
  }
  const bindingByPackageName = new Map<string, AelfWebLoginAdapterBinding>();
  for (const binding of bindings) {
    if (bindingByPackageName.has(binding.packageName)) {
      throw walletError("WALLET_CLIENT_INPUT_INVALID", startupTraceId);
    }
    bindingByPackageName.set(binding.packageName, binding);
  }
  const entryByAdapterId = new Map<string, BrowserWalletAdapterConfigEntry>();
  const availability = adapterConfig.adapters.map((entry) => {
    if (entryByAdapterId.has(entry.adapterId)) {
      throw walletError("WALLET_CLIENT_INPUT_INVALID", startupTraceId);
    }
    entryByAdapterId.set(entry.adapterId, entry);
    const runtime = runtimeForAdapter(runtimeByAdapterId, entry.adapterId);
    return availabilityFor(
      entry,
      adapterConfig,
      runtime ? bindingByPackageName.get(entry.packageName) : undefined,
    );
  });
  const availabilityByAdapterId = new Map(availability.map((entry) => [entry.adapterId, entry]));
  const listeners = new Set<(event: WalletClientEvent) => void>();
  let activeHandle: ConnectedHandle | undefined;
  let closed = false;
  let closeInFlight: Promise<void> | undefined;
  let disconnectInFlight: Promise<void> | undefined;
  let pendingConnect: PendingConnect | undefined;

  const requireOpen = (traceId: string, adapterId?: string): void => {
    if (closed) {
      throw walletError("WALLET_CLIENT_CLOSED", traceId, adapterId);
    }
  };

  const emit = (event: WalletClientEvent): void => {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        // A consumer listener cannot break wallet cleanup or other subscribers.
      }
    }
  };

  const abortSign = (handle: ConnectedHandle, code: WalletClientErrorCode): void => {
    if (!handle.signOperation) {
      return;
    }
    handle.signOperation.abortCode = code;
    handle.signOperation.controller.abort();
  };

  const emitDiagnostic = (
    code: AelfWebLoginWalletClientDiagnosticCode,
    operation: AelfWebLoginWalletClientDiagnostic["operation"],
    adapterId?: string,
  ): void => {
    if (!onDiagnostic) {
      return;
    }
    const diagnostic: AelfWebLoginWalletClientDiagnostic = Object.freeze({
      ...(safeIdentifier(adapterId, 64) ? { adapterId } : {}),
      code,
      operation,
      severity: "error",
      traceId: nextTraceId(traceIdFactory),
    });
    try {
      onDiagnostic(diagnostic);
    } catch {
      // Diagnostics cannot influence wallet authority state.
    }
  };

  const invalidateHandle = (handle: ConnectedHandle, invalidEvent = false): void => {
    if (activeHandle !== handle) {
      return;
    }
    activeHandle = undefined;
    abortSign(handle, "WALLET_CLIENT_SIGN_FAILED");
    unsubscribeResource(handle.resource);
    if (invalidEvent) {
      emitDiagnostic("AELF_WEB_LOGIN_ADAPTER_EVENT_INVALID", "event", handle.adapterId);
    }
    emit(Object.freeze({ type: "disconnected" }));
    const traceId = nextTraceId(traceIdFactory);
    void closeResource(handle.resource, traceId, handle.adapterId).catch(() => undefined);
  };

  const schedulePendingCleanup = (
    pending: PendingConnect,
    adapterId: string,
  ): Promise<void> => {
    unsubscribeResource(pending.resource);
    if (pending.cleanupPromise) {
      return pending.cleanupPromise;
    }
    pending.cleanupPromise = closeResource(pending.resource, pending.traceId, adapterId);
    void pending.cleanupPromise.then(
      () => {
        if (pendingConnect === pending) {
          pendingConnect = undefined;
        }
      },
      () => {
        if (pendingConnect === pending) {
          pendingConnect = undefined;
        }
      },
    );
    return pending.cleanupPromise;
  };

  const client: WalletClient = {
    async listAvailableWallets() {
      const traceId = nextTraceId(traceIdFactory);
      requireOpen(traceId);
      return Object.freeze(availability.map((entry) => Object.freeze({ ...entry })));
    },

    connect(adapterId, signal) {
      const traceId = nextTraceId(traceIdFactory);
      try {
        requireOpen(traceId, adapterId);
        if (!safeIdentifier(adapterId, 64)) {
          throw walletError("WALLET_CLIENT_INPUT_INVALID", traceId);
        }
        if (disconnectInFlight) {
          throw walletError("WALLET_CLIENT_DISCONNECT_IN_PROGRESS", traceId, adapterId);
        }
        if (activeHandle || pendingConnect) {
          throw walletError("WALLET_CLIENT_ALREADY_CONNECTED", traceId, adapterId);
        }
        if (signal?.aborted) {
          throw walletError("WALLET_CLIENT_INPUT_INVALID", traceId, adapterId);
        }
        const entry = entryByAdapterId.get(adapterId);
        const adapterAvailability = availabilityByAdapterId.get(adapterId);
        if (!entry || !adapterAvailability) {
          throw walletError("WALLET_CLIENT_ADAPTER_NOT_FOUND", traceId, adapterId);
        }
        if (adapterAvailability.status !== "available" || !adapterAvailability.enabled) {
          throw walletError(
            adapterAvailability.status === "disabled"
              ? "WALLET_CLIENT_ADAPTER_DISABLED"
              : "WALLET_CLIENT_ADAPTER_UNAVAILABLE",
            traceId,
            adapterId,
          );
        }
        const binding = bindingByPackageName.get(entry.packageName);
        const runtime = runtimeForAdapter(runtimeByAdapterId, adapterId);
        if (!binding || !binding.approved || !binding.providerAvailable || !runtime) {
          throw walletError("WALLET_CLIENT_ADAPTER_UNAVAILABLE", traceId, adapterId);
        }
        const driver = normalizeDriver(binding.createDriver(runtime, adapterId));
        if (!driver) {
          throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
        }
        const resource: DriverResource = {
          driver,
          unsubscribed: false,
        };
        const controller = new AbortController();
        const provisional: ConnectedHandle = {
          accountType: binding.accountType,
          adapterId,
          chainId: runtime.chainId,
          network: runtime.network,
          resource,
          walletAddressHint: "",
        };
        const driverListener = (rawEvent: unknown): void => {
          if (activeHandle !== provisional) {
            return;
          }
          const event = projectEvent(rawEvent, provisional.accountType);
          if (!event) {
            invalidateHandle(provisional, true);
            return;
          }
          if (event.type === "disconnected") {
            invalidateHandle(provisional);
            return;
          }
          if (event.type === "account_changed") {
            provisional.walletAddressHint = event.walletAddressHint;
          } else {
            provisional.chainId = event.chainId;
            provisional.network = event.network;
          }
          emit(event);
          invalidateHandle(provisional);
        };
        let unsubscribe: WalletClientUnsubscribe;
        try {
          unsubscribe = driver.subscribe(driverListener);
          if (typeof unsubscribe !== "function") {
            throw new Error("Driver unsubscribe is unavailable.");
          }
        } catch {
          void closeResource(resource, traceId, adapterId).catch(() => undefined);
          throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
        }
        resource.unsubscribe = unsubscribe;

        let abortCode: WalletClientErrorCode = "WALLET_CLIENT_CONNECT_FAILED";
        const onCallerAbort = () => {
          abortCode = "WALLET_CLIENT_INPUT_INVALID";
          if (pendingConnect) {
            pendingConnect.abortCode = abortCode;
          }
          controller.abort();
        };
        signal?.addEventListener("abort", onCallerAbort, { once: true });
        let driverResult: unknown;
        try {
          driverResult = driver.connect(Object.freeze({ runtime, signal: controller.signal }));
        } catch (error) {
          signal?.removeEventListener("abort", onCallerAbort);
          unsubscribeResource(resource);
          void closeResource(resource, traceId, adapterId).catch(() => undefined);
          throw error;
        }
        const rawPromise = Promise.resolve(driverResult);
        const pending = {} as PendingConnect;
        const guarded = raceOperation({
          controller,
          error: () => walletError(pending.abortCode ?? abortCode, traceId, adapterId),
          onTimeout: () => {
            pending.abortCode = "WALLET_CLIENT_CONNECT_FAILED";
          },
          rawPromise,
        });
        const publicPromise = guarded.then((raw) => {
          if (controller.signal.aborted || closed) {
            throw walletError(
              closed ? "WALLET_CLIENT_CLOSED" : pending.abortCode,
              traceId,
              adapterId,
            );
          }
          const connection = projectConnection({ adapterId, binding, raw, runtime, traceId });
          provisional.chainId = connection.chainId;
          provisional.network = connection.network;
          provisional.walletAddressHint = connection.walletAddressHint;
          activeHandle = provisional;
          return connection;
        }).catch((error: unknown) => {
          void schedulePendingCleanup(pending, adapterId).catch(() => undefined);
          if (error instanceof WalletClientError) {
            throw error;
          }
          throw walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId);
        }).finally(() => {
          signal?.removeEventListener("abort", onCallerAbort);
          if (activeHandle === provisional && pendingConnect === pending) {
            pendingConnect = undefined;
          }
        });
        Object.assign(pending, {
          adapterId,
          abortCode,
          controller,
          publicPromise,
          rawPromise,
          resource,
          traceId,
        });
        pendingConnect = pending;
        return publicPromise;
      } catch (error) {
        return Promise.reject(
          error instanceof WalletClientError
            ? error
            : walletError("WALLET_CLIENT_CONNECT_FAILED", traceId, adapterId),
        );
      }
    },

    async signMessage({ exactMessageBytes, signal }: WalletClientSignMessageInput) {
      const traceId = nextTraceId(traceIdFactory);
      requireOpen(traceId, activeHandle?.adapterId);
      const handle = activeHandle;
      if (!handle) {
        throw walletError("WALLET_CLIENT_NOT_CONNECTED", traceId);
      }
      if (
        !(exactMessageBytes instanceof Uint8Array)
        || exactMessageBytes.byteLength === 0
        || exactMessageBytes.byteLength > MAX_MESSAGE_BYTES
        || signal?.aborted
      ) {
        throw walletError("WALLET_CLIENT_INPUT_INVALID", traceId, handle.adapterId);
      }
      if (handle.signOperation) {
        throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, handle.adapterId);
      }
      const controller = new AbortController();
      const signOperation = {} as SignOperation;
      const onCallerAbort = () => {
        signOperation.abortCode = "WALLET_CLIENT_INPUT_INVALID";
        controller.abort();
      };
      signal?.addEventListener("abort", onCallerAbort, { once: true });
      let driverResult: unknown;
      try {
        driverResult = handle.resource.driver.signMessage(Object.freeze({
          exactMessageBytes: new Uint8Array(exactMessageBytes),
          signal: controller.signal,
        }));
      } catch (error) {
        signal?.removeEventListener("abort", onCallerAbort);
        throw error instanceof WalletClientError
          ? error
          : walletError("WALLET_CLIENT_SIGN_FAILED", traceId, handle.adapterId);
      }
      const rawPromise = Promise.resolve(driverResult);
      Object.assign(signOperation, {
        abortCode: "WALLET_CLIENT_SIGN_FAILED",
        controller,
        rawPromise,
      });
      handle.signOperation = signOperation;
      void rawPromise.then(
        () => {
          if (handle.signOperation === signOperation) {
            handle.signOperation = undefined;
          }
        },
        () => {
          if (handle.signOperation === signOperation) {
            handle.signOperation = undefined;
          }
        },
      );
      try {
        const rawProof = await raceOperation({
          controller,
          error: () => walletError(signOperation.abortCode, traceId, handle.adapterId),
          onTimeout: () => {
            signOperation.abortCode = "WALLET_CLIENT_SIGN_FAILED";
          },
          rawPromise,
        });
        if (closed || activeHandle !== handle || controller.signal.aborted) {
          throw walletError(
            closed ? "WALLET_CLIENT_CLOSED" : "WALLET_CLIENT_SIGN_FAILED",
            traceId,
            handle.adapterId,
          );
        }
        return projectProof(rawProof, traceId, handle.adapterId);
      } catch (error) {
        if (error instanceof WalletClientError) {
          throw error;
        }
        throw walletError("WALLET_CLIENT_SIGN_FAILED", traceId, handle.adapterId);
      } finally {
        signal?.removeEventListener("abort", onCallerAbort);
      }
    },

    subscribeAccountAndChain(listener) {
      const traceId = nextTraceId(traceIdFactory);
      requireOpen(traceId, activeHandle?.adapterId);
      if (typeof listener !== "function") {
        throw walletError("WALLET_CLIENT_INPUT_INVALID", traceId, activeHandle?.adapterId);
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
      const traceId = nextTraceId(traceIdFactory);
      try {
        requireOpen(traceId, activeHandle?.adapterId ?? pendingConnect?.adapterId);
      } catch (error) {
        return Promise.reject(error);
      }
      if (disconnectInFlight) {
        return disconnectInFlight;
      }
      const pending = pendingConnect;
      const handle = activeHandle;
      if (!pending && !handle) {
        return Promise.resolve();
      }
      if (pending) {
        pending.abortCode = "WALLET_CLIENT_CONNECT_FAILED";
        pending.controller.abort();
      }
      if (handle) {
        activeHandle = undefined;
        abortSign(handle, "WALLET_CLIENT_SIGN_FAILED");
        unsubscribeResource(handle.resource);
      }
      const operation = (async () => {
        if (pending) {
          void schedulePendingCleanup(pending, pending.adapterId).catch(() => undefined);
        }
        if (handle) {
          await closeResource(handle.resource, traceId, handle.adapterId);
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
    },

    close() {
      if (closeInFlight) {
        return closeInFlight;
      }
      if (closed) {
        return Promise.resolve();
      }
      const traceId = nextTraceId(traceIdFactory);
      closed = true;
      listeners.clear();
      const pending = pendingConnect;
      const handle = activeHandle;
      activeHandle = undefined;
      if (pending) {
        pending.abortCode = "WALLET_CLIENT_CLOSED";
        pending.controller.abort();
      }
      if (handle) {
        abortSign(handle, "WALLET_CLIENT_CLOSED");
        unsubscribeResource(handle.resource);
      }
      const operation = (async () => {
        if (pending) {
          await schedulePendingCleanup(pending, pending.adapterId);
        }
        if (handle) {
          await closeResource(handle.resource, traceId, handle.adapterId);
        }
      })();
      closeInFlight = operation;
      return operation;
    },
  };

  return Object.freeze(client);
}

const alphaMethod = (
  value: object,
  name: string,
): ((...args: unknown[]) => unknown) | undefined => method(value, name);

const parseAlphaAdapter = (value: unknown): InternalAlphaAdapter => {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    throw new Error("Alpha adapter is unavailable.");
  }
  const login = alphaMethod(value, "login");
  const logout = alphaMethod(value, "logout");
  const getSignature = alphaMethod(value, "getSignature");
  const close = alphaMethod(value, "close");
  const on = alphaMethod(value, "on");
  const off = alphaMethod(value, "off");
  if (!login || !logout || !getSignature || !on || !off) {
    throw new Error("Alpha adapter contract is unsupported.");
  }
  return Object.freeze({
    ...(close ? { close: () => Reflect.apply(close, value, []) } : {}),
    getSignature: (params: Readonly<{
      address: string;
      appName: string;
      hexToBeSign: string;
      signInfo: string;
    }>) => Reflect.apply(getSignature, value, [params]),
    login: () => Reflect.apply(login, value, []),
    logout: () => Reflect.apply(logout, value, []),
    off: (event: string, listener: (...args: unknown[]) => void) => {
      Reflect.apply(off, value, [event, listener]);
    },
    on: (event: string, listener: (...args: unknown[]) => void) => {
      Reflect.apply(on, value, [event, listener]);
    },
  });
};

const alphaConstructor = (module: unknown, exportName: string): (new (config: unknown) => unknown) => {
  if ((typeof module !== "object" && typeof module !== "function") || module === null) {
    throw new Error("Alpha module is unavailable.");
  }
  const constructor = Reflect.get(module, exportName) as unknown;
  if (typeof constructor !== "function") {
    throw new Error("Alpha constructor is unavailable.");
  }
  return constructor as new (config: unknown) => unknown;
};

const bytesToHex = (bytes: Uint8Array): string => {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
};

const createLazyAlphaDriver = (
  runtime: AelfWebLoginRuntimeConfig,
  load: () => Promise<unknown>,
  exportName: string,
  factoryConfig: Readonly<Record<string, unknown>>,
): AelfWebLoginAdapterDriver => {
  const listeners = new Set<(event: unknown) => void>();
  let adapterPromise: Promise<InternalAlphaAdapter> | undefined;
  let alphaUnsubscribe: (() => void) | undefined;
  let providerUnsubscribe: (() => void) | undefined;
  let closed = false;
  let closePromise: Promise<void> | undefined;
  let disconnectPromise: Promise<void> | undefined;
  let walletAddressHint: string | undefined;

  const emit = (event: unknown): void => {
    for (const listener of [...listeners]) {
      listener(event);
    }
  };
  const attachProvider = (wallet: Record<string, unknown>): void => {
    if (providerUnsubscribe) {
      return;
    }
    const extraInfo = ownDataValue(wallet, "extraInfo");
    if (!isPlainRecord(extraInfo)) {
      return;
    }
    const provider = ownDataValue(extraInfo, "provider");
    if ((typeof provider !== "object" && typeof provider !== "function") || provider === null) {
      return;
    }
    const on = method(provider, "on");
    const remove = method(provider, "removeListener") ?? method(provider, "off");
    if (!on || !remove) {
      return;
    }
    let currentChainId = runtime.chainId;
    let currentNetwork = runtime.network;
    const accountsChanged = (accounts: unknown) => {
      if (!isPlainRecord(accounts)) {
        emit(Object.freeze({ type: "unsupported" }));
        return;
      }
      const chainAccounts = ownDataValue(accounts, currentChainId);
      const address = Array.isArray(chainAccounts) ? chainAccounts[0] : undefined;
      if (!safeIdentifier(address, 256)) {
        emit(Object.freeze({ type: "unsupported" }));
        return;
      }
      walletAddressHint = address;
      emit(Object.freeze({
        accountType: "EOA",
        type: "account_changed",
        walletAddressHint: address,
      }));
    };
    const chainChanged = (chainIds: unknown) => {
      const chainId = Array.isArray(chainIds) ? chainIds[0] : chainIds;
      if (!safeIdentifier(chainId, 32) || !supportedChainIds.has(chainId)) {
        emit(Object.freeze({ type: "unsupported" }));
        return;
      }
      currentChainId = chainId;
      emit(Object.freeze({ chainId, network: currentNetwork, type: "chain_changed" }));
    };
    const networkChanged = (networkValue: unknown) => {
      const network = networkValue === "MAINNET" || networkValue === "mainnet"
        ? "mainnet"
        : networkValue === "TESTNET" || networkValue === "testnet"
          ? "testnet"
          : undefined;
      if (!network) {
        emit(Object.freeze({ type: "unsupported" }));
        return;
      }
      currentNetwork = network;
      emit(Object.freeze({ chainId: currentChainId, network, type: "chain_changed" }));
    };
    const disconnected = () => emit(Object.freeze({ type: "disconnected" }));
    const bindings: Array<readonly [string, (...args: unknown[]) => void]> = [
      ["accountsChanged", accountsChanged],
      ["chainChanged", chainChanged],
      ["networkChanged", networkChanged],
      ["disconnected", disconnected],
    ];
    for (const [event, listener] of bindings) {
      Reflect.apply(on, provider, [event, listener]);
    }
    providerUnsubscribe = () => {
      for (const [event, listener] of bindings) {
        try {
          Reflect.apply(remove, provider, [event, listener]);
        } catch {
          // Provider cleanup remains best-effort after authority invalidation.
        }
      }
    };
  };
  const ensureAdapter = (): Promise<InternalAlphaAdapter> => {
    if (!adapterPromise) {
      adapterPromise = load().then((module) => {
        const Adapter = alphaConstructor(module, exportName);
        const adapter = parseAlphaAdapter(new Adapter(factoryConfig));
        const connected = (wallet: unknown) => {
          if (!isPlainRecord(wallet)) {
            emit(Object.freeze({ type: "unsupported" }));
            return;
          }
          const address = ownDataValue(wallet, "address");
          if (!safeIdentifier(address, 256)) {
            emit(Object.freeze({ type: "unsupported" }));
            return;
          }
          walletAddressHint = address;
          emit(Object.freeze({
            accountType: "EOA",
            type: "account_changed",
            walletAddressHint: address,
          }));
        };
        const disconnected = () => emit(Object.freeze({ type: "disconnected" }));
        adapter.on("connected", connected);
        adapter.on("disconnected", disconnected);
        adapter.on("lock", disconnected);
        alphaUnsubscribe = () => {
          adapter.off("connected", connected);
          adapter.off("disconnected", disconnected);
          adapter.off("lock", disconnected);
        };
        return adapter;
      });
    }
    return adapterPromise;
  };
  const driver: AelfWebLoginAdapterDriver = {
    async connect({ signal }) {
      if (closed || signal.aborted) {
        throw new Error("Alpha connect unavailable.");
      }
      const adapter = await ensureAdapter();
      const wallet = await adapter.login();
      if (closed || signal.aborted || !isPlainRecord(wallet)) {
        throw new Error("Alpha connect unavailable.");
      }
      const address = ownDataValue(wallet, "address");
      if (!safeIdentifier(address, 256)) {
        throw new Error("Alpha connect output invalid.");
      }
      walletAddressHint = address;
      attachProvider(wallet);
      return Object.freeze({
        accountType: "EOA",
        chainId: runtime.chainId,
        network: runtime.network,
        walletAddressHint: address,
      });
    },
    async signMessage({ exactMessageBytes, signal }) {
      if (closed || signal.aborted || !walletAddressHint) {
        throw new Error("Alpha signing unavailable.");
      }
      const adapter = await ensureAdapter();
      const result = await adapter.getSignature(Object.freeze({
        address: walletAddressHint,
        appName: runtime.appName,
        hexToBeSign: "",
        signInfo: bytesToHex(new Uint8Array(exactMessageBytes)),
      }));
      if (closed || signal.aborted) {
        throw new Error("Alpha signing unavailable.");
      }
      return packageProofToEoaProof(result);
    },
    subscribe(listener) {
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
      if (disconnectPromise) {
        return disconnectPromise;
      }
      disconnectPromise = (async () => {
        if (adapterPromise) {
          const adapter = await adapterPromise;
          await adapter.logout();
        }
        walletAddressHint = undefined;
      })();
      return disconnectPromise;
    },
    close() {
      if (closePromise) {
        return closePromise;
      }
      closed = true;
      closePromise = (async () => {
        await driver.disconnect();
        providerUnsubscribe?.();
        providerUnsubscribe = undefined;
        alphaUnsubscribe?.();
        alphaUnsubscribe = undefined;
        listeners.clear();
      })();
      return closePromise;
    },
  };
  return Object.freeze(driver);
};

export const createDefaultAelfWebLoginAdapterBindings = (
  providerAvailability: Readonly<{
    discover: boolean;
    nightElf: boolean;
  }> = { discover: false, nightElf: false },
): readonly AelfWebLoginAdapterBinding[] => Object.freeze([
  Object.freeze({
    accountType: "EOA" as const,
    approved: true,
    createDriver: (runtime: AelfWebLoginRuntimeConfig) => createLazyAlphaDriver(
      runtime,
      () => import("@aelf-web-login/wallet-adapter-portkey-discover"),
      "PortkeyDiscoverWallet",
      Object.freeze({
        autoLogoutOnAccountMismatch: true,
        autoLogoutOnChainMismatch: true,
        autoLogoutOnDisconnected: true,
        autoLogoutOnNetworkMismatch: true,
        autoRequestAccount: false,
        chainId: runtime.chainId,
        networkType: runtime.network.toUpperCase(),
      }),
    ),
    packageName: discoverPackageName,
    providerAvailable: providerAvailability.discover,
  }),
  Object.freeze({
    accountType: "EOA" as const,
    approved: true,
    createDriver: (runtime: AelfWebLoginRuntimeConfig) => createLazyAlphaDriver(
      runtime,
      () => import("@aelf-web-login/wallet-adapter-night-elf"),
      "NightElfWallet",
      Object.freeze({
        appName: runtime.appName,
        chainId: runtime.chainId,
        connectEagerly: false,
        defaultRpcUrl: runtime.rpcUrl,
        nodes: Object.freeze({
          [runtime.chainId]: Object.freeze({
            chainId: runtime.chainId,
            rpcUrl: runtime.rpcUrl,
          }),
        }),
      }),
    ),
    packageName: nightElfPackageName,
    providerAvailable: providerAvailability.nightElf,
  }),
]);
