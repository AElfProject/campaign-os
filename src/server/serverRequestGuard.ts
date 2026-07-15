import { createFailureEnvelope } from "./envelope";
import {
  invalidRequest,
  malformedJson,
  methodNotAllowed,
  toApiRuntimeErrorBody,
} from "./errors";
import type {
  ApiServerRuntimeContract,
  ServerCorsPolicy,
  ServerRequestGuardPolicy,
} from "./serverRuntime";

export type ServerGuardHeaders = Record<string, string | readonly string[] | undefined>;
export type ServerRequestGuardDecision =
  | ServerRequestAcceptedDecision
  | ServerRequestRejectedDecision
  | ServerRequestPreflightDecision;

export interface ServerRequestGuardInput {
  body?: string;
  bodyBytes?: number;
  headers?: ServerGuardHeaders;
  method: string;
  path: string;
}

export interface ServerRequestAcceptedDecision {
  body?: string;
  headers: Record<string, string>;
  kind: "accepted";
  traceId: string;
}

export interface ServerRequestRejectedDecision {
  body: ReturnType<typeof createFailureEnvelope>;
  headers: Record<string, string>;
  kind: "rejected";
  status: number;
  traceId: string;
}

export interface ServerRequestPreflightDecision {
  body?: ReturnType<typeof createFailureEnvelope>;
  headers: Record<string, string>;
  kind: "preflight";
  status: number;
  traceId: string;
}

let generatedTraceSequence = 0;

const getHeader = (headers: ServerGuardHeaders | undefined, name: string): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const normalizedName = name.toLowerCase();
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === normalizedName)?.[1];

  if (Array.isArray(match)) {
    return match[0];
  }

  return typeof match === "string" ? match : undefined;
};

export const createServerTraceId = (
  headers?: ServerGuardHeaders,
  traceHeaderName: ServerRequestGuardPolicy["traceHeaderName"] = "x-campaign-os-trace-id",
) => {
  const callerTraceId = getHeader(headers, traceHeaderName)?.trim();

  if (callerTraceId) {
    return callerTraceId;
  }

  generatedTraceSequence += 1;

  return `campaign-os-server-trace-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const normalizeMethod = (method: string) => method.trim().toUpperCase();

const normalizeContentType = (contentType: string | undefined) =>
  contentType?.split(";")[0]?.trim().toLowerCase();

const sanitizeRequestPath = (path: string) => new URL(path || "/", "http://127.0.0.1").pathname;

const createBaseHeaders = (traceId: string): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "x-campaign-os-trace-id": traceId,
});

const createFailureDecision = ({
  error,
  routeCount,
  runtimeVersion,
  traceId,
}: {
  error: unknown;
  routeCount: number;
  runtimeVersion: string;
  traceId: string;
}): ServerRequestRejectedDecision => {
  const runtimeError = toApiRuntimeErrorBody(error);

  return {
    body: createFailureEnvelope({
      error: runtimeError,
      routeCount,
      traceId,
      version: runtimeVersion,
    }),
    headers: createBaseHeaders(traceId),
    kind: "rejected",
    status: runtimeError.status,
    traceId,
  };
};

const isAllowedOrigin = (origin: string | undefined, corsPolicy: ServerCorsPolicy) =>
  origin === undefined
  || corsPolicy.allowedOrigins.includes(origin)
  || corsPolicy.allowedOrigins.includes("*");

const createCorsHeaders = (
  corsPolicy: ServerCorsPolicy,
  origin: string | undefined,
): Record<string, string> => {
  if (!corsPolicy.enabled) {
    return {};
  }

  const allowOrigin =
    origin && corsPolicy.allowedOrigins.includes(origin)
      ? origin
      : corsPolicy.allowedOrigins.includes("*")
        ? "*"
        : corsPolicy.allowedOrigins[0];

  return {
    "access-control-allow-headers": corsPolicy.allowedHeaders.join(", "),
    "access-control-allow-methods": corsPolicy.allowedMethods.join(", "),
    "access-control-allow-origin": allowOrigin,
    "access-control-expose-headers": corsPolicy.exposedHeaders.join(", "),
    "access-control-max-age": String(corsPolicy.maxAgeSeconds),
    vary: "origin",
  };
};

const withCorsHeaders = (
  headers: Record<string, string>,
  corsPolicy: ServerCorsPolicy,
  origin: string | undefined,
) => ({
  ...headers,
  ...createCorsHeaders(corsPolicy, origin),
});

const createRejectedPreflight = ({
  corsPolicy,
  error,
  origin,
  routeCount,
  runtimeVersion,
  traceId,
}: {
  corsPolicy: ServerCorsPolicy;
  error: unknown;
  origin: string | undefined;
  routeCount: number;
  runtimeVersion: string;
  traceId: string;
}): ServerRequestPreflightDecision => {
  const rejected = createFailureDecision({
    error,
    routeCount,
    runtimeVersion,
    traceId,
  });

  return {
    body: rejected.body,
    headers: withCorsHeaders(rejected.headers, corsPolicy, origin),
    kind: "preflight",
    status: rejected.status,
    traceId,
  };
};

export const evaluateServerRequestGuard = (
  input: ServerRequestGuardInput,
  contract: Pick<ApiServerRuntimeContract, "corsPolicy" | "requestGuard" | "runtimeVersion">,
  routeCount = 0,
): ServerRequestGuardDecision => {
  const traceId = createServerTraceId(input.headers, contract.requestGuard.traceHeaderName);
  const origin = getHeader(input.headers, "origin");
  const method = normalizeMethod(input.method);
  const safePath = sanitizeRequestPath(input.path);

  if (method === "OPTIONS") {
    const requestedMethod = normalizeMethod(
      getHeader(input.headers, "access-control-request-method") ?? "",
    );

    if (!contract.corsPolicy.enabled || !isAllowedOrigin(origin, contract.corsPolicy)) {
      return createRejectedPreflight({
        corsPolicy: contract.corsPolicy,
        error: invalidRequest("origin", "CORS origin is not allowed."),
        origin,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    if (!contract.corsPolicy.allowedMethods.includes(requestedMethod)) {
      return createRejectedPreflight({
        corsPolicy: contract.corsPolicy,
        error: methodNotAllowed(requestedMethod || "OPTIONS", input.path, contract.corsPolicy.allowedMethods),
        origin,
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    return {
      headers: withCorsHeaders(
        { "x-campaign-os-trace-id": traceId },
        contract.corsPolicy,
        origin,
      ),
      kind: "preflight",
      status: 204,
      traceId,
    };
  }

  if (!contract.requestGuard.allowedMethods.includes(method)) {
    return createFailureDecision({
      error: methodNotAllowed(method, safePath, contract.requestGuard.allowedMethods),
      routeCount,
      runtimeVersion: contract.runtimeVersion,
      traceId,
    });
  }

  if (method === "POST") {
    const contentType = normalizeContentType(getHeader(input.headers, "content-type"));

    if (contentType && !contract.requestGuard.jsonContentTypes.includes(contentType)) {
      return createFailureDecision({
        error: invalidRequest("content-type", "POST requests must use application/json."),
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    const bodyBytes = input.bodyBytes ?? Buffer.byteLength(input.body ?? "", "utf8");

    if (bodyBytes > contract.requestGuard.maxBodyBytes) {
      return createFailureDecision({
        error: invalidRequest("body", "Request body exceeds the Campaign OS API server limit."),
        routeCount,
        runtimeVersion: contract.runtimeVersion,
        traceId,
      });
    }

    if (input.body !== undefined && input.body !== "") {
      try {
        JSON.parse(input.body);
      } catch {
        return createFailureDecision({
          error: malformedJson(),
          routeCount,
          runtimeVersion: contract.runtimeVersion,
          traceId,
        });
      }
    }
  }

  return {
    body: input.body,
    headers: withCorsHeaders(createBaseHeaders(traceId), contract.corsPolicy, origin),
    kind: "accepted",
    traceId,
  };
};
