import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { resolve } from "node:path";
import AElf from "aelf-sdk";
import {
  isCanonicalLiveWalletChainId,
  type CanonicalLiveWalletChainId,
} from "../domain/wallet";
import {
  PORTKEY_CA_RELATION_QUERY_VERSION,
  PORTKEY_CA_RELATION_RESPONSE_VERSION,
} from "./portkeyCaRelationProvider";
import { isCanonicalAelfWalletAddress } from "./walletAuthenticationChallenge";

export type PortkeyCaRelationSandboxScenario =
  | "current"
  | "unknown"
  | "rotated"
  | "wrong-manager"
  | "wrong-ca-address"
  | "wrong-ca-hash"
  | "wrong-chain"
  | "stale-time"
  | "stale-block"
  | "stale-version"
  | "429"
  | "5xx"
  | "malformed"
  | "unknown-field"
  | "oversized"
  | "chunked"
  | "timeout"
  | "abort";

export const PORTKEY_CA_RELATION_SANDBOX_SCENARIOS:
readonly PortkeyCaRelationSandboxScenario[] = Object.freeze([
  "current",
  "unknown",
  "rotated",
  "wrong-manager",
  "wrong-ca-address",
  "wrong-ca-hash",
  "wrong-chain",
  "stale-time",
  "stale-block",
  "stale-version",
  "429",
  "5xx",
  "malformed",
  "unknown-field",
  "oversized",
  "chunked",
  "timeout",
  "abort",
]);

export const PORTKEY_CA_RELATION_SANDBOX_DEFAULT_HOST = "127.0.0.1";
export const PORTKEY_CA_RELATION_SANDBOX_DEFAULT_PORT = 5_196;
export const PORTKEY_CA_RELATION_SANDBOX_DEFAULT_MAX_REQUEST_RECORDS = 64;

export interface PortkeyCaRelationSandboxFixture {
  readonly blockHeight: number;
  readonly caAddress: string;
  readonly caHash: string;
  readonly chainId: CanonicalLiveWalletChainId;
  readonly managerAddress: string;
  readonly observedAt: string;
  readonly relationRevision: string;
  readonly relationVersion: number;
}

export interface PortkeyCaRelationSandboxSafeRequest {
  readonly requestNumber: number;
  readonly scenario: PortkeyCaRelationSandboxScenario;
  readonly traceId: string;
}

export interface PortkeyCaRelationSandboxState {
  readonly accepting: boolean;
  readonly activeRequestCount: number;
  readonly counts: Readonly<Record<PortkeyCaRelationSandboxScenario, number>>;
  readonly droppedRequestRecordCount: number;
  readonly lifecycle: "listening" | "closing" | "closed";
  readonly listenerCount: number;
  readonly recentRequests: readonly PortkeyCaRelationSandboxSafeRequest[];
  readonly requestCount: number;
  readonly retainedRequestCount: number;
  readonly socketCount: number;
  readonly timerCount: number;
}

export interface PortkeyCaRelationSandboxHandle {
  readonly host: string;
  readonly port: number;
  readonly relationUrl: string;
  close(): Promise<void>;
  count(scenario?: PortkeyCaRelationSandboxScenario): number;
  state(): PortkeyCaRelationSandboxState;
  urlForScenario(scenario: PortkeyCaRelationSandboxScenario): string;
}

export interface PortkeyCaRelationSandboxController {
  close(): Promise<void>;
  start(): Promise<PortkeyCaRelationSandboxHandle>;
}

export interface StartPortkeyCaRelationSandboxOptions {
  readonly fixture?: PortkeyCaRelationSandboxFixture;
  readonly host?: string;
  readonly maxRequestBodyBytes?: number;
  readonly maxRequestRecords?: number;
  readonly oversizedResponseBytes?: number;
  readonly port?: number;
  readonly shutdownTimeoutMs?: number;
  readonly streamChunkBytes?: number;
  readonly streamIntervalMs?: number;
  readonly timeoutFixtureMs?: number;
}

export interface RunPortkeyCaRelationSandboxCliOptions {
  readonly argv?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stderr?: (line: string) => void;
  readonly stdout?: (line: string) => void;
}

export type PortkeyCaRelationSandboxErrorCode =
  | "PORTKEY_CA_SANDBOX_ALREADY_CLOSED"
  | "PORTKEY_CA_SANDBOX_CLI_INVALID_ARGUMENT"
  | "PORTKEY_CA_SANDBOX_INVALID_OPTION"
  | "PORTKEY_CA_SANDBOX_INVALID_PORT"
  | "PORTKEY_CA_SANDBOX_NON_LOOPBACK_HOST"
  | "PORTKEY_CA_SANDBOX_START_FAILED"
  | "PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED";

const ERROR_MESSAGES: Readonly<Record<PortkeyCaRelationSandboxErrorCode, string>> =
  Object.freeze({
    PORTKEY_CA_SANDBOX_ALREADY_CLOSED: "Portkey CA relation sandbox is closed.",
    PORTKEY_CA_SANDBOX_CLI_INVALID_ARGUMENT:
      "Portkey CA relation sandbox CLI arguments are invalid.",
    PORTKEY_CA_SANDBOX_INVALID_OPTION: "Portkey CA relation sandbox options are invalid.",
    PORTKEY_CA_SANDBOX_INVALID_PORT: "Portkey CA relation sandbox port is invalid.",
    PORTKEY_CA_SANDBOX_NON_LOOPBACK_HOST:
      "Portkey CA relation sandbox requires a loopback host.",
    PORTKEY_CA_SANDBOX_START_FAILED: "Portkey CA relation sandbox failed to start.",
    PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED:
      "Portkey CA relation sandbox refuses static secret configuration.",
  });

export class PortkeyCaRelationSandboxError extends Error {
  readonly code: PortkeyCaRelationSandboxErrorCode;

  constructor(code: PortkeyCaRelationSandboxErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "PortkeyCaRelationSandboxError";
    this.code = code;
    delete this.stack;
  }
}

interface NormalizedSandboxOptions {
  readonly fixture: PortkeyCaRelationSandboxFixture;
  readonly host: string;
  readonly maxRequestBodyBytes: number;
  readonly maxRequestRecords: number;
  readonly oversizedResponseBytes: number;
  readonly port: number;
  readonly shutdownTimeoutMs: number;
  readonly streamChunkBytes: number;
  readonly streamIntervalMs: number;
  readonly timeoutFixtureMs: number;
}

interface MutableSafeRequest {
  requestNumber: number;
  scenario: PortkeyCaRelationSandboxScenario;
  traceId: string;
}

interface ActiveRequestResource {
  readonly abort: () => void;
  readonly cancelled: () => boolean;
  readonly schedule: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
}

class RequestBodyTooLargeError extends Error {}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SCENARIO_SET = new Set(PORTKEY_CA_RELATION_SANDBOX_SCENARIOS);
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const DEFAULT_MAX_REQUEST_BODY_BYTES = 4 * 1_024;
const DEFAULT_OVERSIZED_RESPONSE_BYTES = 64 * 1_024 + 1;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_000;
const DEFAULT_STREAM_CHUNK_BYTES = 1_024;
const DEFAULT_STREAM_INTERVAL_MS = 5;
const DEFAULT_TIMEOUT_FIXTURE_MS = 30_000;
const optionFields = new Set([
  "fixture",
  "host",
  "maxRequestBodyBytes",
  "maxRequestRecords",
  "oversizedResponseBytes",
  "port",
  "shutdownTimeoutMs",
  "streamChunkBytes",
  "streamIntervalMs",
  "timeoutFixtureMs",
]);
const fixtureFields = new Set([
  "blockHeight",
  "caAddress",
  "caHash",
  "chainId",
  "managerAddress",
  "observedAt",
  "relationRevision",
  "relationVersion",
]);
const queryFields = new Set([
  "caAddress",
  "caHash",
  "chainId",
  "managerAddress",
  "version",
]);
const SANDBOX_ENV_PREFIX = "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_";
const allowedSandboxEnvKeys = new Set([
  "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_HOST",
  "CAMPAIGN_OS_PORTKEY_CA_SANDBOX_PORT",
]);

export const createPortkeyCaRelationSandbox = (
  options: StartPortkeyCaRelationSandboxOptions = {},
): PortkeyCaRelationSandboxController => {
  let startPromise: Promise<PortkeyCaRelationSandboxHandle> | undefined;
  let closePromise: Promise<void> | undefined;
  let closeRequested = false;

  const start = (): Promise<PortkeyCaRelationSandboxHandle> => {
    if (startPromise) {
      return startPromise;
    }
    if (closeRequested) {
      return Promise.reject(new PortkeyCaRelationSandboxError(
        "PORTKEY_CA_SANDBOX_ALREADY_CLOSED",
      ));
    }
    startPromise = Promise.resolve()
      .then(() => startSandboxServer(normalizeOptions(options)))
      .then(async (handle) => {
        if (closeRequested) {
          await handle.close();
        }
        return handle;
      });
    return startPromise;
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    closeRequested = true;
    closePromise = startPromise
      ? startPromise.then((handle) => handle.close(), () => undefined)
      : Promise.resolve();
    return closePromise;
  };

  return Object.freeze({ close, start });
};

export const startPortkeyCaRelationSandbox = (
  options: StartPortkeyCaRelationSandboxOptions = {},
): Promise<PortkeyCaRelationSandboxHandle> => createPortkeyCaRelationSandbox(options).start();

async function startSandboxServer(
  options: NormalizedSandboxOptions,
): Promise<PortkeyCaRelationSandboxHandle> {
  const counts = createCounts();
  const records = new Array<MutableSafeRequest | undefined>(options.maxRequestRecords);
  const sockets = new Set<Socket>();
  const activeRequests = new Set<ActiveRequestResource>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const alternateManager = ephemeralAddress();
  const alternateCa = ephemeralAddress();
  let accepting = true;
  let lifecycle: PortkeyCaRelationSandboxState["lifecycle"] = "listening";
  let requestCount = 0;
  let retainedRequestCount = 0;
  let droppedRequestRecordCount = 0;
  let nextRecordIndex = 0;
  let closePromise: Promise<void> | undefined;

  const clearTrackedTimer = (timer: ReturnType<typeof setTimeout> | undefined) => {
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    timers.delete(timer);
  };
  const schedule = (callback: () => void, delayMs: number) => {
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delayMs);
    timers.add(timer);
    return timer;
  };
  const recordRequest = (
    scenario: PortkeyCaRelationSandboxScenario,
    traceId: string,
  ) => {
    requestCount = increment(requestCount);
    counts[scenario] = increment(counts[scenario]);
    if (records.length === 0) {
      droppedRequestRecordCount = increment(droppedRequestRecordCount);
      return;
    }
    if (retainedRequestCount === records.length) {
      droppedRequestRecordCount = increment(droppedRequestRecordCount);
    } else {
      retainedRequestCount += 1;
    }
    records[nextRecordIndex] = { requestNumber: requestCount, scenario, traceId };
    nextRecordIndex = (nextRecordIndex + 1) % records.length;
  };

  const requestListener = (request: IncomingMessage, response: ServerResponse) => {
    const scenario = scenarioFromUrl(request.url) ?? "current";
    recordRequest(scenario, safeTraceId(request));
    if (!accepting) {
      request.resume();
      writeJson(response, 503, { status: "unavailable" });
      return;
    }

    const requestTimers = new Set<ReturnType<typeof setTimeout>>();
    let cancelled = false;
    let settled = false;
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      for (const timer of requestTimers) {
        clearTrackedTimer(timer);
      }
      requestTimers.clear();
      request.off("aborted", onAbort);
      request.off("error", onAbort);
      response.off("close", settle);
      response.off("error", onAbort);
      response.off("finish", settle);
      activeRequests.delete(resource);
    };
    const onAbort = () => {
      cancelled = true;
      settle();
    };
    const resource: ActiveRequestResource = {
      abort: () => {
        cancelled = true;
        if (!response.destroyed) {
          response.destroy();
        }
        if (!request.destroyed) {
          request.destroy();
        }
        settle();
      },
      cancelled: () => cancelled,
      schedule: (callback, delayMs) => {
        let timer: ReturnType<typeof setTimeout>;
        timer = schedule(() => {
          requestTimers.delete(timer);
          callback();
        }, delayMs);
        requestTimers.add(timer);
        return timer;
      },
    };
    activeRequests.add(resource);
    request.once("aborted", onAbort);
    request.once("error", onAbort);
    response.once("close", settle);
    response.once("error", onAbort);
    response.once("finish", settle);

    void serveRequest({
      alternateCa,
      alternateManager,
      fixture: options.fixture,
      maxRequestBodyBytes: options.maxRequestBodyBytes,
      options,
      request,
      resource,
      response,
      scenario,
    }).catch((error: unknown) => {
      if (resource.cancelled() || response.destroyed || response.writableEnded) {
        return;
      }
      writeJson(response, error instanceof RequestBodyTooLargeError ? 413 : 500, {
        status: "unavailable",
      });
    });
  };

  const connectionListener = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const clientErrorListener = (_error: Error, socket: Socket) => {
    socket.destroy();
  };
  const server: Server = createServer(requestListener);
  server.on("connection", connectionListener);
  server.on("clientError", clientErrorListener);

  try {
    await new Promise<void>((resolveStart, rejectStart) => {
      const onError = () => {
        server.off("error", onError);
        rejectStart(new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_START_FAILED"));
      };
      server.once("error", onError);
      server.listen(options.port, options.host, () => {
        server.off("error", onError);
        resolveStart();
      });
    });
  } catch (error) {
    server.off("request", requestListener);
    server.off("connection", connectionListener);
    server.off("clientError", clientErrorListener);
    for (const socket of sockets) {
      socket.destroy();
    }
    throw error instanceof PortkeyCaRelationSandboxError
      ? error
      : new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_START_FAILED");
  }

  const address = server.address() as AddressInfo;
  const urlHost = options.host.includes(":") ? `[${options.host}]` : options.host;
  const relationBaseUrl = `http://${urlHost}:${address.port}/relation`;
  const relationUrl = `${relationBaseUrl}/current`;

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    accepting = false;
    lifecycle = "closing";
    closePromise = new Promise<void>((resolveClose) => {
      let finished = false;
      let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        clearTrackedTimer(shutdownTimer);
        for (const timer of timers) {
          clearTimeout(timer);
        }
        timers.clear();
        for (const resource of [...activeRequests]) {
          resource.abort();
        }
        activeRequests.clear();
        for (const socket of sockets) {
          socket.destroy();
        }
        sockets.clear();
        server.off("request", requestListener);
        server.off("connection", connectionListener);
        server.off("clientError", clientErrorListener);
        lifecycle = "closed";
        resolveClose();
      };
      shutdownTimer = schedule(() => {
        server.closeAllConnections?.();
        finish();
      }, options.shutdownTimeoutMs);
      server.close(() => finish());
      for (const resource of [...activeRequests]) {
        resource.abort();
      }
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      for (const socket of sockets) {
        socket.destroy();
      }
    });
    return closePromise;
  };

  const state = (): PortkeyCaRelationSandboxState => Object.freeze({
    accepting,
    activeRequestCount: activeRequests.size,
    counts: Object.freeze({ ...counts }),
    droppedRequestRecordCount,
    lifecycle,
    listenerCount: lifecycle === "closed"
      ? 0
      : server.listenerCount("request")
        + server.listenerCount("connection")
        + server.listenerCount("clientError"),
    recentRequests: Object.freeze(readRecords(records, retainedRequestCount, nextRecordIndex)),
    requestCount,
    retainedRequestCount,
    socketCount: sockets.size,
    timerCount: timers.size,
  });

  return Object.freeze({
    close,
    count: (scenario?: PortkeyCaRelationSandboxScenario) =>
      scenario === undefined ? requestCount : counts[scenario] ?? 0,
    host: options.host,
    port: address.port,
    relationUrl,
    state,
    urlForScenario: (scenario: PortkeyCaRelationSandboxScenario) => {
      if (!SCENARIO_SET.has(scenario)) {
        throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
      }
      return `${relationBaseUrl}/${scenario}`;
    },
  });
}

async function serveRequest(input: {
  alternateCa: string;
  alternateManager: string;
  fixture: PortkeyCaRelationSandboxFixture;
  maxRequestBodyBytes: number;
  options: NormalizedSandboxOptions;
  request: IncomingMessage;
  resource: ActiveRequestResource;
  response: ServerResponse;
  scenario: PortkeyCaRelationSandboxScenario;
}): Promise<void> {
  if (input.resource.cancelled()) {
    return;
  }
  if (input.request.method !== "POST") {
    input.response.setHeader("allow", "POST");
    writeJson(input.response, 405, { status: "rejected" });
    return;
  }
  const body = await readBoundedBody(input.request, input.maxRequestBodyBytes);
  if (input.resource.cancelled()) {
    return;
  }
  if (scenarioRequiresQuery(input.scenario) && !isExactQuery(body)) {
    writeJson(input.response, 400, { status: "rejected" });
    return;
  }
  serveScenario(input);
}

function serveScenario(input: {
  alternateCa: string;
  alternateManager: string;
  fixture: PortkeyCaRelationSandboxFixture;
  options: NormalizedSandboxOptions;
  resource: ActiveRequestResource;
  response: ServerResponse;
  scenario: PortkeyCaRelationSandboxScenario;
}): void {
  const current = currentResponse(input.fixture);
  switch (input.scenario) {
    case "current":
    case "rotated":
      writeJson(input.response, 200, current);
      return;
    case "unknown":
      writeJson(input.response, 200, {
        status: "unknown",
        version: PORTKEY_CA_RELATION_RESPONSE_VERSION,
      });
      return;
    case "wrong-manager":
      writeJson(input.response, 200, { ...current, managerAddress: input.alternateManager });
      return;
    case "wrong-ca-address":
      writeJson(input.response, 200, { ...current, caAddress: input.alternateCa });
      return;
    case "wrong-ca-hash":
      writeJson(input.response, 200, { ...current, caHash: randomBytes(32).toString("hex") });
      return;
    case "wrong-chain":
      writeJson(input.response, 200, {
        ...current,
        chainId: input.fixture.chainId === "AELF" ? "tDVV" : "AELF",
      });
      return;
    case "stale-time":
      writeJson(input.response, 200, {
        ...current,
        observedAt: new Date(Date.parse(input.fixture.observedAt) - 60_000).toISOString(),
      });
      return;
    case "stale-block":
      writeJson(input.response, 200, { ...current, blockHeight: 0 });
      return;
    case "stale-version":
      writeJson(input.response, 200, { ...current, relationVersion: 1 });
      return;
    case "429":
      input.response.setHeader("retry-after", "1");
      writeJson(input.response, 429, { status: "unavailable" });
      return;
    case "5xx":
      writeJson(input.response, 503, { status: "unavailable" });
      return;
    case "malformed":
      writeHeaders(input.response, 200);
      input.response.end("{malformed-json");
      return;
    case "unknown-field":
      writeJson(input.response, 200, { ...current, providerPayload: "not-authority" });
      return;
    case "oversized": {
      const payload = sizedJson(input.options.oversizedResponseBytes);
      writeHeaders(input.response, 200);
      input.response.setHeader("content-length", payload.byteLength);
      input.response.end(payload);
      return;
    }
    case "chunked":
      writeChunked(input.response, input.resource, input.options);
      return;
    case "timeout":
      writeHeaders(input.response, 200);
      input.response.write("{\"status\":\"current");
      input.resource.schedule(() => {
        if (!input.response.destroyed && !input.response.writableEnded) {
          input.response.end("\"}");
        }
      }, input.options.timeoutFixtureMs);
      return;
    case "abort":
      writeHeaders(input.response, 200);
      input.response.write("{\"status\":");
      input.resource.schedule(() => input.response.destroy(), input.options.streamIntervalMs);
  }
}

function currentResponse(fixture: PortkeyCaRelationSandboxFixture) {
  return {
    blockHeight: fixture.blockHeight,
    caAddress: fixture.caAddress,
    caHash: fixture.caHash,
    chainId: fixture.chainId,
    managerAddress: fixture.managerAddress,
    observedAt: fixture.observedAt,
    relationRevision: fixture.relationRevision,
    relationVersion: fixture.relationVersion,
    status: "current",
    version: PORTKEY_CA_RELATION_RESPONSE_VERSION,
  };
}

function writeChunked(
  response: ServerResponse,
  resource: ActiveRequestResource,
  options: NormalizedSandboxOptions,
): void {
  const payload = sizedJson(options.oversizedResponseBytes);
  let offset = 0;
  writeHeaders(response, 200);
  const writeNext = () => {
    if (resource.cancelled() || response.destroyed || response.writableEnded) {
      return;
    }
    const end = Math.min(offset + options.streamChunkBytes, payload.byteLength);
    const chunk = payload.subarray(offset, end);
    offset = end;
    if (offset >= payload.byteLength) {
      response.end(chunk);
      return;
    }
    response.write(chunk);
    resource.schedule(writeNext, options.streamIntervalMs);
  };
  writeNext();
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  const serialized = JSON.stringify(body);
  writeHeaders(response, statusCode);
  response.setHeader("content-length", Buffer.byteLength(serialized, "utf8"));
  response.end(serialized);
}

function writeHeaders(response: ServerResponse, statusCode: number): void {
  response.statusCode = statusCode;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
}

async function readBoundedBody(request: IncomingMessage, maximumBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteCount = 0;
  for await (const value of request) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    byteCount += chunk.byteLength;
    if (byteCount > maximumBytes) {
      throw new RequestBodyTooLargeError();
    }
    chunks.push(chunk);
  }
  if (byteCount === 0) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.concat(chunks, byteCount).toString("utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function isExactQuery(value: unknown): boolean {
  if (!isPlainRecord(value) || !hasExactFields(value, queryFields)) {
    return false;
  }
  return value.version === PORTKEY_CA_RELATION_QUERY_VERSION
    && isCanonicalAelfWalletAddress(value.caAddress)
    && typeof value.caHash === "string"
    && /^[a-f0-9]{64}$/.test(value.caHash)
    && isCanonicalLiveWalletChainId(value.chainId)
    && isCanonicalAelfWalletAddress(value.managerAddress);
}

function scenarioRequiresQuery(scenario: PortkeyCaRelationSandboxScenario): boolean {
  return scenario !== "unknown"
    && scenario !== "429"
    && scenario !== "5xx"
    && scenario !== "malformed"
    && scenario !== "oversized"
    && scenario !== "chunked"
    && scenario !== "timeout"
    && scenario !== "abort";
}

function scenarioFromUrl(value: string | undefined): PortkeyCaRelationSandboxScenario | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    return undefined;
  }
  try {
    const parsed = new URL(value, "http://portkey-ca-sandbox.invalid");
    const match = /^\/relation\/([^/]+)$/.exec(parsed.pathname)?.[1];
    return SCENARIO_SET.has(match as PortkeyCaRelationSandboxScenario)
      ? match as PortkeyCaRelationSandboxScenario
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizeOptions(options: StartPortkeyCaRelationSandboxOptions): NormalizedSandboxOptions {
  const source = options;
  if (!isPlainRecord(options)) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
  }
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== "string" || !optionFields.has(key)) {
      if (
        typeof key === "string"
        && /secret|token|credential|authorization|password|private|(?:api|access)[_-]?key/i.test(key)
      ) {
        throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED");
      }
      throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
    }
  }
  const host = typeof source.host === "string"
    ? source.host.trim().toLowerCase()
    : PORTKEY_CA_RELATION_SANDBOX_DEFAULT_HOST;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_NON_LOOPBACK_HOST");
  }
  const port = source.port ?? 0;
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_PORT");
  }
  const oversizedResponseBytes = boundedInteger(
    source.oversizedResponseBytes,
    DEFAULT_OVERSIZED_RESPONSE_BYTES,
    1_024,
    4 * 1_024 * 1_024,
  );
  const fixture = normalizeFixture(source.fixture ?? createEphemeralFixture());

  return Object.freeze({
    fixture,
    host,
    maxRequestBodyBytes: boundedInteger(
      source.maxRequestBodyBytes,
      DEFAULT_MAX_REQUEST_BODY_BYTES,
      1,
      64 * 1_024,
    ),
    maxRequestRecords: boundedInteger(
      source.maxRequestRecords,
      PORTKEY_CA_RELATION_SANDBOX_DEFAULT_MAX_REQUEST_RECORDS,
      0,
      1_024,
    ),
    oversizedResponseBytes,
    port,
    shutdownTimeoutMs: boundedInteger(
      source.shutdownTimeoutMs,
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      10,
      10_000,
    ),
    streamChunkBytes: boundedInteger(
      source.streamChunkBytes,
      DEFAULT_STREAM_CHUNK_BYTES,
      1,
      oversizedResponseBytes,
    ),
    streamIntervalMs: boundedInteger(
      source.streamIntervalMs,
      DEFAULT_STREAM_INTERVAL_MS,
      1,
      1_000,
    ),
    timeoutFixtureMs: boundedInteger(
      source.timeoutFixtureMs,
      DEFAULT_TIMEOUT_FIXTURE_MS,
      50,
      60_000,
    ),
  });
}

function normalizeFixture(value: unknown): PortkeyCaRelationSandboxFixture {
  if (!isPlainRecord(value) || !hasExactFields(value, fixtureFields)) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
  }
  if (
    !Number.isSafeInteger(value.blockHeight)
    || (value.blockHeight as number) < 0
    || !isCanonicalAelfWalletAddress(value.caAddress)
    || typeof value.caHash !== "string"
    || !/^[a-f0-9]{64}$/.test(value.caHash)
    || !isCanonicalLiveWalletChainId(value.chainId)
    || !isCanonicalAelfWalletAddress(value.managerAddress)
    || !isCanonicalInstant(value.observedAt)
    || typeof value.relationRevision !== "string"
    || value.relationRevision.length === 0
    || value.relationRevision.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value.relationRevision)
    || !Number.isSafeInteger(value.relationVersion)
    || (value.relationVersion as number) < 1
  ) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
  }
  return Object.freeze({
    blockHeight: value.blockHeight as number,
    caAddress: value.caAddress,
    caHash: value.caHash,
    chainId: value.chainId,
    managerAddress: value.managerAddress,
    observedAt: value.observedAt,
    relationRevision: value.relationRevision,
    relationVersion: value.relationVersion as number,
  });
}

function createEphemeralFixture(): PortkeyCaRelationSandboxFixture {
  return Object.freeze({
    blockHeight: 1,
    caAddress: ephemeralAddress(),
    caHash: randomBytes(32).toString("hex"),
    chainId: "AELF" as const,
    managerAddress: ephemeralAddress(),
    observedAt: new Date().toISOString(),
    relationRevision: `revision-${randomBytes(8).toString("hex")}`,
    relationVersion: 1,
  });
}

function ephemeralAddress(): string {
  const keyPair = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  return AElf.wallet.getAddressFromPubKey(keyPair.getPublic());
}

function safeTraceId(request: IncomingMessage): string {
  const raw = request.headers["x-trace-id"];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return typeof candidate === "string" && TRACE_ID_PATTERN.test(candidate)
    ? `trace-sha256-${createHash("sha256").update(candidate, "utf8").digest("hex").slice(0, 24)}`
    : "trace-unavailable";
}

function createCounts(): Record<PortkeyCaRelationSandboxScenario, number> {
  return Object.fromEntries(
    PORTKEY_CA_RELATION_SANDBOX_SCENARIOS.map((scenario) => [scenario, 0]),
  ) as Record<PortkeyCaRelationSandboxScenario, number>;
}

function readRecords(
  records: readonly (MutableSafeRequest | undefined)[],
  retainedCount: number,
  nextIndex: number,
): PortkeyCaRelationSandboxSafeRequest[] {
  if (records.length === 0 || retainedCount === 0) {
    return [];
  }
  const firstIndex = retainedCount === records.length ? nextIndex : 0;
  const result: PortkeyCaRelationSandboxSafeRequest[] = [];
  for (let offset = 0; offset < retainedCount; offset += 1) {
    const record = records[(firstIndex + offset) % records.length];
    if (record) {
      result.push(Object.freeze({ ...record }));
    }
  }
  return result;
}

function increment(value: number): number {
  return value >= MAX_COUNTER ? MAX_COUNTER : value + 1;
}

function sizedJson(byteLength: number): Buffer {
  const wrapperBytes = Buffer.byteLength(JSON.stringify({ value: "" }), "utf8");
  return Buffer.from(JSON.stringify({ value: "x".repeat(Math.max(0, byteLength - wrapperBytes)) }));
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const candidate = value ?? fallback;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_OPTION");
  }
  return candidate;
}

function isCanonicalInstant(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 32
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactFields(record: Record<string, unknown>, fields: ReadonlySet<string>): boolean {
  const keys = Reflect.ownKeys(record);
  return keys.length === fields.size
    && keys.every((key) => typeof key === "string" && fields.has(key));
}

export const runPortkeyCaRelationSandboxCli = async (
  options: RunPortkeyCaRelationSandboxCliOptions = {},
): Promise<PortkeyCaRelationSandboxHandle | undefined> => {
  const argv = options.argv ?? process.argv.slice(2);
  if (!argv.includes("--listen")) {
    return undefined;
  }
  const env = options.env ?? process.env;
  if (Object.entries(env).some(([key, value]) =>
    key.startsWith(SANDBOX_ENV_PREFIX)
    && value !== undefined
    && value !== ""
    && !allowedSandboxEnvKeys.has(key))) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_STATIC_SECRET_REJECTED");
  }
  const parsed = parseCliArguments(argv);
  const host = parsed.host
    ?? env.CAMPAIGN_OS_PORTKEY_CA_SANDBOX_HOST
    ?? PORTKEY_CA_RELATION_SANDBOX_DEFAULT_HOST;
  const port = parseCliPort(
    parsed.port
      ?? env.CAMPAIGN_OS_PORTKEY_CA_SANDBOX_PORT
      ?? String(PORTKEY_CA_RELATION_SANDBOX_DEFAULT_PORT),
  );
  const handle = await startPortkeyCaRelationSandbox({ host, port });
  const stdout = options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  stdout(JSON.stringify({
    event: "portkey_ca_relation_sandbox.ready",
    host: handle.host,
    port: handle.port,
    scenarioCount: PORTKEY_CA_RELATION_SANDBOX_SCENARIOS.length,
    status: "ready",
  }));
  return handle;
};

function parseCliArguments(argv: readonly string[]): { host?: string; port?: string } {
  let host: string | undefined;
  let port: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--listen") {
      continue;
    }
    if (argument === "--host" || argument === "--port") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_CLI_INVALID_ARGUMENT");
      }
      if (argument === "--host") {
        host = value;
      } else {
        port = value;
      }
      index += 1;
      continue;
    }
    if (argument?.startsWith("--host=")) {
      host = argument.slice("--host=".length);
      continue;
    }
    if (argument?.startsWith("--port=")) {
      port = argument.slice("--port=".length);
      continue;
    }
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_CLI_INVALID_ARGUMENT");
  }
  return { ...(host === undefined ? {} : { host }), ...(port === undefined ? {} : { port }) };
}

function parseCliPort(value: string): number {
  if (!/^(?:0|[1-9][0-9]{0,4})$/.test(value)) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_PORT");
  }
  const port = Number(value);
  if (port > 65_535) {
    throw new PortkeyCaRelationSandboxError("PORTKEY_CA_SANDBOX_INVALID_PORT");
  }
  return port;
}

const PORTKEY_CA_SANDBOX_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/portkeyCaRelationSandbox.ts",
);

export const isPortkeyCaRelationSandboxDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string" && resolve(entryPath) === PORTKEY_CA_SANDBOX_ENTRY_PATH;

if (isPortkeyCaRelationSandboxDirectExecution() && process.argv.includes("--listen")) {
  runPortkeyCaRelationSandboxCli()
    .then((handle) => {
      if (!handle) {
        return;
      }
      let shuttingDown = false;
      const shutdown = () => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        void handle.close().catch(() => {
          process.exitCode = 1;
        });
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    })
    .catch((error: unknown) => {
      const code = error instanceof PortkeyCaRelationSandboxError
        ? error.code
        : "PORTKEY_CA_SANDBOX_START_FAILED";
      process.stderr.write(`${JSON.stringify({
        diagnosticCode: code,
        event: "portkey_ca_relation_sandbox.failed",
        status: "failed",
        traceId: randomUUID(),
      })}\n`);
      process.exitCode = 1;
    });
}
