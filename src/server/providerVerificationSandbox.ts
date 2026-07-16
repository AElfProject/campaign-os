import { createHash, randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { resolve } from "node:path";

export type ProviderVerificationSandboxScenario =
  | "completed"
  | "negative"
  | "pending"
  | "429"
  | "5xx"
  | "timeout"
  | "malformed"
  | "oversized"
  | "chunked"
  | "abort";

export const PROVIDER_VERIFICATION_SANDBOX_SCENARIOS:
readonly ProviderVerificationSandboxScenario[] = Object.freeze([
  "completed",
  "negative",
  "pending",
  "429",
  "5xx",
  "timeout",
  "malformed",
  "oversized",
  "chunked",
  "abort",
]);

export const PROVIDER_VERIFICATION_SANDBOX_DEFAULT_HOST = "127.0.0.1";
export const PROVIDER_VERIFICATION_SANDBOX_DEFAULT_PORT = 5_195;
export const PROVIDER_VERIFICATION_SANDBOX_DEFAULT_MAX_REQUEST_RECORDS = 128;

export interface ProviderVerificationSandboxSafeRequest {
  readonly requestNumber: number;
  readonly scenario: ProviderVerificationSandboxScenario;
  readonly traceId: string;
}

export interface ProviderVerificationSandboxState {
  readonly accepting: boolean;
  readonly activeRequestCount: number;
  readonly counts: Readonly<Record<ProviderVerificationSandboxScenario, number>>;
  readonly droppedRequestRecordCount: number;
  readonly lifecycle: "listening" | "closing" | "closed";
  readonly listenerCount: number;
  readonly recentRequests: readonly ProviderVerificationSandboxSafeRequest[];
  readonly requestCount: number;
  readonly retainedRequestCount: number;
  readonly socketCount: number;
  readonly timerCount: number;
}

export interface ProviderVerificationSandboxHandle {
  readonly host: string;
  readonly port: number;
  readonly verifyUrl: string;
  close(): Promise<void>;
  count(scenario?: ProviderVerificationSandboxScenario): number;
  state(): ProviderVerificationSandboxState;
  urlForScenario(scenario: ProviderVerificationSandboxScenario): string;
}

export interface ProviderVerificationSandboxController {
  close(): Promise<void>;
  start(): Promise<ProviderVerificationSandboxHandle>;
}

export interface StartProviderVerificationSandboxOptions {
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

export interface RunProviderVerificationSandboxCliOptions {
  readonly argv?: readonly string[];
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stderr?: (line: string) => void;
  readonly stdout?: (line: string) => void;
}

export type ProviderVerificationSandboxErrorCode =
  | "PROVIDER_SANDBOX_ALREADY_CLOSED"
  | "PROVIDER_SANDBOX_CLI_INVALID_ARGUMENT"
  | "PROVIDER_SANDBOX_INVALID_OPTION"
  | "PROVIDER_SANDBOX_INVALID_PORT"
  | "PROVIDER_SANDBOX_NON_LOOPBACK_HOST"
  | "PROVIDER_SANDBOX_START_FAILED";

const ERROR_MESSAGES: Readonly<Record<ProviderVerificationSandboxErrorCode, string>> =
  Object.freeze({
    PROVIDER_SANDBOX_ALREADY_CLOSED: "Provider verification sandbox is closed.",
    PROVIDER_SANDBOX_CLI_INVALID_ARGUMENT: "Provider verification sandbox CLI arguments are invalid.",
    PROVIDER_SANDBOX_INVALID_OPTION: "Provider verification sandbox options are invalid.",
    PROVIDER_SANDBOX_INVALID_PORT: "Provider verification sandbox port is invalid.",
    PROVIDER_SANDBOX_NON_LOOPBACK_HOST: "Provider verification sandbox requires a loopback host.",
    PROVIDER_SANDBOX_START_FAILED: "Provider verification sandbox failed to start.",
  });

export class ProviderVerificationSandboxError extends Error {
  readonly code: ProviderVerificationSandboxErrorCode;

  constructor(code: ProviderVerificationSandboxErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "ProviderVerificationSandboxError";
    this.code = code;
    delete this.stack;
  }
}

interface NormalizedSandboxOptions {
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
  scenario: ProviderVerificationSandboxScenario;
  traceId: string;
}

interface RecordedRequestToken {
  readonly record: MutableSafeRequest;
  scenario: ProviderVerificationSandboxScenario;
}

interface ActiveRequestResource {
  readonly abort: () => void;
  readonly cancelled: () => boolean;
  readonly schedule: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
}

class RequestBodyTooLargeError extends Error {}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SCENARIO_SET = new Set<ProviderVerificationSandboxScenario>(
  PROVIDER_VERIFICATION_SANDBOX_SCENARIOS,
);
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_COUNTER_VALUE = Number.MAX_SAFE_INTEGER;
const DEFAULT_MAX_REQUEST_BODY_BYTES = 64 * 1_024;
const DEFAULT_OVERSIZED_RESPONSE_BYTES = 256 * 1_024 + 1;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_000;
const DEFAULT_STREAM_CHUNK_BYTES = 4 * 1_024;
const DEFAULT_STREAM_INTERVAL_MS = 5;
const DEFAULT_TIMEOUT_FIXTURE_MS = 30_000;
const MIN_JSON_FIXTURE_BYTES = Buffer.byteLength(JSON.stringify({ value: "" }), "utf8");
const COMPLETED_EVIDENCE_HASH = createHash("sha256")
  .update("campaign-os/provider-verification-sandbox/completed/v1", "utf8")
  .digest("hex");
const COMPLETED_EVIDENCE_REF =
  `evidence-ref:provider-sandbox-${COMPLETED_EVIDENCE_HASH.slice(0, 24)}`;

export const createProviderVerificationSandbox = (
  options: StartProviderVerificationSandboxOptions = {},
): ProviderVerificationSandboxController => {
  let startPromise: Promise<ProviderVerificationSandboxHandle> | undefined;
  let closePromise: Promise<void> | undefined;
  let closeRequested = false;

  const start = (): Promise<ProviderVerificationSandboxHandle> => {
    if (startPromise) {
      return startPromise;
    }
    if (closeRequested) {
      return Promise.reject(new ProviderVerificationSandboxError(
        "PROVIDER_SANDBOX_ALREADY_CLOSED",
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

export const startProviderVerificationSandbox = (
  options: StartProviderVerificationSandboxOptions = {},
): Promise<ProviderVerificationSandboxHandle> =>
  createProviderVerificationSandbox(options).start();

async function startSandboxServer(
  options: NormalizedSandboxOptions,
): Promise<ProviderVerificationSandboxHandle> {
  const counts = createScenarioCounts();
  const recentRequests = new Array<MutableSafeRequest | undefined>(options.maxRequestRecords);
  const sockets = new Set<Socket>();
  const activeRequests = new Set<ActiveRequestResource>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let accepting = true;
  let lifecycle: ProviderVerificationSandboxState["lifecycle"] = "listening";
  let requestCount = 0;
  let retainedRequestCount = 0;
  let droppedRequestRecordCount = 0;
  let nextRequestRecordIndex = 0;
  let closePromise: Promise<void> | undefined;

  const clearTimer = (timer: ReturnType<typeof setTimeout> | undefined) => {
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    timers.delete(timer);
  };

  const scheduleTimer = (callback: () => void, delayMs: number) => {
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delayMs);
    timers.add(timer);
    return timer;
  };

  const recordRequest = (
    scenario: ProviderVerificationSandboxScenario,
    traceId: string,
  ): RecordedRequestToken => {
    requestCount = incrementCounter(requestCount);
    counts[scenario] = incrementCounter(counts[scenario]);
    const record = { requestNumber: requestCount, scenario, traceId };

    if (recentRequests.length > 0) {
      if (retainedRequestCount === recentRequests.length) {
        droppedRequestRecordCount = incrementCounter(droppedRequestRecordCount);
      } else {
        retainedRequestCount += 1;
      }
      recentRequests[nextRequestRecordIndex] = record;
      nextRequestRecordIndex = (nextRequestRecordIndex + 1) % recentRequests.length;
    } else {
      droppedRequestRecordCount = incrementCounter(droppedRequestRecordCount);
    }

    return { record, scenario };
  };

  const updateRecordedScenario = (
    token: RecordedRequestToken,
    scenario: ProviderVerificationSandboxScenario,
  ) => {
    if (token.scenario === scenario) {
      return;
    }
    counts[token.scenario] = Math.max(0, counts[token.scenario] - 1);
    counts[scenario] = incrementCounter(counts[scenario]);
    token.scenario = scenario;
    token.record.scenario = scenario;
  };

  let server: Server;
  const requestListener = (request: IncomingMessage, response: ServerResponse) => {
    const requestUrl = parseRequestUrl(request.url);
    const selectedBeforeBody = resolveScenarioFromUrl(requestUrl);
    const requestToken = recordRequest(
      selectedBeforeBody ?? "completed",
      safeTraceId(request),
    );
    if (!accepting) {
      request.resume();
      writeJson(response, 503, { status: "unavailable" });
      return;
    }
    const requestTimers = new Set<ReturnType<typeof setTimeout>>();
    let cancelled = false;
    let settled = false;

    const cancelRequestTimer = (timer: ReturnType<typeof setTimeout>) => {
      requestTimers.delete(timer);
      clearTimer(timer);
    };
    const settle = () => {
      if (settled) {
        return;
      }
      settled = true;
      for (const timer of requestTimers) {
        clearTimer(timer);
      }
      requestTimers.clear();
      request.off("aborted", onAborted);
      request.off("error", onError);
      response.off("close", settle);
      response.off("error", onError);
      response.off("finish", settle);
      activeRequests.delete(resource);
    };
    const onAborted = () => {
      cancelled = true;
      settle();
    };
    const onError = () => {
      cancelled = true;
      settle();
    };
    const resource: ActiveRequestResource = {
      abort: () => {
        cancelled = true;
        for (const timer of requestTimers) {
          cancelRequestTimer(timer);
        }
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
        timer = scheduleTimer(() => {
          requestTimers.delete(timer);
          callback();
        }, delayMs);
        requestTimers.add(timer);
        return timer;
      },
    };

    activeRequests.add(resource);
    request.once("aborted", onAborted);
    request.once("error", onError);
    response.once("close", settle);
    response.once("error", onError);
    response.once("finish", settle);

    void serveRequest({
      maxRequestBodyBytes: options.maxRequestBodyBytes,
      options,
      request,
      requestUrl,
      resource,
      response,
      selectedBeforeBody,
      updateScenario: (scenario) => updateRecordedScenario(requestToken, scenario),
    }).catch((error: unknown) => {
      if (resource.cancelled() || response.destroyed || response.writableEnded) {
        return;
      }
      if (error instanceof RequestBodyTooLargeError) {
        writeJson(response, 413, { status: "rejected" });
        return;
      }
      writeJson(response, 500, { status: "unavailable" });
    });
  };

  const connectionListener = (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  };
  const clientErrorListener = (_error: Error, socket: Socket) => {
    if (socket.writable) {
      socket.end(
        "HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
      );
    } else {
      socket.destroy();
    }
  };

  server = createServer(requestListener);
  server.on("connection", connectionListener);
  server.on("clientError", clientErrorListener);

  try {
    await new Promise<void>((resolveStart, rejectStart) => {
      const onStartupError = () => {
        server.off("error", onStartupError);
        rejectStart(new ProviderVerificationSandboxError("PROVIDER_SANDBOX_START_FAILED"));
      };
      server.once("error", onStartupError);
      server.listen(options.port, options.host, () => {
        server.off("error", onStartupError);
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
    throw error instanceof ProviderVerificationSandboxError
      ? error
      : new ProviderVerificationSandboxError("PROVIDER_SANDBOX_START_FAILED");
  }

  const address = server.address() as AddressInfo;
  const hostForUrl = options.host.includes(":") ? `[${options.host}]` : options.host;
  const verifyUrl = `http://${hostForUrl}:${address.port}/verify`;

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
        clearTimer(shutdownTimer);
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

      shutdownTimer = scheduleTimer(() => {
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

  const state = (): ProviderVerificationSandboxState => {
    const requests = readRecentRequests(
      recentRequests,
      retainedRequestCount,
      nextRequestRecordIndex,
    );
    return Object.freeze({
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
      recentRequests: Object.freeze(requests),
      requestCount,
      retainedRequestCount,
      socketCount: sockets.size,
      timerCount: timers.size,
    });
  };

  return Object.freeze({
    close,
    count: (scenario?: ProviderVerificationSandboxScenario) =>
      scenario === undefined ? requestCount : counts[scenario] ?? 0,
    host: options.host,
    port: address.port,
    state,
    urlForScenario: (scenario: ProviderVerificationSandboxScenario) => {
      if (!SCENARIO_SET.has(scenario)) {
        throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_OPTION");
      }
      return `${verifyUrl}/${scenario}`;
    },
    verifyUrl,
  });
}

async function serveRequest(input: {
  maxRequestBodyBytes: number;
  options: NormalizedSandboxOptions;
  request: IncomingMessage;
  requestUrl: URL | undefined;
  resource: ActiveRequestResource;
  response: ServerResponse;
  selectedBeforeBody: ProviderVerificationSandboxScenario | undefined;
  updateScenario: (scenario: ProviderVerificationSandboxScenario) => void;
}): Promise<void> {
  if (input.resource.cancelled()) {
    return;
  }
  if (!input.requestUrl || !isVerifyPath(input.requestUrl.pathname)) {
    writeJson(input.response, 404, { status: "not_found" });
    return;
  }
  if (input.request.method !== "GET" && input.request.method !== "POST") {
    input.response.setHeader("allow", "GET, POST");
    writeJson(input.response, 405, { status: "rejected" });
    return;
  }

  const body = await readBoundedRequestBody(input.request, input.maxRequestBodyBytes);
  if (input.resource.cancelled()) {
    return;
  }
  const bodyScenario = input.selectedBeforeBody === undefined
    ? resolveScenarioFromBody(body)
    : undefined;
  const scenario = input.selectedBeforeBody ?? bodyScenario ?? "completed";
  input.updateScenario(scenario);
  serveScenario(scenario, input.response, input.resource, input.options);
}

function serveScenario(
  scenario: ProviderVerificationSandboxScenario,
  response: ServerResponse,
  resource: ActiveRequestResource,
  options: NormalizedSandboxOptions,
): void {
  if (resource.cancelled()) {
    return;
  }

  switch (scenario) {
    case "completed":
      writeJson(response, 200, {
        eligible: true,
        evidenceHash: COMPLETED_EVIDENCE_HASH,
        evidenceRef: COMPLETED_EVIDENCE_REF,
        status: "completed",
        verified: true,
      });
      return;
    case "negative":
      writeJson(response, 200, { status: "failed", verified: false });
      return;
    case "pending":
      writeJson(response, 202, { status: "pending" });
      return;
    case "429":
      response.setHeader("retry-after", "1");
      writeJson(response, 429, { status: "pending" });
      return;
    case "5xx":
      writeJson(response, 503, { status: "unavailable" });
      return;
    case "malformed":
      writeResponseHeaders(response, 200);
      response.end("{malformed-json");
      return;
    case "oversized": {
      const payload = createSizedJsonPayload(options.oversizedResponseBytes);
      writeResponseHeaders(response, 200);
      response.setHeader("content-length", payload.byteLength);
      response.end(payload);
      return;
    }
    case "chunked":
      writeChunkedPayload(response, resource, options);
      return;
    case "timeout":
      writeResponseHeaders(response, 200);
      response.write("{\"status\":\"pending");
      resource.schedule(() => {
        if (!response.destroyed && !response.writableEnded) {
          response.end("\"}");
        }
      }, options.timeoutFixtureMs);
      return;
    case "abort":
      writeResponseHeaders(response, 200);
      response.setHeader("content-length", 1_024);
      response.write("{\"status\":");
      resource.schedule(() => {
        if (!response.destroyed) {
          response.destroy();
        }
      }, Math.max(1, options.streamIntervalMs));
  }
}

function writeChunkedPayload(
  response: ServerResponse,
  resource: ActiveRequestResource,
  options: NormalizedSandboxOptions,
): void {
  const payload = createSizedJsonPayload(options.oversizedResponseBytes);
  let offset = 0;
  writeResponseHeaders(response, 200);

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
  writeResponseHeaders(response, statusCode);
  response.setHeader("content-length", Buffer.byteLength(serialized, "utf8"));
  response.end(serialized);
}

function writeResponseHeaders(response: ServerResponse, statusCode: number): void {
  response.statusCode = statusCode;
  response.setHeader("cache-control", "no-store");
  response.setHeader("connection", "close");
  response.setHeader("content-type", "application/json; charset=utf-8");
}

async function readBoundedRequestBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<unknown> {
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

function resolveScenarioFromUrl(
  url: URL | undefined,
): ProviderVerificationSandboxScenario | undefined {
  if (!url || !isVerifyPath(url.pathname)) {
    return undefined;
  }
  const suffix = url.pathname.slice("/verify".length);
  const firstSegment = suffix.split("/").filter(Boolean)[0];
  const routeScenario = normalizeScenario(firstSegment);
  if (routeScenario) {
    return routeScenario;
  }

  for (const key of ["scenario", "fixture", "methodName", "action"] as const) {
    const scenario = normalizeScenario(url.searchParams.get(key) ?? undefined);
    if (scenario) {
      return scenario;
    }
  }
  return undefined;
}

function resolveScenarioFromBody(body: unknown): ProviderVerificationSandboxScenario | undefined {
  if (!isPlainRecord(body)) {
    return undefined;
  }
  for (const key of ["scenario", "fixture", "methodName", "action"] as const) {
    const scenario = normalizeScenario(body[key]);
    if (scenario) {
      return scenario;
    }
  }
  return undefined;
}

function normalizeScenario(value: unknown): ProviderVerificationSandboxScenario | undefined {
  if (typeof value !== "string" || value.length > 32) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (SCENARIO_SET.has(normalized as ProviderVerificationSandboxScenario)) {
    return normalized as ProviderVerificationSandboxScenario;
  }
  const aliases: Readonly<Record<string, ProviderVerificationSandboxScenario>> = {
    "business-negative": "negative",
    failed: "negative",
    "rate-limit": "429",
    "rate-limited": "429",
    rate_limited: "429",
    "server-error": "5xx",
    server_error: "5xx",
    unavailable: "5xx",
  };
  return aliases[normalized];
}

function safeTraceId(request: IncomingMessage): string {
  for (const headerName of ["x-trace-id", "x-campaign-os-trace-id"] as const) {
    const raw = request.headers[headerName];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (
      typeof candidate === "string"
      && TRACE_ID_PATTERN.test(candidate)
    ) {
      return `trace-sha256-${createHash("sha256").update(candidate, "utf8").digest("hex").slice(0, 24)}`;
    }
  }
  return "trace-unavailable";
}

function parseRequestUrl(value: string | undefined): URL | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 8_192) {
    return undefined;
  }
  try {
    return new URL(value, "http://provider-sandbox.invalid");
  } catch {
    return undefined;
  }
}

function isVerifyPath(pathname: string): boolean {
  return pathname === "/verify" || pathname.startsWith("/verify/");
}

function createSizedJsonPayload(byteLength: number): Buffer {
  const valueBytes = byteLength - MIN_JSON_FIXTURE_BYTES;
  return Buffer.from(JSON.stringify({ value: "x".repeat(valueBytes) }), "utf8");
}

function createScenarioCounts(): Record<ProviderVerificationSandboxScenario, number> {
  return Object.fromEntries(
    PROVIDER_VERIFICATION_SANDBOX_SCENARIOS.map((scenario) => [scenario, 0]),
  ) as Record<ProviderVerificationSandboxScenario, number>;
}

function readRecentRequests(
  records: readonly (MutableSafeRequest | undefined)[],
  retainedCount: number,
  nextIndex: number,
): ProviderVerificationSandboxSafeRequest[] {
  if (records.length === 0 || retainedCount === 0) {
    return [];
  }
  const firstIndex = retainedCount === records.length ? nextIndex : 0;
  const result: ProviderVerificationSandboxSafeRequest[] = [];
  for (let offset = 0; offset < retainedCount; offset += 1) {
    const record = records[(firstIndex + offset) % records.length];
    if (record) {
      result.push(Object.freeze({ ...record }));
    }
  }
  return result;
}

function incrementCounter(value: number): number {
  return value >= MAX_COUNTER_VALUE ? MAX_COUNTER_VALUE : value + 1;
}

function normalizeOptions(
  options: StartProviderVerificationSandboxOptions,
): NormalizedSandboxOptions {
  if (
    typeof options !== "object"
    || options === null
    || Array.isArray(options)
    || (
      Object.getPrototypeOf(options) !== Object.prototype
      && Object.getPrototypeOf(options) !== null
    )
  ) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_OPTION");
  }
  const host = typeof options.host === "string"
    ? options.host.trim().toLowerCase()
    : PROVIDER_VERIFICATION_SANDBOX_DEFAULT_HOST;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_NON_LOOPBACK_HOST");
  }
  const port = options.port ?? 0;
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_PORT");
  }

  const oversizedResponseBytes = boundedInteger(
    options.oversizedResponseBytes,
    DEFAULT_OVERSIZED_RESPONSE_BYTES,
    Math.max(64, MIN_JSON_FIXTURE_BYTES),
    4 * 1_024 * 1_024,
  );
  const streamChunkBytes = boundedInteger(
    options.streamChunkBytes,
    DEFAULT_STREAM_CHUNK_BYTES,
    1,
    oversizedResponseBytes,
  );

  return Object.freeze({
    host,
    maxRequestBodyBytes: boundedInteger(
      options.maxRequestBodyBytes,
      DEFAULT_MAX_REQUEST_BODY_BYTES,
      1,
      1_024 * 1_024,
    ),
    maxRequestRecords: boundedInteger(
      options.maxRequestRecords,
      PROVIDER_VERIFICATION_SANDBOX_DEFAULT_MAX_REQUEST_RECORDS,
      0,
      1_024,
    ),
    oversizedResponseBytes,
    port,
    shutdownTimeoutMs: boundedInteger(
      options.shutdownTimeoutMs,
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      10,
      10_000,
    ),
    streamChunkBytes,
    streamIntervalMs: boundedInteger(
      options.streamIntervalMs,
      DEFAULT_STREAM_INTERVAL_MS,
      1,
      1_000,
    ),
    timeoutFixtureMs: boundedInteger(
      options.timeoutFixtureMs,
      DEFAULT_TIMEOUT_FIXTURE_MS,
      50,
      60_000,
    ),
  });
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const candidate = value ?? fallback;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_OPTION");
  }
  return candidate;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export const runProviderVerificationSandboxCli = async (
  options: RunProviderVerificationSandboxCliOptions = {},
): Promise<ProviderVerificationSandboxHandle | undefined> => {
  const argv = options.argv ?? process.argv.slice(2);
  if (!argv.includes("--listen")) {
    return undefined;
  }
  const env = options.env ?? process.env;
  const parsed = parseCliArguments(argv);
  const host = parsed.host
    ?? env.CAMPAIGN_OS_PROVIDER_SANDBOX_HOST
    ?? PROVIDER_VERIFICATION_SANDBOX_DEFAULT_HOST;
  const port = parseCliPort(
    parsed.port
      ?? env.CAMPAIGN_OS_PROVIDER_SANDBOX_PORT
      ?? String(PROVIDER_VERIFICATION_SANDBOX_DEFAULT_PORT),
  );
  const handle = await startProviderVerificationSandbox({ host, port });
  const stdout = options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  stdout(JSON.stringify({
    event: "provider_verification_sandbox.ready",
    host: handle.host,
    port: handle.port,
    scenarioCount: PROVIDER_VERIFICATION_SANDBOX_SCENARIOS.length,
    status: "ready",
    verifyUrl: handle.verifyUrl,
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
        throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_CLI_INVALID_ARGUMENT");
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
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_CLI_INVALID_ARGUMENT");
  }
  return { ...(host === undefined ? {} : { host }), ...(port === undefined ? {} : { port }) };
}

function parseCliPort(value: string): number {
  if (!/^(?:0|[1-9][0-9]{0,4})$/.test(value)) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_PORT");
  }
  const port = Number(value);
  if (port > 65_535) {
    throw new ProviderVerificationSandboxError("PROVIDER_SANDBOX_INVALID_PORT");
  }
  return port;
}

const PROVIDER_SANDBOX_CLI_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/providerVerificationSandbox.ts",
);

export const isProviderVerificationSandboxDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string"
  && resolve(entryPath) === PROVIDER_SANDBOX_CLI_ENTRY_PATH;

if (isProviderVerificationSandboxDirectExecution() && process.argv.includes("--listen")) {
  runProviderVerificationSandboxCli()
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
      const code = error instanceof ProviderVerificationSandboxError
        ? error.code
        : "PROVIDER_SANDBOX_START_FAILED";
      process.stderr.write(`${JSON.stringify({
        diagnosticCode: code,
        event: "provider_verification_sandbox.failed",
        status: "failed",
        traceId: randomUUID(),
      })}\n`);
      process.exitCode = 1;
    });
}
