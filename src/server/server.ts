import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createCampaignOsApiRuntime, type ApiRuntimeHeaders } from "./apiRuntime";
import { createBackendServiceReadinessReport } from "./backendService";
import { apiRuntimeRoutes } from "./routes";
import { evaluateServerRequestGuard } from "./serverRequestGuard";
import {
  createServerRuntimeReadiness,
  withServerRuntimeReadiness,
  type ServerShutdownState,
} from "./serverReadiness";
import {
  formatServerStartupLog,
  resolveApiServerRuntimeContract,
  type ApiServerRuntimeContract,
} from "./serverRuntime";

export interface CampaignOsApiServerHandle {
  runtimeContract: ApiServerRuntimeContract;
  server: Server;
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
  shutdownTimeoutMs?: number;
  version?: string;
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
    request.on("error", reject);
  });

const writeJsonResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
) => {
  response.writeHead(status, headers);
  response.end(body === undefined ? undefined : JSON.stringify(body));
};

const isRuntimeMetadataPath = (path: string | undefined) => {
  const pathname = new URL(path || "/", "http://127.0.0.1").pathname;

  return pathname === "/api/health" || pathname === "/api/contracts";
};

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const startCampaignOsApiServer = async ({
  allowedCorsOrigins,
  env,
  host,
  logger = console,
  maxBodyBytes,
  port,
  profileId,
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
  const runtime = createCampaignOsApiRuntime({
    backendServiceReadiness: () => backendServiceReadiness,
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

  const server = createServer(async (request, response) => {
    shutdownState.activeRequestCount += 1;

    try {
      const requestBody = await readRequestBody(request, runtimeContract.requestGuard.maxBodyBytes);
      const guardDecision = evaluateServerRequestGuard({
        body: requestBody.body,
        bodyBytes: requestBody.bodyBytes,
        headers: request.headers,
        method: request.method ?? "GET",
        path: request.url ?? "/",
      }, runtimeContract, apiRuntimeRoutes.length);

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
        ? withServerRuntimeReadiness(
          runtimeResponse.body,
          createServerRuntimeReadiness({
            backendReadiness: backendServiceReadiness,
            contract: runtimeContract,
            shutdownState,
          }),
        )
        : runtimeResponse.body;

      writeJsonResponse(
        response,
        runtimeResponse.status,
        {
          ...guardDecision.headers,
          ...runtimeResponse.headers,
        },
        responseBody,
      );
    } finally {
      shutdownState.activeRequestCount = Math.max(0, shutdownState.activeRequestCount - 1);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(runtimeContract.port, runtimeContract.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

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

  const stop = async () => {
    if (shutdownState.state === "stopped") {
      return;
    }

    stopPromise ??= (async () => {
      shutdownState.state = "stopping";
      shutdownState.stopStartedAt = new Date().toISOString();

      const closePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      const inFlightPromise = (async () => {
        const startedAt = Date.now();

        while (
          shutdownState.activeRequestCount > 0
          && Date.now() - startedAt < runtimeContract.shutdown.shutdownTimeoutMs
        ) {
          await wait(5);
        }
      })();

      await Promise.race([
        Promise.all([closePromise, inFlightPromise]),
        wait(runtimeContract.shutdown.shutdownTimeoutMs),
      ]);

      shutdownState.activeRequestCount = 0;
      shutdownState.closedAt = new Date().toISOString();
      shutdownState.state = "stopped";
    })();

    await stopPromise;
  };

  return {
    runtimeContract,
    server,
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
