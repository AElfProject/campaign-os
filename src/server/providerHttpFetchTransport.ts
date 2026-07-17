import {
  disposeProviderHttpCanonicalRequestMaterial,
  disposeProviderHttpExecutionMaterial,
  isProviderHttpExecutionMaterial,
  useProviderHttpExecutionMaterial,
  type ProviderHttpExecutionMaterial,
  type ProviderHttpExecutionMaterialResolver,
  type ProviderHttpCanonicalRequestMaterial,
} from "./providerHttpExecutionMaterial";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";
import type {
  ProviderHttpTransport,
  ProviderHttpTransportContext,
  ProviderHttpTransportResult,
  ProviderHttpTransportResultDiagnostic,
  ProviderHttpTransportResultDiagnosticCode,
} from "./providerHttpTransport";

export const PROVIDER_HTTP_FETCH_DEFAULT_TIMEOUT_MS = 2_500;
export const PROVIDER_HTTP_FETCH_TIMEOUT_MIN_MS = 100;
export const PROVIDER_HTTP_FETCH_TIMEOUT_MAX_MS = 10_000;
export const PROVIDER_HTTP_FETCH_DEFAULT_DRAIN_TIMEOUT_MS = 1_000;
export const PROVIDER_HTTP_FETCH_MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1_000;

export interface CreateProviderHttpFetchTransportOptions {
  readonly drainTimeoutMs?: number;
  readonly fetch?: typeof fetch;
  readonly materialResolver: ProviderHttpExecutionMaterialResolver;
  readonly now?: () => number;
}

export interface ProviderHttpFetchTransportCloseResult {
  readonly activeCallCount: number;
  readonly status: "drained" | "timed_out";
}

export interface ProviderHttpFetchTransportState {
  readonly accepting: boolean;
  readonly activeCallCount: number;
}

export interface ProviderHttpFetchTransport extends ProviderHttpTransport {
  close(): Promise<ProviderHttpFetchTransportCloseResult>;
  executeWithCanonicalRequestMaterial(
    request: ProviderHttpRequestPlan,
    context: ProviderHttpTransportContext,
    material: ProviderHttpCanonicalRequestMaterial,
  ): Promise<ProviderHttpTransportResult>;
  state(): ProviderHttpFetchTransportState;
}

type AbortKind = "caller_aborted" | "runtime_aborted" | "timeout" | "transport_closed";

interface ActiveFetchCall {
  abort: () => void;
  promise: Promise<ProviderHttpTransportResult>;
}

const DIAGNOSTIC_MESSAGES: Readonly<
  Record<ProviderHttpTransportResultDiagnosticCode, string>
> = Object.freeze({
  caller_aborted: "Provider HTTP request was aborted by the caller.",
  empty_body: "Provider HTTP response body was empty.",
  fetch_failed: "Provider HTTP fetch failed with redacted detail.",
  malformed_json: "Provider HTTP response JSON was malformed.",
  material_resolution_failed: "Provider HTTP execution material could not be resolved.",
  production_transport_unpinned: "Provider HTTP production transport requires a pinned network connector.",
  response_too_large: "Provider HTTP response exceeded the byte limit.",
  runtime_aborted: "Provider HTTP request was aborted by runtime shutdown.",
  timeout: "Provider HTTP request exceeded its timeout.",
  transport_closed: "Provider HTTP transport is closed.",
  unsupported_content_type: "Provider HTTP response content type is unsupported.",
});

const providerHttpFetchTransports = new WeakSet<object>();

export const normalizeProviderHttpTimeoutMs = (value: unknown): number => {
  if (value === undefined) {
    return PROVIDER_HTTP_FETCH_DEFAULT_TIMEOUT_MS;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PROVIDER_HTTP_FETCH_DEFAULT_TIMEOUT_MS;
  }

  return Math.min(
    PROVIDER_HTTP_FETCH_TIMEOUT_MAX_MS,
    Math.max(PROVIDER_HTTP_FETCH_TIMEOUT_MIN_MS, Math.trunc(value)),
  );
};

export const createProviderHttpFetchTransport = (
  options: CreateProviderHttpFetchTransportOptions,
): ProviderHttpFetchTransport => {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const drainTimeoutMs = normalizeDrainTimeout(options.drainTimeoutMs);
  const activeCalls = new Set<ActiveFetchCall>();
  const pendingResolvers = new Set<Promise<unknown>>();
  let accepting = true;
  let closePromise: Promise<ProviderHttpFetchTransportCloseResult> | undefined;

  const executeRequest = (
    request: ProviderHttpRequestPlan,
    context: ProviderHttpTransportContext,
    requestMaterial?: ProviderHttpCanonicalRequestMaterial,
  ): Promise<ProviderHttpTransportResult> => {
    if (!accepting) {
      if (requestMaterial) {
        disposeProviderHttpCanonicalRequestMaterial(requestMaterial);
      }
      return Promise.resolve(failureResult(
        "transport_closed",
        safeTraceId(context?.traceId ?? request.traceId),
        0,
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
    const promise = executeFetchCall({
      abort,
      abortKind: () => abortKind,
      context,
      controller,
      fetchImplementation,
      materialResolver: options.materialResolver,
      now,
      trackPendingResolver: (resolverPromise) => {
        let tracked: Promise<unknown>;
        tracked = resolverPromise
          .catch(() => undefined)
          .finally(() => pendingResolvers.delete(tracked));
        pendingResolvers.add(tracked);
      },
      request,
      ...(requestMaterial ? { requestMaterial } : {}),
    });
    const activeCall: ActiveFetchCall = {
      abort: () => abort("transport_closed"),
      promise,
    };
    activeCalls.add(activeCall);
    void promise.then(
      () => activeCalls.delete(activeCall),
      () => activeCalls.delete(activeCall),
    );
    return promise;
  };

  const execute: ProviderHttpTransport = (request, context) =>
    executeRequest(request, context);

  const close = (): Promise<ProviderHttpFetchTransportCloseResult> => {
    if (closePromise) {
      return closePromise;
    }

    accepting = false;
    for (const call of activeCalls) {
      call.abort();
    }
    const draining = drainActiveWork(activeCalls, pendingResolvers, drainTimeoutMs);
    closePromise = draining;
    void draining.then((result) => {
      if (result.status === "timed_out" && closePromise === draining) {
        closePromise = undefined;
      }
    });
    return draining;
  };

  const transport = execute as ProviderHttpFetchTransport;
  transport.close = close;
  transport.executeWithCanonicalRequestMaterial = (request, context, material) =>
    executeRequest(request, context, material);
  transport.state = () => Object.freeze({
    accepting,
    activeCallCount: activeCalls.size + pendingResolvers.size,
  });
  providerHttpFetchTransports.add(transport);
  return transport;
};

export const bindProviderHttpCanonicalRequestMaterial = (
  transport: ProviderHttpTransport,
  material: ProviderHttpCanonicalRequestMaterial,
): ProviderHttpTransport => {
  if (!providerHttpFetchTransports.has(transport)) {
    return transport;
  }
  const fetchTransport = transport as ProviderHttpFetchTransport;
  return (request, context) =>
    fetchTransport.executeWithCanonicalRequestMaterial(request, context, material);
};

async function executeFetchCall(input: {
  abort: (kind: AbortKind) => void;
  abortKind: () => AbortKind | undefined;
  context: ProviderHttpTransportContext;
  controller: AbortController;
  fetchImplementation: typeof fetch;
  materialResolver: ProviderHttpExecutionMaterialResolver;
  now: () => number;
  request: ProviderHttpRequestPlan;
  requestMaterial?: ProviderHttpCanonicalRequestMaterial;
  trackPendingResolver: (promise: Promise<unknown>) => void;
}): Promise<ProviderHttpTransportResult> {
  const startedAtMs = input.now();
  const traceId = safeTraceId(input.context?.traceId ?? input.request.traceId);
  const cleanupSignals = linkAbortSignals(input.context, input.abort);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let material: ProviderHttpExecutionMaterial | undefined;

  try {
    const immediateAbort = currentAbortKind(input.context);
    if (immediateAbort) {
      input.abort(immediateAbort);
      return abortedResult(immediateAbort, traceId, elapsed(input.now, startedAtMs));
    }

    timeout = setTimeout(
      () => input.abort("timeout"),
      normalizeProviderHttpTimeoutMs(input.request.timeoutMs),
    );
    let materialPromise: ReturnType<ProviderHttpExecutionMaterialResolver>;
    let materialResolution;
    try {
      materialPromise = Promise.resolve(input.materialResolver(
        input.request,
        input.requestMaterial,
        { signal: input.controller.signal },
      ));
      materialResolution = await raceWithAbort(
        materialPromise,
        input.controller.signal,
      );
    } catch {
      return failureResult(
        "material_resolution_failed",
        traceId,
        elapsed(input.now, startedAtMs),
      );
    }

    if (materialResolution === ABORTED) {
      input.trackPendingResolver(materialPromise.then(
        (lateResolution) => {
          if (isSuccessfulMaterialResolution(lateResolution)) {
            disposeProviderHttpExecutionMaterial(lateResolution.material);
          }
        },
        () => undefined,
      ));
      const kind = input.abortKind() ?? "runtime_aborted";
      return abortedResult(kind, traceId, elapsed(input.now, startedAtMs));
    }

    if (!isSuccessfulMaterialResolution(materialResolution)) {
      return failureResult(
        "material_resolution_failed",
        traceId,
        elapsed(input.now, startedAtMs),
      );
    }

    material = materialResolution.material;
    let response: Response;
    try {
      response = await useProviderHttpExecutionMaterial(material, (view) =>
        view.environment === "production"
          ? Promise.reject(new ProductionTransportUnpinnedError())
          : input.fetchImplementation(view.url, {
            body: view.body,
            headers: { ...view.headers },
            method: view.method,
            redirect: "error",
            signal: input.controller.signal,
          }));
    } catch (error) {
      const kind = input.abortKind();
      return kind
        ? abortedResult(kind, traceId, elapsed(input.now, startedAtMs))
        : failureResult(
          error instanceof ProductionTransportUnpinnedError
            ? "production_transport_unpinned"
            : "fetch_failed",
          traceId,
          elapsed(input.now, startedAtMs),
        );
    } finally {
      disposeProviderHttpExecutionMaterial(material);
      material = undefined;
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"), input.now());
    const boundedBody = await readBoundedJsonResponse(
      response,
      normalizeResponseLimit(input.request.maxResponseBytes),
      traceId,
      () => input.abortKind(),
      input.now,
      startedAtMs,
    );

    if (!boundedBody.ok) {
      return {
        ...boundedBody.result,
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        statusCode: response.status,
      };
    }

    const completedAbortKind = input.abortKind();
    if (completedAbortKind) {
      return abortedResult(
        completedAbortKind,
        traceId,
        elapsed(input.now, startedAtMs),
      );
    }

    return {
      body: boundedBody.body,
      durationMs: elapsed(input.now, startedAtMs),
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      statusCode: response.status,
      timedOut: false,
    };
  } finally {
    if (input.requestMaterial) {
      disposeProviderHttpCanonicalRequestMaterial(input.requestMaterial);
    }
    if (material) {
      disposeProviderHttpExecutionMaterial(material);
    }
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    cleanupSignals();
  }
}

class ProductionTransportUnpinnedError extends Error {
  constructor() {
    super("Provider HTTP production transport is unavailable.");
    this.name = "ProductionTransportUnpinnedError";
    delete this.stack;
  }
}

function isSuccessfulMaterialResolution(
  value: unknown,
): value is Readonly<{ material: ProviderHttpExecutionMaterial; ok: true }> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    const resolution = value as { material?: unknown; ok?: unknown };
    return resolution.ok === true
      && isProviderHttpExecutionMaterial(resolution.material);
  } catch {
    return false;
  }
}

async function readBoundedJsonResponse(
  response: Response,
  maximumBytes: number,
  traceId: string,
  abortKind: () => AbortKind | undefined,
  now: () => number,
  startedAtMs: number,
): Promise<
  | { body: unknown; ok: true }
  | { ok: false; result: ProviderHttpTransportResult }
> {
  const contentLength = parseContentLength(response.headers.get("content-length"));
  if (contentLength !== undefined && contentLength > maximumBytes) {
    await cancelBody(response.body);
    return { ok: false, result: failureResult("response_too_large", traceId, elapsed(now, startedAtMs)) };
  }

  const contentType = response.headers.get("content-type");
  if (contentType === null || !isJsonContentType(contentType)) {
    await cancelBody(response.body);
    return { ok: false, result: failureResult("unsupported_content_type", traceId, elapsed(now, startedAtMs)) };
  }

  if (!response.body) {
    return { ok: false, result: failureResult("empty_body", traceId, elapsed(now, startedAtMs)) };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        byteCount += value.byteLength;
        if (byteCount > maximumBytes) {
          await safeCancelReader(reader);
          return {
            ok: false,
            result: failureResult("response_too_large", traceId, elapsed(now, startedAtMs)),
          };
        }
        chunks.push(value);
      }
    }
  } catch {
    const kind = abortKind();
    return {
      ok: false,
      result: kind
        ? abortedResult(kind, traceId, elapsed(now, startedAtMs))
        : failureResult("fetch_failed", traceId, elapsed(now, startedAtMs)),
    };
  } finally {
    reader.releaseLock();
  }

  if (byteCount === 0) {
    return { ok: false, result: failureResult("empty_body", traceId, elapsed(now, startedAtMs)) };
  }

  const bytes = new Uint8Array(byteCount);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, result: failureResult("malformed_json", traceId, elapsed(now, startedAtMs)) };
  }

  return { body, ok: true };
}

const ABORTED = Symbol("provider-http-fetch-aborted");

async function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T | typeof ABORTED> {
  if (signal.aborted) {
    return ABORTED;
  }

  let removeAbortListener: () => void = () => {};
  const aborted = new Promise<typeof ABORTED>((resolve) => {
    const onAbort = () => resolve(ABORTED);
    signal.addEventListener("abort", onAbort, { once: true });
    removeAbortListener = () => signal.removeEventListener("abort", onAbort);
  });

  try {
    return await Promise.race([promise, aborted]);
  } finally {
    removeAbortListener();
  }
}

function linkAbortSignals(
  context: ProviderHttpTransportContext,
  abort: (kind: AbortKind) => void,
): () => void {
  const removers: Array<() => void> = [];
  const link = (signal: AbortSignal | undefined, kind: AbortKind) => {
    if (!signal || signal.aborted) {
      return;
    }
    const listener = () => abort(kind);
    signal.addEventListener("abort", listener, { once: true });
    removers.push(() => signal.removeEventListener("abort", listener));
  };

  link(context.signal, "caller_aborted");
  link(context.runtimeSignal, "runtime_aborted");
  return () => removers.splice(0).forEach((remove) => remove());
}

function currentAbortKind(context: ProviderHttpTransportContext): AbortKind | undefined {
  if (context.signal?.aborted) {
    return "caller_aborted";
  }
  if (context.runtimeSignal?.aborted) {
    return "runtime_aborted";
  }
  return undefined;
}

function abortedResult(
  kind: AbortKind,
  traceId: string,
  durationMs: number,
): ProviderHttpTransportResult {
  return {
    aborted: true,
    diagnostic: diagnostic(kind, traceId),
    durationMs,
    timedOut: kind === "timeout",
  };
}

function failureResult(
  code: ProviderHttpTransportResultDiagnosticCode,
  traceId: string,
  durationMs: number,
): ProviderHttpTransportResult {
  return {
    diagnostic: diagnostic(code, traceId),
    durationMs,
    timedOut: false,
  };
}

function diagnostic(
  code: ProviderHttpTransportResultDiagnosticCode,
  traceId: string,
): ProviderHttpTransportResultDiagnostic {
  return Object.freeze({ code, message: DIAGNOSTIC_MESSAGES[code], traceId: safeTraceId(traceId) });
}

async function drainActiveWork(
  activeCalls: ReadonlySet<ActiveFetchCall>,
  pendingResolvers: ReadonlySet<Promise<unknown>>,
  timeoutMs: number,
): Promise<ProviderHttpFetchTransportCloseResult> {
  if (activeCalls.size === 0 && pendingResolvers.size === 0) {
    return Object.freeze({ activeCallCount: 0, status: "drained" as const });
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timed_out">((resolve) => {
    timeout = setTimeout(() => resolve("timed_out"), timeoutMs);
  });
  const drained = drainWork(activeCalls, pendingResolvers).then(() => "drained" as const);
  const status = await Promise.race([drained, timedOut]);
  if (timeout !== undefined) {
    clearTimeout(timeout);
  }

  return Object.freeze({
    activeCallCount: status === "drained"
      ? 0
      : activeCalls.size + pendingResolvers.size,
    status,
  });
}

async function drainWork(
  activeCalls: ReadonlySet<ActiveFetchCall>,
  pendingResolvers: ReadonlySet<Promise<unknown>>,
): Promise<void> {
  await Promise.allSettled([...activeCalls].map(({ promise }) => promise));
  while (pendingResolvers.size > 0) {
    await Promise.allSettled([...pendingResolvers]);
  }
}

async function cancelBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  try {
    await body?.cancel();
  } catch {
    // Cancellation is best-effort after the safe result has already been selected.
  }
}

async function safeCancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    // Cancellation is best-effort after the byte limit is exceeded.
  }
}

function parseContentLength(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseRetryAfterMs(value: string | null, nowMs: number): number | undefined {
  if (value === null) {
    return undefined;
  }
  if (/^\d+$/.test(value)) {
    return Math.min(Number(value) * 1_000, PROVIDER_HTTP_FETCH_MAX_RETRY_AFTER_MS);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return Math.min(
    Math.max(0, timestamp - nowMs),
    PROVIDER_HTTP_FETCH_MAX_RETRY_AFTER_MS,
  );
}

function isJsonContentType(value: string): boolean {
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(mediaType);
}

function normalizeResponseLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return 256 * 1024;
  }
  return Math.min(256 * 1024, Math.max(1_024, value));
}

function normalizeDrainTimeout(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return PROVIDER_HTTP_FETCH_DEFAULT_DRAIN_TIMEOUT_MS;
  }
  return Math.min(10_000, Math.max(1, value));
}

function elapsed(now: () => number, startedAtMs: number): number {
  return Math.max(0, now() - startedAtMs);
}

function safeTraceId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
    ? value
    : "trace-unavailable";
}
