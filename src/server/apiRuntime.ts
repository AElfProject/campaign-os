import { createCampaignOsLocalService, type CampaignOsLocalService } from "../domain/campaignService";
import type { ApiRuntimeEnvelope } from "./envelope";
import { createFailureEnvelope, createSuccessEnvelope } from "./envelope";
import { malformedJson, methodNotAllowed, routeNotFound, toApiRuntimeErrorBody } from "./errors";
import type { ApiRuntimeRouteContract } from "./contracts";
import { apiRuntimeRoutes } from "./routes";
import { createApiRuntimeHandlers } from "./handlers";

export type ApiRuntimeHeaders = Record<string, string | readonly string[] | undefined>;

export interface ApiRuntimeRequest {
  body?: string | unknown;
  headers?: ApiRuntimeHeaders;
  method: string;
  path: string;
}

export interface ApiRuntimeResponse<TPayload = unknown> {
  body: ApiRuntimeEnvelope<TPayload>;
  headers: Record<string, string>;
  status: number;
}

export interface ApiRuntimeHandlerContext {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, string>;
  route: ApiRuntimeRouteContract;
  service: CampaignOsLocalService;
  version: string;
}

export type ApiRuntimeHandler = (context: ApiRuntimeHandlerContext) => unknown | Promise<unknown>;

export interface CampaignOsApiRuntime {
  handle(request: ApiRuntimeRequest): Promise<ApiRuntimeResponse>;
}

interface ApiRuntimeRouteMatcher {
  match(pathname: string): Record<string, string> | undefined;
  route: ApiRuntimeRouteContract;
}

export interface CreateCampaignOsApiRuntimeOptions {
  service?: CampaignOsLocalService;
  version?: string;
}

let generatedTraceSequence = 0;

const responseHeaders = (traceId: string): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "x-campaign-os-trace-id": traceId,
});

const normalizeMethod = (method: string) => method.trim().toUpperCase();

const normalizePathname = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
};

const splitPath = (path: string) =>
  normalizePathname(path)
    .split("/")
    .filter(Boolean);

const compileRouteMatcher = (route: ApiRuntimeRouteContract): ApiRuntimeRouteMatcher => {
  const routeSegments = splitPath(route.path);

  return {
    route,
    match: (pathname) => {
      const requestSegments = splitPath(pathname);

      if (requestSegments.length !== routeSegments.length) {
        return undefined;
      }

      const params: Record<string, string> = {};

      for (let index = 0; index < routeSegments.length; index += 1) {
        const routeSegment = routeSegments[index];
        const requestSegment = requestSegments[index];

        if (routeSegment.startsWith(":")) {
          params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
          continue;
        }

        if (routeSegment !== requestSegment) {
          return undefined;
        }
      }

      return params;
    },
  };
};

const getHeader = (headers: ApiRuntimeHeaders | undefined, name: string): string | undefined => {
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

const createTraceId = (headers?: ApiRuntimeHeaders) => {
  const callerTraceId = getHeader(headers, "x-campaign-os-trace-id")?.trim();

  if (callerTraceId) {
    return callerTraceId;
  }

  generatedTraceSequence += 1;

  return `campaign-os-trace-${Date.now().toString(36)}-${generatedTraceSequence}`;
};

const parseQuery = (searchParams: URLSearchParams): Record<string, string> =>
  Object.fromEntries(Array.from(searchParams.entries()));

const parseRequestTarget = (path: string) => {
  const url = new URL(path || "/", "http://127.0.0.1");

  return {
    pathname: normalizePathname(url.pathname),
    query: parseQuery(url.searchParams),
  };
};

const parseBody = (request: ApiRuntimeRequest, method: string) => {
  if (method !== "POST") {
    return undefined;
  }

  if (request.body === undefined || request.body === "") {
    return {};
  }

  if (typeof request.body !== "string") {
    return request.body;
  }

  try {
    return JSON.parse(request.body) as unknown;
  } catch {
    throw malformedJson();
  }
};

const findMatchingRoute = (
  matchers: readonly ApiRuntimeRouteMatcher[],
  method: string,
  pathname: string,
) => {
  const pathMatches = matchers
    .map((matcher) => ({ matcher, params: matcher.match(pathname) }))
    .filter((match): match is { matcher: ApiRuntimeRouteMatcher; params: Record<string, string> } =>
      Boolean(match.params),
    );

  const methodMatch = pathMatches.find(({ matcher }) => matcher.route.method === method);

  if (methodMatch) {
    return methodMatch;
  }

  if (pathMatches.length > 0) {
    throw methodNotAllowed(
      method,
      pathname,
      pathMatches.map(({ matcher }) => matcher.route.method),
    );
  }

  throw routeNotFound(method, pathname);
};

export const createCampaignOsApiRuntime = ({
  service = createCampaignOsLocalService(),
  version = "0.1.0-local",
}: CreateCampaignOsApiRuntimeOptions = {}): CampaignOsApiRuntime => {
  const handlers = createApiRuntimeHandlers();
  const matchers = apiRuntimeRoutes.map(compileRouteMatcher);

  return {
    handle: async (request) => {
      const traceId = createTraceId(request.headers);

      try {
        const method = normalizeMethod(request.method);
        const { pathname, query } = parseRequestTarget(request.path);
        const { matcher, params } = findMatchingRoute(matchers, method, pathname);
        const body = parseBody(request, method);
        const handler = handlers[matcher.route.id];
        const data = await handler({
          body,
          params,
          query,
          route: matcher.route,
          service,
          version,
        });

        return {
          body: createSuccessEnvelope({
            data,
            routeCount: apiRuntimeRoutes.length,
            traceId,
            version,
          }),
          headers: responseHeaders(traceId),
          status: 200,
        };
      } catch (error) {
        const runtimeError = toApiRuntimeErrorBody(error);

        return {
          body: createFailureEnvelope({
            error: runtimeError,
            routeCount: apiRuntimeRoutes.length,
            traceId,
            version,
          }),
          headers: responseHeaders(traceId),
          status: runtimeError.status,
        };
      }
    },
  };
};
