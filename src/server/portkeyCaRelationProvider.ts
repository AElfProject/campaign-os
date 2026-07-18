import { createHash, timingSafeEqual } from "node:crypto";
import { lookup as lookupDns } from "node:dns/promises";
import {
  Agent as HttpAgent,
  request as requestHttp,
  type ClientRequest,
  type IncomingMessage,
} from "node:http";
import {
  Agent as HttpsAgent,
  request as requestHttps,
} from "node:https";
import {
  isIP,
  type LookupFunction,
  type Socket,
} from "node:net";
import { Readable } from "node:stream";
import { isDate } from "node:util/types";
import {
  isCanonicalLiveWalletChainId,
  type CanonicalLiveWalletChainId,
} from "../domain/wallet";
import {
  createWalletAuthenticationDiagnostic,
  type PortkeyCaRelationProvider,
  type PortkeyCaRelationRequest,
  type PortkeyCaRelationResult,
  type WalletAuthenticationClock,
} from "./walletAuthentication";
import type {
  WalletAuthenticationEnvironment,
  WalletCaRelationProviderConfig,
} from "./walletAuthenticationConfig";
import { isCanonicalAelfWalletAddress } from "./walletAuthenticationChallenge";

export const PORTKEY_CA_RELATION_QUERY_VERSION = "campaign-os-portkey-ca-query/v1" as const;
export const PORTKEY_CA_RELATION_RESPONSE_VERSION = "campaign-os-portkey-ca-relation/v1" as const;
export const PORTKEY_CA_RELATION_DEFAULT_MAX_RESPONSE_BYTES = 16 * 1_024;
export const PORTKEY_CA_RELATION_DEFAULT_MAX_AGE_MS = 30_000;

const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 5_000;
const MIN_RESPONSE_BYTES = 1_024;
const MAX_RESPONSE_BYTES = 64 * 1_024;
const MAX_ENDPOINT_BYTES = 2_048;
const DEFAULT_FUTURE_SKEW_MS = 5_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_000;
const MAX_FRESHNESS_AGE_MS = 5 * 60_000;
const MAX_FUTURE_SKEW_MS = 60_000;
const MAX_RETRY_AFTER_MS = 24 * 60 * 60_000;
const MAX_APPROVED_PRODUCTION_HOSTS = 32;
const MAX_DNS_ADDRESSES = 16;
const productionTransportAuthorities = new WeakSet<PortkeyCaRelationTransport>();

export type PortkeyCaRelationProviderConfigurationErrorCode =
  | "PORTKEY_CA_PROVIDER_CONFIG_INVALID"
  | "PORTKEY_CA_PROVIDER_ENVIRONMENT_INVALID"
  | "PORTKEY_CA_PROVIDER_PRODUCTION_APPROVAL_REQUIRED";

const CONFIGURATION_MESSAGES: Readonly<
  Record<PortkeyCaRelationProviderConfigurationErrorCode, string>
> = Object.freeze({
  PORTKEY_CA_PROVIDER_CONFIG_INVALID: "Portkey CA relation provider configuration is invalid.",
  PORTKEY_CA_PROVIDER_ENVIRONMENT_INVALID: "Portkey CA relation provider environment is invalid.",
  PORTKEY_CA_PROVIDER_PRODUCTION_APPROVAL_REQUIRED:
    "Portkey CA relation provider is not approved for production.",
});

export class PortkeyCaRelationProviderConfigurationError extends Error {
  readonly code: PortkeyCaRelationProviderConfigurationErrorCode;
  readonly field: string;

  constructor(code: PortkeyCaRelationProviderConfigurationErrorCode, field: string) {
    super(CONFIGURATION_MESSAGES[code]);
    this.name = "PortkeyCaRelationProviderConfigurationError";
    this.code = code;
    this.field = field;
    delete this.stack;
  }
}

export interface PortkeyCaRelationEndpointResolutionInput {
  readonly config: WalletCaRelationProviderConfig;
  readonly signal: AbortSignal;
}

export type PortkeyCaRelationEndpointResolver = (
  input: PortkeyCaRelationEndpointResolutionInput,
) => string | Promise<string>;

export interface PortkeyCaRelationFreshnessPolicy {
  readonly maxAgeMs?: number;
  readonly maxFutureSkewMs?: number;
  readonly minimumBlockHeight?: number;
  readonly minimumRelationVersion?: number;
}

export interface PortkeyCaRelationDnsAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

export interface PortkeyCaRelationDnsResolutionInput {
  readonly hostname: string;
  readonly signal: AbortSignal;
}

export type PortkeyCaRelationDnsResolver = (
  input: PortkeyCaRelationDnsResolutionInput,
) => readonly PortkeyCaRelationDnsAddress[] | Promise<readonly PortkeyCaRelationDnsAddress[]>;

export interface PortkeyCaRelationTransportRequest {
  readonly body: string;
  readonly endpoint: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly pinnedAddress?: PortkeyCaRelationDnsAddress;
  readonly signal: AbortSignal;
}

export interface PortkeyCaRelationTransport {
  close(): void | Promise<void>;
  execute(request: PortkeyCaRelationTransportRequest): Response | Promise<Response>;
}

export interface CreatePortkeyCaRelationProviderOptions {
  readonly approvedProductionHosts?: readonly string[];
  readonly clock: WalletAuthenticationClock;
  readonly config: WalletCaRelationProviderConfig;
  readonly dnsResolver?: PortkeyCaRelationDnsResolver;
  readonly endpointResolver: PortkeyCaRelationEndpointResolver;
  readonly environment: WalletAuthenticationEnvironment;
  readonly freshnessPolicy?: PortkeyCaRelationFreshnessPolicy;
  readonly maxResponseBytes?: number;
  readonly shutdownTimeoutMs?: number;
  readonly transport?: PortkeyCaRelationTransport;
}

type PortkeyCaRelationFailure = Extract<
  PortkeyCaRelationResult,
  { status: "rejected" | "unavailable" }
>;

export type PortkeyCaRelationAdapterResult =
  | Exclude<PortkeyCaRelationResult, PortkeyCaRelationFailure>
  | (PortkeyCaRelationFailure & Readonly<{ retryAfterMs?: number }>);

export interface PortkeyCaRelationProviderState {
  readonly accepting: boolean;
  readonly activeCallCount: number;
  readonly environment: WalletAuthenticationEnvironment;
  readonly productionApproved: boolean;
}

export interface PortkeyCaRelationProviderAuthority {
  readonly accepting: boolean;
  readonly environment: WalletAuthenticationEnvironment;
  readonly productionApproved: boolean;
}

export interface PortkeyCaRelationProviderAdapter extends PortkeyCaRelationProvider {
  verifyRelation(
    request: PortkeyCaRelationRequest,
    signal?: AbortSignal,
  ): Promise<PortkeyCaRelationAdapterResult>;
  state(): PortkeyCaRelationProviderState;
}

interface NormalizedFreshnessPolicy {
  readonly maxAgeMs: number;
  readonly maxFutureSkewMs: number;
  readonly minimumBlockHeight: number;
  readonly minimumRelationVersion: number;
}

interface CapturedRelationRequest {
  readonly caAddressHint: string;
  readonly caHash: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly managerAddress: string;
  readonly traceId: string;
}

interface CurrentRelationResponse {
  readonly blockHeight: number;
  readonly caAddress: string;
  readonly caHash: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly managerAddress: string;
  readonly observedAt: string;
  readonly relationRevision: string;
  readonly relationVersion: number;
  readonly status: "current";
  readonly version: typeof PORTKEY_CA_RELATION_RESPONSE_VERSION;
}

interface ActiveProviderCall {
  readonly abort: () => void;
  readonly promise: Promise<PortkeyCaRelationAdapterResult>;
}

type AbortKind = "caller" | "closed" | "timeout";

interface ValidatedEndpoint {
  readonly endpoint: string;
  readonly hostname: string;
}

const ABORTED = Symbol("portkey-ca-provider-aborted");
const providerAuthorityReaders = new WeakMap<
  object,
  () => PortkeyCaRelationProviderAuthority
>();
const currentResponseFields = new Set([
  "blockHeight",
  "caAddress",
  "caHash",
  "chainId",
  "managerAddress",
  "observedAt",
  "relationRevision",
  "relationVersion",
  "status",
  "version",
]);
const unknownResponseFields = new Set(["status", "version"]);
const requestFields = new Set([
  "caAddressHint",
  "caHash",
  "chainId",
  "managerAddress",
  "traceId",
]);
const dnsAddressFields = new Set(["address", "family"]);
const configFields = new Set([
  "enabled",
  "endpointEnvKey",
  "id",
  "productionApproved",
  "timeoutMs",
]);

const failConfiguration = (
  code: PortkeyCaRelationProviderConfigurationErrorCode,
  field: string,
): never => {
  throw new PortkeyCaRelationProviderConfigurationError(code, field);
};

export const createPortkeyCaRelationEndpointResolver = (
  env: Readonly<Record<string, string | undefined>>,
): PortkeyCaRelationEndpointResolver => {
  if (!isObjectLike(env) || Array.isArray(env)) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "env");
  }

  return Object.freeze(({ config, signal }: PortkeyCaRelationEndpointResolutionInput) => {
    if (signal.aborted) {
      return Promise.reject(createAbortError());
    }
    const endpoint = env[config.endpointEnvKey];
    if (typeof endpoint !== "string" || endpoint.length === 0) {
      return Promise.reject(new PortkeyCaRelationProviderConfigurationError(
        "PORTKEY_CA_PROVIDER_CONFIG_INVALID",
        "endpoint",
      ));
    }
    return endpoint;
  });
};

const defaultDnsResolver: PortkeyCaRelationDnsResolver = Object.freeze(async ({
  hostname,
  signal,
}: PortkeyCaRelationDnsResolutionInput): Promise<readonly PortkeyCaRelationDnsAddress[]> => {
  if (signal.aborted) {
    throw createAbortError();
  }
  const resolved = await lookupDns(hostname, { all: true, verbatim: true });
  if (signal.aborted) {
    throw createAbortError();
  }
  return Object.freeze(resolved.flatMap(({ address, family }) =>
    family === 4 || family === 6
      ? [Object.freeze({ address, family })]
      : []));
});

export const resolvePortkeyCaRelationProviderAuthority = (
  provider: unknown,
): PortkeyCaRelationProviderAuthority | undefined => {
  if (!isObjectLike(provider)) {
    return undefined;
  }
  return providerAuthorityReaders.get(provider)?.();
};

export const createPortkeyCaRelationProvider = (
  options: CreatePortkeyCaRelationProviderOptions,
): PortkeyCaRelationProviderAdapter => {
  const normalized = normalizeOptions(options);
  const activeCalls = new Set<ActiveProviderCall>();
  let accepting = true;
  let closePromise: Promise<void> | undefined;

  const verifyRelation = (
    source: PortkeyCaRelationRequest,
    externalSignal?: AbortSignal,
  ): Promise<PortkeyCaRelationAdapterResult> => {
    const traceId = traceIdFromUnknown(source);
    if (!accepting) {
      return Promise.resolve(unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationProvider",
        traceId,
        false,
      ));
    }

    const controller = new AbortController();
    let abortKind: AbortKind | undefined;
    const abort = (kind: AbortKind) => {
      if (abortKind === undefined) {
        abortKind = kind;
        controller.abort();
      }
    };
    const promise = executeRelationLookup({
      abort,
      abortKind: () => abortKind,
      controller,
      externalSignal,
      normalized,
      source,
      traceId,
    });
    const active: ActiveProviderCall = {
      abort: () => abort("closed"),
      promise,
    };
    activeCalls.add(active);
    void promise.then(
      () => activeCalls.delete(active),
      () => activeCalls.delete(active),
    );
    return promise;
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    accepting = false;
    const pending = [...activeCalls];
    for (const call of pending) {
      call.abort();
    }
    closePromise = (async () => {
      await drainCalls(pending, normalized.shutdownTimeoutMs);
      await normalized.transport.close();
    })();
    return closePromise;
  };

  const adapter: PortkeyCaRelationProviderAdapter = Object.freeze({
    close,
    id: normalized.config.id,
    state: (): PortkeyCaRelationProviderState => Object.freeze({
      accepting,
      activeCallCount: activeCalls.size,
      environment: normalized.environment,
      productionApproved:
        normalized.environment === "production" && normalized.config.productionApproved,
    }),
    verifyRelation,
  });
  providerAuthorityReaders.set(adapter, () => Object.freeze({
    accepting,
    environment: normalized.environment,
    productionApproved:
      normalized.environment === "production" && normalized.config.productionApproved,
  }));
  return adapter;
};

async function executeRelationLookup(input: {
  abort: (kind: AbortKind) => void;
  abortKind: () => AbortKind | undefined;
  controller: AbortController;
  externalSignal?: AbortSignal;
  normalized: ReturnType<typeof normalizeOptions>;
  source: PortkeyCaRelationRequest;
  traceId: string;
}): Promise<PortkeyCaRelationAdapterResult> {
  let request: CapturedRelationRequest;
  try {
    request = captureRequest(input.source, input.traceId);
  } catch {
    return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relationRequest", input.traceId);
  }

  if (input.externalSignal?.aborted) {
    input.abort("caller");
    return abortResult("caller", request.traceId);
  }

  const onCallerAbort = () => input.abort("caller");
  input.externalSignal?.addEventListener("abort", onCallerAbort, { once: true });
  const timeout = setTimeout(() => input.abort("timeout"), input.normalized.config.timeoutMs);

  try {
    let endpoint: string | typeof ABORTED;
    try {
      endpoint = await raceWithAbort(
        Promise.resolve(input.normalized.endpointResolver({
          config: input.normalized.config,
          signal: input.controller.signal,
        })),
        input.controller.signal,
      );
    } catch {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationEndpoint",
        request.traceId,
        false,
      );
    }
    if (endpoint === ABORTED) {
      return abortResult(input.abortKind() ?? "closed", request.traceId);
    }
    const validatedEndpoint = validateEndpoint(
      endpoint,
      input.normalized.environment,
      input.normalized.approvedProductionHosts,
    );
    if (!validatedEndpoint) {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationEndpoint",
        request.traceId,
        false,
      );
    }

    let pinnedAddress: PortkeyCaRelationDnsAddress | undefined;
    if (input.normalized.environment === "production") {
      let resolvedAddresses: readonly PortkeyCaRelationDnsAddress[] | typeof ABORTED;
      try {
        resolvedAddresses = await raceWithAbort(
          Promise.resolve(input.normalized.dnsResolver({
            hostname: validatedEndpoint.hostname,
            signal: input.controller.signal,
          })),
          input.controller.signal,
        );
      } catch {
        return unavailable(
          "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
          "relationEndpoint",
          request.traceId,
          false,
        );
      }
      if (resolvedAddresses === ABORTED) {
        return abortResult(input.abortKind() ?? "closed", request.traceId);
      }
      pinnedAddress = selectGloballyRoutableAddress(resolvedAddresses);
      if (!pinnedAddress) {
        return unavailable(
          "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
          "relationEndpoint",
          request.traceId,
          false,
        );
      }
    }

    const body = JSON.stringify({
      caAddress: request.caAddressHint,
      caHash: request.caHash,
      chainId: request.chainId,
      managerAddress: request.managerAddress,
      version: PORTKEY_CA_RELATION_QUERY_VERSION,
    });
    let response: Response | typeof ABORTED;
    try {
      response = await raceWithAbort(
        Promise.resolve(input.normalized.transport.execute({
          body,
          endpoint: validatedEndpoint.endpoint,
          headers: Object.freeze({
            "accept": "application/json",
            "content-type": "application/json; charset=utf-8",
            "x-trace-id": request.traceId,
          }),
          ...(pinnedAddress === undefined ? {} : { pinnedAddress }),
          signal: input.controller.signal,
        })),
        input.controller.signal,
      );
    } catch {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationTransport",
        request.traceId,
        true,
      );
    }
    if (response === ABORTED) {
      return abortResult(input.abortKind() ?? "closed", request.traceId);
    }

    const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
    if (response.status === 429) {
      await cancelBody(response.body);
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationProvider",
        request.traceId,
        true,
        retryAfterMs,
      );
    }
    if (response.status >= 500 && response.status <= 599) {
      await cancelBody(response.body);
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationProvider",
        request.traceId,
        true,
      );
    }
    if (response.status !== 200) {
      await cancelBody(response.body);
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationProvider",
        request.traceId,
        false,
      );
    }

    const bounded = await readBoundedJson(
      response,
      input.normalized.maxResponseBytes,
      input.controller.signal,
    );
    if (bounded === ABORTED) {
      return abortResult(input.abortKind() ?? "closed", request.traceId);
    }
    if (!bounded.ok) {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationResponse",
        request.traceId,
        false,
      );
    }

    const parsed = parseRelationResponse(bounded.body);
    if (parsed.status === "unknown") {
      return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relation", request.traceId);
    }
    if (parsed.status === "invalid") {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "relationResponse",
        request.traceId,
        false,
      );
    }

    const nowMs = readClockMs(input.normalized.clock);
    if (nowMs === undefined) {
      return unavailable(
        "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
        "clock",
        request.traceId,
        false,
      );
    }
    if (!isFresh(parsed.relation, nowMs, input.normalized.freshnessPolicy)) {
      return rejected("WALLET_AUTH_CA_RELATION_STALE", "relation", request.traceId);
    }
    if (!relationMatchesRequest(parsed.relation, request)) {
      return rejected("WALLET_AUTH_CA_RELATION_REJECTED", "relation", request.traceId);
    }
    if (input.controller.signal.aborted) {
      return abortResult(input.abortKind() ?? "closed", request.traceId);
    }

    return Object.freeze({
      caAddress: parsed.relation.caAddress,
      caHash: parsed.relation.caHash,
      chainId: parsed.relation.chainId,
      managerAddress: parsed.relation.managerAddress,
      relationDigest: digestRelation(parsed.relation),
      relationRevision: parsed.relation.relationRevision,
      status: "verified" as const,
    });
  } catch {
    return unavailable(
      "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
      "relationProvider",
      request.traceId,
      false,
    );
  } finally {
    clearTimeout(timeout);
    input.externalSignal?.removeEventListener("abort", onCallerAbort);
  }
}

function normalizeOptions(options: CreatePortkeyCaRelationProviderOptions) {
  if (!isPlainRecord(options)) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "options");
  }
  const config = copyConfig(options.config);
  if (
    options.environment !== "local"
    && options.environment !== "stage"
    && options.environment !== "production"
  ) {
    return failConfiguration("PORTKEY_CA_PROVIDER_ENVIRONMENT_INVALID", "environment");
  }
  if (options.environment === "production" && !config.productionApproved) {
    return failConfiguration(
      "PORTKEY_CA_PROVIDER_PRODUCTION_APPROVAL_REQUIRED",
      "config.productionApproved",
    );
  }
  if (
    typeof options.endpointResolver !== "function"
    || !isObjectLike(options.clock)
    || typeof options.clock.now !== "function"
    || (options.dnsResolver !== undefined && typeof options.dnsResolver !== "function")
  ) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "options");
  }

  const approvedProductionHosts = normalizeApprovedProductionHosts(
    options.approvedProductionHosts,
    options.environment,
  );
  const freshnessPolicy = normalizeFreshnessPolicy(options.freshnessPolicy);
  const maxResponseBytes = boundedInteger(
    options.maxResponseBytes,
    PORTKEY_CA_RELATION_DEFAULT_MAX_RESPONSE_BYTES,
    MIN_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
    "maxResponseBytes",
  );
  const shutdownTimeoutMs = boundedInteger(
    options.shutdownTimeoutMs,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
    1,
    10_000,
    "shutdownTimeoutMs",
  );
  const transport = normalizeTransport(options.transport, options.environment);

  return Object.freeze({
    approvedProductionHosts,
    clock: options.clock,
    config,
    dnsResolver: options.dnsResolver ?? defaultDnsResolver,
    endpointResolver: options.endpointResolver,
    environment: options.environment,
    freshnessPolicy,
    maxResponseBytes,
    shutdownTimeoutMs,
    transport,
  });
}

function normalizeApprovedProductionHosts(
  value: readonly string[] | undefined,
  environment: WalletAuthenticationEnvironment,
): ReadonlySet<string> {
  if (value === undefined) {
    if (environment === "production") {
      return failConfiguration(
        "PORTKEY_CA_PROVIDER_PRODUCTION_APPROVAL_REQUIRED",
        "approvedProductionHosts",
      );
    }
    return new Set<string>();
  }
  if (
    !Array.isArray(value)
    || value.length > MAX_APPROVED_PRODUCTION_HOSTS
    || (environment === "production" && value.length === 0)
  ) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "approvedProductionHosts");
  }

  const normalized = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    const candidate = descriptor && "value" in descriptor ? descriptor.value : undefined;
    if (typeof candidate !== "string") {
      return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "approvedProductionHosts");
    }
    const hostname = candidate.toLowerCase();
    if (
      candidate !== candidate.trim()
      || !isCanonicalProductionHostname(hostname)
      || normalized.has(hostname)
    ) {
      return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "approvedProductionHosts");
    }
    normalized.add(hostname);
  }
  return normalized;
}

function isCanonicalProductionHostname(value: string): boolean {
  if (
    value.length === 0
    || value.length > 253
    || value.endsWith(".")
    || !value.includes(".")
    || isIP(value) !== 0
    || !/^[a-z0-9.-]+$/.test(value)
  ) {
    return false;
  }
  return value.split(".").every((label) =>
    label.length > 0
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
}

function normalizeTransport(
  value: PortkeyCaRelationTransport | undefined,
  environment: WalletAuthenticationEnvironment,
): PortkeyCaRelationTransport {
  const transport = value ?? createNodePortkeyCaRelationTransport();
  if (
    !isObjectLike(transport)
    || typeof transport.close !== "function"
    || typeof transport.execute !== "function"
  ) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "transport");
  }
  if (environment === "production" && !productionTransportAuthorities.has(transport)) {
    return failConfiguration("PORTKEY_CA_PROVIDER_PRODUCTION_APPROVAL_REQUIRED", "transport");
  }
  return Object.freeze({
    close: transport.close.bind(transport),
    execute: transport.execute.bind(transport),
  });
}

export function createNodePortkeyCaRelationTransport(): PortkeyCaRelationTransport {
  const httpAgent = new HttpAgent({ keepAlive: true, maxFreeSockets: 4, maxSockets: 16 });
  const httpsAgent = new HttpsAgent({ keepAlive: true, maxFreeSockets: 4, maxSockets: 16 });
  // A pinned request must not reuse a socket established for an earlier DNS answer.
  const pinnedHttpAgent = new HttpAgent({ keepAlive: false, maxSockets: 16 });
  const pinnedHttpsAgent = new HttpsAgent({ keepAlive: false, maxSockets: 16 });
  const requests = new Set<ClientRequest>();
  const sockets = new Set<Socket>();
  let closed = false;
  let closePromise: Promise<void> | undefined;

  const trackSocket = (socket: Socket): void => {
    if (!sockets.has(socket)) {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    }
    if (closed) {
      socket.destroy();
    }
  };

  const execute = (input: PortkeyCaRelationTransportRequest): Promise<Response> => {
    if (closed) {
      return Promise.reject(createSafeTransportError());
    }
    return new Promise<Response>((resolve, reject) => {
      try {
        const endpoint = new URL(input.endpoint);
        const hostname = endpoint.hostname.toLowerCase().replace(/^\[|\]$/g, "");
        const lookup = input.pinnedAddress
          ? createPinnedLookup(hostname, input.pinnedAddress)
          : undefined;
        const onResponse = (response: IncomingMessage): void => {
          try {
            const status = response.statusCode;
            if (status === undefined || status < 200 || status > 599) {
              response.destroy();
              reject(createSafeTransportError());
              return;
            }
            const body = Readable.toWeb(response) as unknown as ReadableStream<Uint8Array>;
            resolve(new Response(body, {
              headers: copyIncomingHeaders(response),
              status,
            }));
          } catch {
            response.destroy();
            reject(createSafeTransportError());
          }
        };
        const request = endpoint.protocol === "https:"
          ? requestHttps(endpoint, {
            agent: input.pinnedAddress ? pinnedHttpsAgent : httpsAgent,
            headers: input.headers,
            lookup,
            method: "POST",
            servername: isIP(hostname) === 0 ? hostname : "",
            signal: input.signal,
          }, onResponse)
          : requestHttp(endpoint, {
            agent: input.pinnedAddress ? pinnedHttpAgent : httpAgent,
            headers: input.headers,
            lookup,
            method: "POST",
            signal: input.signal,
          }, onResponse);
        request.once("socket", trackSocket);
        requests.add(request);
        request.once("close", () => requests.delete(request));
        request.once("error", () => reject(createSafeTransportError()));
        request.end(input.body, "utf8");
      } catch {
        reject(createSafeTransportError());
      }
    });
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    closed = true;
    closePromise = (async () => {
      const requestClosures = [...requests].map(waitForRequestClose);
      const socketClosures = [...sockets].map(waitForSocketClose);
      for (const request of requests) {
        request.destroy();
      }
      httpAgent.destroy();
      httpsAgent.destroy();
      pinnedHttpAgent.destroy();
      pinnedHttpsAgent.destroy();
      await Promise.all([...requestClosures, ...socketClosures]);
    })();
    return closePromise;
  };

  const transport = Object.freeze({ close, execute });
  productionTransportAuthorities.add(transport);
  return transport;
}

function createPinnedLookup(
  expectedHostname: string,
  pinnedAddress: PortkeyCaRelationDnsAddress,
): LookupFunction {
  return (hostname, options, callback) => {
    if (hostname.toLowerCase().replace(/^\[|\]$/g, "") !== expectedHostname) {
      callback(createSafeTransportError(), "", pinnedAddress.family);
      return;
    }
    if (options.all) {
      callback(null, [pinnedAddress]);
      return;
    }
    callback(null, pinnedAddress.address, pinnedAddress.family);
  };
}

function copyIncomingHeaders(response: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

function waitForSocketClose(socket: Socket): Promise<void> {
  return new Promise((resolve) => socket.once("close", resolve));
}

function waitForRequestClose(request: ClientRequest): Promise<void> {
  return new Promise((resolve) => request.once("close", resolve));
}

function createSafeTransportError(): Error {
  const error = new Error("Portkey CA relation transport failed.");
  error.name = "PortkeyCaRelationTransportError";
  delete error.stack;
  return error;
}

function copyConfig(value: unknown): WalletCaRelationProviderConfig {
  if (!isPlainRecord(value) || !hasExactFields(value, configFields)) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "config");
  }
  const enabled = ownDataValue(value, "enabled");
  const endpointEnvKey = ownDataValue(value, "endpointEnvKey");
  const id = ownDataValue(value, "id");
  const productionApproved = ownDataValue(value, "productionApproved");
  const timeoutMs = ownDataValue(value, "timeoutMs");
  if (
    enabled !== true
    || typeof endpointEnvKey !== "string"
    || endpointEnvKey.length > 128
    || !/^CAMPAIGN_OS_[A-Z0-9_]+$/.test(endpointEnvKey)
    || typeof id !== "string"
    || id.length === 0
    || id.length > 64
    || !/^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/.test(id)
    || typeof productionApproved !== "boolean"
    || !Number.isSafeInteger(timeoutMs)
    || (timeoutMs as number) < MIN_TIMEOUT_MS
    || (timeoutMs as number) > MAX_TIMEOUT_MS
  ) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "config");
  }
  return Object.freeze({
    enabled,
    endpointEnvKey,
    id,
    productionApproved,
    timeoutMs: timeoutMs as number,
  });
}

function normalizeFreshnessPolicy(
  value: PortkeyCaRelationFreshnessPolicy | undefined,
): NormalizedFreshnessPolicy {
  const policy = value;
  if (value !== undefined && !isPlainRecord(value)) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", "freshnessPolicy");
  }
  return Object.freeze({
    maxAgeMs: boundedInteger(
      policy?.maxAgeMs,
      PORTKEY_CA_RELATION_DEFAULT_MAX_AGE_MS,
      1,
      MAX_FRESHNESS_AGE_MS,
      "freshnessPolicy.maxAgeMs",
    ),
    maxFutureSkewMs: boundedInteger(
      policy?.maxFutureSkewMs,
      DEFAULT_FUTURE_SKEW_MS,
      0,
      MAX_FUTURE_SKEW_MS,
      "freshnessPolicy.maxFutureSkewMs",
    ),
    minimumBlockHeight: boundedInteger(
      policy?.minimumBlockHeight,
      0,
      0,
      Number.MAX_SAFE_INTEGER,
      "freshnessPolicy.minimumBlockHeight",
    ),
    minimumRelationVersion: boundedInteger(
      policy?.minimumRelationVersion,
      1,
      1,
      Number.MAX_SAFE_INTEGER,
      "freshnessPolicy.minimumRelationVersion",
    ),
  });
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  field: string,
): number {
  const candidate = value ?? fallback;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    return failConfiguration("PORTKEY_CA_PROVIDER_CONFIG_INVALID", field);
  }
  return candidate;
}

function captureRequest(source: unknown, fallbackTraceId: string): CapturedRelationRequest {
  if (!isPlainRecord(source) || !hasExactFields(source, requestFields)) {
    throw new TypeError("Invalid relation request.");
  }
  const caAddressHint = ownDataValue(source, "caAddressHint");
  const caHash = ownDataValue(source, "caHash");
  const chainId = ownDataValue(source, "chainId");
  const managerAddress = ownDataValue(source, "managerAddress");
  const traceId = ownDataValue(source, "traceId");
  if (
    !isCanonicalAelfWalletAddress(caAddressHint)
    || typeof caHash !== "string"
    || !/^[a-f0-9]{64}$/.test(caHash)
    || !isCanonicalLiveWalletChainId(chainId)
    || !isCanonicalAelfWalletAddress(managerAddress)
  ) {
    throw new TypeError("Invalid relation request.");
  }
  return Object.freeze({
    caAddressHint,
    caHash,
    chainId,
    managerAddress,
    traceId: safeTraceId(traceId, fallbackTraceId),
  });
}

function parseRelationResponse(value: unknown):
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "unknown" }>
  | Readonly<{ relation: CurrentRelationResponse; status: "current" }> {
  if (!isPlainRecord(value)) {
    return { status: "invalid" };
  }
  const status = ownDataValueOrUndefined(value, "status");
  const version = ownDataValueOrUndefined(value, "version");
  if (
    status === "unknown"
    && version === PORTKEY_CA_RELATION_RESPONSE_VERSION
    && hasExactFields(value, unknownResponseFields)
  ) {
    return { status: "unknown" };
  }
  if (
    status !== "current"
    || version !== PORTKEY_CA_RELATION_RESPONSE_VERSION
    || !hasExactFields(value, currentResponseFields)
  ) {
    return { status: "invalid" };
  }
  const relation = {
    blockHeight: ownDataValueOrUndefined(value, "blockHeight"),
    caAddress: ownDataValueOrUndefined(value, "caAddress"),
    caHash: ownDataValueOrUndefined(value, "caHash"),
    chainId: ownDataValueOrUndefined(value, "chainId"),
    managerAddress: ownDataValueOrUndefined(value, "managerAddress"),
    observedAt: ownDataValueOrUndefined(value, "observedAt"),
    relationRevision: ownDataValueOrUndefined(value, "relationRevision"),
    relationVersion: ownDataValueOrUndefined(value, "relationVersion"),
    status,
    version,
  };
  if (
    !Number.isSafeInteger(relation.blockHeight)
    || (relation.blockHeight as number) < 0
    || !isCanonicalAelfWalletAddress(relation.caAddress)
    || typeof relation.caHash !== "string"
    || !/^[a-f0-9]{64}$/.test(relation.caHash)
    || !isCanonicalLiveWalletChainId(relation.chainId)
    || !isCanonicalAelfWalletAddress(relation.managerAddress)
    || !isCanonicalInstant(relation.observedAt)
    || typeof relation.relationRevision !== "string"
    || relation.relationRevision.length === 0
    || relation.relationRevision.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(relation.relationRevision)
    || !Number.isSafeInteger(relation.relationVersion)
    || (relation.relationVersion as number) < 1
  ) {
    return { status: "invalid" };
  }
  return Object.freeze({
    relation: Object.freeze(relation) as CurrentRelationResponse,
    status: "current" as const,
  });
}

function relationMatchesRequest(
  relation: CurrentRelationResponse,
  request: CapturedRelationRequest,
): boolean {
  return safeTextEqual(relation.caAddress, request.caAddressHint)
    && safeTextEqual(relation.caHash, request.caHash)
    && relation.chainId === request.chainId
    && safeTextEqual(relation.managerAddress, request.managerAddress);
}

function isFresh(
  relation: CurrentRelationResponse,
  nowMs: number,
  policy: NormalizedFreshnessPolicy,
): boolean {
  const observedAtMs = Date.parse(relation.observedAt);
  return observedAtMs <= nowMs + policy.maxFutureSkewMs
    && nowMs - observedAtMs <= policy.maxAgeMs
    && relation.blockHeight >= policy.minimumBlockHeight
    && relation.relationVersion >= policy.minimumRelationVersion;
}

function digestRelation(relation: CurrentRelationResponse): string {
  return createHash("sha256")
    .update("campaign-os-portkey-ca-lineage/v1\0", "utf8")
    .update(relation.caHash, "ascii")
    .update("\0", "utf8")
    .update(relation.caAddress, "utf8")
    .update("\0", "utf8")
    .update(relation.managerAddress, "utf8")
    .update("\0", "utf8")
    .update(relation.chainId, "ascii")
    .update("\0", "utf8")
    .update(relation.relationRevision, "utf8")
    .update("\0", "utf8")
    .update(String(relation.relationVersion), "ascii")
    .update("\0", "utf8")
    .update(String(relation.blockHeight), "ascii")
    .update("\0", "utf8")
    .update(relation.observedAt, "ascii")
    .digest("hex");
}

async function readBoundedJson(
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<
  | typeof ABORTED
  | Readonly<{ ok: false }>
  | Readonly<{ body: unknown; ok: true }>
> {
  const contentLength = parseContentLength(response.headers.get("content-length"));
  if (contentLength !== undefined && contentLength > maximumBytes) {
    await cancelBody(response.body);
    return { ok: false };
  }
  if (!isJsonContentType(response.headers.get("content-type"))) {
    await cancelBody(response.body);
    return { ok: false };
  }
  if (!response.body) {
    return { ok: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    while (true) {
      if (signal.aborted) {
        await safeCancelReader(reader);
        return ABORTED;
      }
      const read = await raceWithAbort(reader.read(), signal);
      if (read === ABORTED) {
        await safeCancelReader(reader);
        return ABORTED;
      }
      if (read.done) {
        break;
      }
      if (read.value) {
        byteCount += read.value.byteLength;
        if (byteCount > maximumBytes) {
          await safeCancelReader(reader);
          return { ok: false };
        }
        chunks.push(Uint8Array.from(read.value));
      }
    }
  } catch {
    return signal.aborted ? ABORTED : { ok: false };
  } finally {
    reader.releaseLock();
  }
  if (byteCount === 0) {
    return { ok: false };
  }

  const bytes = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { body: JSON.parse(text) as unknown, ok: true };
  } catch {
    return { ok: false };
  }
}

async function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | typeof ABORTED> {
  if (signal.aborted) {
    return ABORTED;
  }
  let remove: () => void = () => {};
  const aborted = new Promise<typeof ABORTED>((resolve) => {
    const onAbort = () => resolve(ABORTED);
    signal.addEventListener("abort", onAbort, { once: true });
    remove = () => signal.removeEventListener("abort", onAbort);
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    remove();
  }
}

async function drainCalls(calls: readonly ActiveProviderCall[], timeoutMs: number): Promise<void> {
  if (calls.length === 0) {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([
    Promise.allSettled(calls.map(({ promise }) => promise)).then(() => undefined),
    timeout,
  ]);
  if (timer !== undefined) {
    clearTimeout(timer);
  }
}

function rejected(
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
): PortkeyCaRelationAdapterResult {
  return Object.freeze({
    diagnostic: createWalletAuthenticationDiagnostic({ code, field, traceId }),
    retryable: false,
    status: "rejected" as const,
  });
}

function unavailable(
  code: `WALLET_AUTH_${string}`,
  field: string,
  traceId: string,
  retryable: boolean,
  retryAfterMs?: number,
): PortkeyCaRelationAdapterResult {
  return Object.freeze({
    diagnostic: createWalletAuthenticationDiagnostic({ code, field, traceId }),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    retryable,
    status: "unavailable" as const,
  });
}

function abortResult(kind: AbortKind, traceId: string): PortkeyCaRelationAdapterResult {
  return unavailable(
    "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
    "relationProvider",
    traceId,
    kind === "timeout",
  );
}

function validateEndpoint(
  value: unknown,
  environment: WalletAuthenticationEnvironment,
  approvedProductionHosts: ReadonlySet<string>,
): ValidatedEndpoint | undefined {
  if (
    typeof value !== "string"
    || value.length === 0
    || new TextEncoder().encode(value).byteLength > MAX_ENDPOINT_BYTES
  ) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }
  if (
    parsed.href !== value
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.hash !== ""
    || parsed.search !== ""
  ) {
    return undefined;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const loopback = isLoopbackHostname(hostname);
  if (environment === "production") {
    if (
      parsed.protocol !== "https:"
      || loopback
      || isIP(hostname) !== 0
      || !approvedProductionHosts.has(hostname)
    ) {
      return undefined;
    }
  } else if (!loopback || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    return undefined;
  }
  return Object.freeze({ endpoint: value, hostname });
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") {
    return true;
  }
  const octets = normalized.split(".");
  return octets.length === 4
    && octets[0] === "127"
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

function selectGloballyRoutableAddress(
  value: readonly PortkeyCaRelationDnsAddress[],
): PortkeyCaRelationDnsAddress | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_DNS_ADDRESSES) {
    return undefined;
  }
  let selected: PortkeyCaRelationDnsAddress | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    const candidate = descriptor && "value" in descriptor ? descriptor.value : undefined;
    if (!isPlainRecord(candidate) || !hasExactFields(candidate, dnsAddressFields)) {
      return undefined;
    }
    const address = ownDataValue(candidate, "address");
    const family = ownDataValue(candidate, "family");
    if (
      typeof address !== "string"
      || (family !== 4 && family !== 6)
      || isIP(address) !== family
      || !isGloballyRoutableAddress(address, family)
    ) {
      return undefined;
    }
    selected ??= Object.freeze({ address, family });
  }
  return selected;
}

function isGloballyRoutableAddress(address: string, family: 4 | 6): boolean {
  return family === 4
    ? isGloballyRoutableIpv4(address)
    : isGloballyRoutableIpv6(address);
}

function isGloballyRoutableIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4
    || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }
  const [first, second, third] = octets as [number, number, number, number];
  return first !== 0
    && first !== 10
    && first !== 127
    && first < 224
    && !(first === 100 && second >= 64 && second <= 127)
    && !(first === 169 && second === 254)
    && !(first === 172 && second >= 16 && second <= 31)
    && !(first === 192 && second === 0 && (third === 0 || third === 2))
    && !(first === 192 && second === 31 && third === 196)
    && !(first === 192 && second === 52 && third === 193)
    && !(first === 192 && second === 88 && third === 99)
    && !(first === 192 && second === 168)
    && !(first === 192 && second === 175 && third === 48)
    && !(first === 198 && (second === 18 || second === 19))
    && !(first === 198 && second === 51 && third === 100)
    && !(first === 203 && second === 0 && third === 113);
}

function isGloballyRoutableIpv6(address: string): boolean {
  const words = parseIpv6Words(address);
  if (!words || (words[0]! & 0xe000) !== 0x2000) {
    return false;
  }
  if (
    (words[0] === 0x2001 && (words[1]! <= 0x01ff || words[1] === 0x0db8))
    || words[0] === 0x2002
    || (words[0] === 0x3fff && (words[1]! & 0xf000) === 0)
    || (words[0] === 0x2620 && words[1] === 0x004f && words[2] === 0x8000)
  ) {
    return false;
  }
  return true;
}

function parseIpv6Words(address: string): readonly number[] | undefined {
  if (isIP(address) !== 6 || address.includes("%")) {
    return undefined;
  }
  let source = address.toLowerCase();
  if (source.includes(".")) {
    const lastColon = source.lastIndexOf(":");
    const ipv4 = source.slice(lastColon + 1).split(".").map(Number);
    if (
      lastColon < 0
      || ipv4.length !== 4
      || ipv4.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return undefined;
    }
    source = `${source.slice(0, lastColon)}:${((ipv4[0]! << 8) | ipv4[1]!).toString(16)}`
      + `:${((ipv4[2]! << 8) | ipv4[3]!).toString(16)}`;
  }

  const halves = source.split("::");
  if (halves.length > 2) {
    return undefined;
  }
  const left = halves[0] === "" ? [] : halves[0]!.split(":");
  const right = halves.length === 1 || halves[1] === "" ? [] : halves[1]!.split(":");
  if (
    [...left, ...right].some((word) => !/^[a-f0-9]{1,4}$/.test(word))
    || (halves.length === 1 && left.length !== 8)
  ) {
    return undefined;
  }
  const omitted = 8 - left.length - right.length;
  if ((halves.length === 2 && omitted < 1) || omitted < 0) {
    return undefined;
  }
  return [
    ...left.map((word) => Number.parseInt(word, 16)),
    ...Array.from({ length: omitted }, () => 0),
    ...right.map((word) => Number.parseInt(word, 16)),
  ];
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds)) {
    return MAX_RETRY_AFTER_MS;
  }
  return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
}

function parseContentLength(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isJsonContentType(value: string | null): boolean {
  if (value === null) {
    return false;
  }
  const mediaType = value.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(mediaType ?? "");
}

function safeTextEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

function readClockMs(clock: WalletAuthenticationClock): number | undefined {
  try {
    const value = clock.now();
    return isDate(value) && Number.isFinite(value.getTime()) ? value.getTime() : undefined;
  } catch {
    return undefined;
  }
}

function isCanonicalInstant(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 32
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function safeTraceId(value: unknown, fallback = "wallet-auth-ca-relation"): string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : fallback;
}

function traceIdFromUnknown(value: unknown): string {
  try {
    if (!isPlainRecord(value)) {
      return "wallet-auth-ca-relation";
    }
    return safeTraceId(ownDataValueOrUndefined(value, "traceId"));
  } catch {
    return "wallet-auth-ca-relation";
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isObjectLike(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function hasExactFields(record: Record<string, unknown>, fields: ReadonlySet<string>): boolean {
  const keys = Reflect.ownKeys(record);
  return keys.length === fields.size
    && keys.every((key) => typeof key === "string" && fields.has(key));
}

function ownDataValue(record: Record<string, unknown>, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError("Expected an own data field.");
  }
  return descriptor.value;
}

function ownDataValueOrUndefined(record: Record<string, unknown>, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor?.enumerable && "value" in descriptor ? descriptor.value : undefined;
}

async function cancelBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  try {
    await body?.cancel();
  } catch {
    // The safe result is already selected; transport cleanup remains best effort.
  }
}

async function safeCancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // The byte/abort boundary is already enforced.
  }
}

function createAbortError(): Error {
  const error = new Error("Operation aborted.");
  error.name = "AbortError";
  delete error.stack;
  return error;
}
