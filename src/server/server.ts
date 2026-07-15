import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  createCampaignOsApiServiceContract,
  type CampaignOsApiServiceContract,
} from "./apiService";
import {
  createCampaignOsApiRuntime,
  type ApiRuntimeHeaders,
  type CampaignOsApiRuntime,
  type CreateCampaignOsApiRuntimeOptions,
} from "./apiRuntime";
import { createFailureEnvelope, type ApiRuntimeEnvelope } from "./envelope";
import { internalRuntimeError, persistenceUnavailable } from "./errors";
import { createBackendServiceReadinessReport } from "./backendService";
import { apiRuntimeContractRoutes } from "./routes";
import {
  createAdminFailureEnvelope,
  evaluateServerRequestGuard,
  isAdminRequestTarget,
} from "./serverRequestGuard";
import {
  createServerRuntimeReadiness,
  withServerRuntimeReadiness,
  type ServerRuntimeReadiness,
  type ServerShutdownState,
} from "./serverReadiness";
import {
  formatServerStartupLog,
  resolveApiServerRuntimeContract,
  type ApiServerRuntimeContract,
} from "./serverRuntime";

export interface CampaignOsApiServerHandle {
  getReadiness(): ServerRuntimeReadiness;
  getServiceContract(): CampaignOsApiServiceContract;
  getServiceReadiness(): CampaignOsApiServiceContract["readiness"];
  runtimeContract: ApiServerRuntimeContract;
  server: Server;
  serviceContract: CampaignOsApiServiceContract;
  stop(): Promise<void>;
  url: string;
}

export interface StartCampaignOsApiServerOptions {
  allowedCorsOrigins?: string[];
  env?: Record<string, string | undefined>;
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  maxBodyBytes?: number;
  port?: number;
  profileId?: string;
  runtimeFactory?: (options: CreateCampaignOsApiRuntimeOptions) => CampaignOsApiRuntime;
  shutdownTimeoutMs?: number;
  version?: string;
}

export type ApiServerShutdownErrorCode =
  | "API_SERVER_HTTP_CLOSE_FAILED"
  | "API_SERVER_SHUTDOWN_TIMEOUT"
  | "API_SERVER_RUNTIME_CLOSE_FAILED";

export class ApiServerShutdownError extends Error {
  readonly code: ApiServerShutdownErrorCode;
  readonly traceId: string;

  constructor(code: ApiServerShutdownErrorCode, traceId: string) {
    super("Campaign OS API server shutdown failed.");
    this.name = "ApiServerShutdownError";
    this.code = code;
    this.traceId = traceId;
  }
}

interface RequestBodyReadResult {
  body?: string;
  bodyBytes: number;
}

const toRuntimeHeaders = (request: IncomingMessage): ApiRuntimeHeaders =>
  Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [
      key,
      Array.isArray(value) || typeof value === "string" ? value : undefined,
    ]),
  ) as ApiRuntimeHeaders;

const toGuardHeaders = (
  request: IncomingMessage,
  traceHeaderName: string,
) => {
  const headers = { ...request.headers };
  const traceHeaderKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === traceHeaderName.toLowerCase(),
  );
  const rawTraceId = traceHeaderKey
    ? Array.isArray(headers[traceHeaderKey])
      ? headers[traceHeaderKey]?.[0]
      : headers[traceHeaderKey]
    : undefined;
  const traceId = typeof rawTraceId === "string" ? rawTraceId.trim() : undefined;
  const safe = Boolean(
    traceId
    && traceId.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(traceId)
    && !/(?:bearer|password|private|raw[_-]?signature|secret|token)/i.test(traceId)
  );

  if (traceHeaderKey && !safe) {
    delete headers[traceHeaderKey];
  }

  return headers;
};

const readRequestBody = (
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<RequestBodyReadResult> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bodyBytes = 0;

    request.on("data", (chunk: Buffer) => {
      bodyBytes += chunk.byteLength;

      if (bodyBytes <= maxBodyBytes) {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({ bodyBytes });
        return;
      }

      resolve({ body: Buffer.concat(chunks).toString("utf8"), bodyBytes });
    });
    request.on("aborted", () => reject(new Error("Request aborted.")));
    request.on("error", reject);
  });

const writeJsonResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);

  response.writeHead(status, headers);
  response.end(payload);
};

const writeRuntimeResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
  rawBody: string | undefined,
) => {
  if (rawBody !== undefined && status >= 200 && status < 300) {
    response.writeHead(status, headers);
    response.end(Buffer.from(rawBody, "utf8"));
    return;
  }

  writeJsonResponse(response, status, headers, body);
};

const isRuntimeMetadataPath = (path: string | undefined) => {
  const pathname = new URL(path || "/", "http://127.0.0.1").pathname;

  return pathname === "/api/health" || pathname === "/api/contracts";
};

const isLegacyRuntimeEnvelope = (body: unknown): body is ApiRuntimeEnvelope =>
  typeof body === "object"
  && body !== null
  && "runtime" in body
  && "safety" in body
  && "timestamp" in body;

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

const settleWithin = <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<"fulfilled" | "rejected" | "timeout">((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), Math.max(0, timeoutMs));

    promise.then(
      () => {
        clearTimeout(timer);
        resolve("fulfilled");
      },
      () => {
        clearTimeout(timer);
        resolve("rejected");
      },
    );
  });

export const startCampaignOsApiServer = async ({
  allowedCorsOrigins,
  env,
  host,
  logger = console,
  maxBodyBytes,
  port,
  profileId,
  runtimeFactory = createCampaignOsApiRuntime,
  shutdownTimeoutMs,
  version,
}: StartCampaignOsApiServerOptions = {}): Promise<CampaignOsApiServerHandle> => {
  const runtimeContract = resolveApiServerRuntimeContract({
    allowedCorsOrigins,
    env,
    host,
    maxBodyBytes,
    port,
    profileId,
    shutdownTimeoutMs,
    version,
  });
  const backendServiceReadiness = createBackendServiceReadinessReport({
    configOptions: {
      env,
      host: runtimeContract.host,
      port: runtimeContract.port,
      profileId: runtimeContract.profileId,
      version: runtimeContract.runtimeVersion,
    },
  });
  const runtime = runtimeFactory({
    backendServiceReadiness: () => backendServiceReadiness,
    logger,
    runtimeConfigOptions: {
      env,
      version: runtimeContract.runtimeVersion,
    },
    version: runtimeContract.runtimeVersion,
  });
  const shutdownState: ServerShutdownState = {
    activeRequestCount: 0,
    state: "running",
  };
  let stopPromise: Promise<void> | undefined;
  const getReadiness = () => createServerRuntimeReadiness({
    backendReadiness: backendServiceReadiness,
    contract: runtimeContract,
    shutdownState,
  });
  const getServiceContract = () => createCampaignOsApiServiceContract({
    allowedCorsOrigins,
    env,
    host: runtimeContract.host,
    maxBodyBytes: runtimeContract.requestGuard.maxBodyBytes,
    port: runtimeContract.port,
    profileId: runtimeContract.profileId,
    shutdownState,
    shutdownTimeoutMs: runtimeContract.shutdown.shutdownTimeoutMs,
    startedAt: runtimeContract.startedAt,
    version: runtimeContract.runtimeVersion,
  });
  const getServiceReadiness = () => getServiceContract().readiness;

  const server = createServer((request, response) => {
    if (shutdownState.state !== "running") {
      const traceId = randomUUID();
      const runtimeError = persistenceUnavailable("server.shutdown").body;

      request.resume();
      try {
        writeJsonResponse(
          response,
          503,
          {
            connection: "close",
            "content-type": "application/json",
            "x-campaign-os-trace-id": traceId,
          },
          isAdminRequestTarget(request.url ?? "/")
            ? createAdminFailureEnvelope(runtimeError, traceId)
            : createFailureEnvelope({
              error: runtimeError,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeContract.runtimeVersion,
            }),
        );
      } catch {
        response.destroy();
      }

      return;
    }

    shutdownState.activeRequestCount += 1;

    void (async () => {
      try {
        const requestBody = await readRequestBody(request, runtimeContract.requestGuard.maxBodyBytes);
        const guardDecision = evaluateServerRequestGuard({
          body: requestBody.body,
          bodyBytes: requestBody.bodyBytes,
          headers: toGuardHeaders(request, runtimeContract.requestGuard.traceHeaderName),
          method: request.method ?? "GET",
          path: request.url ?? "/",
        }, runtimeContract, apiRuntimeContractRoutes.length);

        if (guardDecision.kind === "preflight") {
          writeJsonResponse(response, guardDecision.status, guardDecision.headers, guardDecision.body);
          return;
        }

        if (guardDecision.kind === "rejected") {
          writeJsonResponse(response, guardDecision.status, guardDecision.headers, guardDecision.body);
          return;
        }

        const runtimeResponse = await runtime.handle({
          body: guardDecision.body,
          headers: toRuntimeHeaders(request),
          method: request.method ?? "GET",
          path: request.url ?? "/",
        });
        const responseBody = isRuntimeMetadataPath(request.url)
          && isLegacyRuntimeEnvelope(runtimeResponse.body)
          ? withServerRuntimeReadiness(
            runtimeResponse.body,
            getReadiness(),
          )
          : runtimeResponse.body;

        writeRuntimeResponse(
          response,
          runtimeResponse.status,
          {
            ...guardDecision.headers,
            ...runtimeResponse.headers,
          },
          responseBody,
          runtimeResponse.rawBody,
        );
      } catch {
        const traceId = randomUUID();
        const runtimeError = internalRuntimeError().body;

        if (logger) {
          logger.error(
            `[campaign-os-api-runtime] request_failed code=API_SERVER_REQUEST_FAILED traceId=${traceId}`,
          );
        }

        if (!response.destroyed && !response.headersSent && !response.writableEnded) {
          try {
            writeJsonResponse(
              response,
              500,
              {
                "content-type": "application/json",
                "x-campaign-os-trace-id": traceId,
              },
              isAdminRequestTarget(request.url ?? "/")
                ? createAdminFailureEnvelope(runtimeError, traceId)
                : createFailureEnvelope({
                  error: runtimeError,
                  routeCount: apiRuntimeContractRoutes.length,
                  traceId,
                  version: runtimeContract.runtimeVersion,
                }),
            );
          } catch {
            response.destroy();
          }
        } else if (!response.destroyed && !response.writableEnded) {
          response.destroy();
        }
      } finally {
        shutdownState.activeRequestCount = Math.max(0, shutdownState.activeRequestCount - 1);
      }
    })().catch(() => {
      if (!response.destroyed) {
        response.destroy();
      }
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(runtimeContract.port, runtimeContract.host, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    const cleanupTraceId = randomUUID();
    const cleanupResult = await settleWithin(
      runtime.close(),
      runtimeContract.shutdown.shutdownTimeoutMs,
    );

    if (cleanupResult !== "fulfilled" && logger) {
      logger.error(
        `[campaign-os-api-runtime] startup_cleanup_failed code=API_SERVER_RUNTIME_CLOSE_FAILED traceId=${cleanupTraceId}`,
      );
    }

    throw error;
  }

  const address = server.address() as AddressInfo;
  const url = `http://${runtimeContract.host}:${address.port}`;

  if (logger) {
    logger.log(
      [
        `[campaign-os-api-runtime] listening on ${url}`,
        `entrypoint=${backendServiceReadiness.entrypoint.id}`,
        formatServerStartupLog(runtimeContract),
      ].join(" "),
    );
  }

  const stop = (): Promise<void> => {
    if (stopPromise) {
      return stopPromise;
    }

    stopPromise = (async () => {
      shutdownState.state = "stopping";
      shutdownState.stopStartedAt = new Date().toISOString();
      const shutdownTraceId = randomUUID();
      const deadline = Date.now() + runtimeContract.shutdown.shutdownTimeoutMs;
      let failureCode: ApiServerShutdownErrorCode | undefined;

      const httpClosePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      while (shutdownState.activeRequestCount > 0 && Date.now() < deadline) {
        await wait(5);
      }

      if (shutdownState.activeRequestCount > 0) {
        failureCode = "API_SERVER_SHUTDOWN_TIMEOUT";
        server.closeAllConnections();
      } else {
        server.closeIdleConnections();
      }

      const httpCloseResult = await settleWithin(
        httpClosePromise,
        Math.max(0, deadline - Date.now()),
      );
      if (httpCloseResult === "rejected") {
        failureCode ??= "API_SERVER_HTTP_CLOSE_FAILED";
      } else if (httpCloseResult === "timeout") {
        failureCode ??= "API_SERVER_SHUTDOWN_TIMEOUT";
        server.closeAllConnections();
      }

      const runtimeCloseResult = await settleWithin(
        runtime.close(),
        Math.max(0, deadline - Date.now()),
      );
      if (runtimeCloseResult === "rejected") {
        failureCode ??= "API_SERVER_RUNTIME_CLOSE_FAILED";
      } else if (runtimeCloseResult === "timeout") {
        failureCode ??= "API_SERVER_SHUTDOWN_TIMEOUT";
      }

      shutdownState.activeRequestCount = 0;
      shutdownState.closedAt = new Date().toISOString();
      shutdownState.state = "stopped";

      if (failureCode) {
        if (logger) {
          logger.error(
            `[campaign-os-api-runtime] shutdown_failed code=${failureCode} traceId=${shutdownTraceId}`,
          );
        }
        throw new ApiServerShutdownError(failureCode, shutdownTraceId);
      }
    })();

    return stopPromise;
  };

  return {
    getReadiness,
    getServiceContract,
    getServiceReadiness,
    runtimeContract,
    server,
    get serviceContract() {
      return getServiceContract();
    },
    stop,
    url,
  };
};

if (process.argv.includes("--listen")) {
  startCampaignOsApiServer().catch((error: unknown) => {
    console.error("[campaign-os-api-runtime] failed to start", error);
    process.exitCode = 1;
  });
}
