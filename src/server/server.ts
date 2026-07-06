import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { createCampaignOsApiRuntime, type ApiRuntimeHeaders } from "./apiRuntime";

export interface CampaignOsApiServerHandle {
  server: Server;
  stop(): Promise<void>;
  url: string;
}

export interface StartCampaignOsApiServerOptions {
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  port?: number;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5174;

const toRuntimeHeaders = (request: IncomingMessage): ApiRuntimeHeaders =>
  Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [
      key,
      Array.isArray(value) || typeof value === "string" ? value : undefined,
    ]),
  ) as ApiRuntimeHeaders;

const readRequestBody = (request: IncomingMessage): Promise<string | undefined> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      resolve(Buffer.concat(chunks).toString("utf8"));
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
  response.end(JSON.stringify(body));
};

const resolvePort = (explicitPort?: number) => {
  if (explicitPort !== undefined) {
    return explicitPort;
  }

  const envPort = Number.parseInt(process.env.CAMPAIGN_OS_API_PORT ?? "", 10);

  return Number.isFinite(envPort) && envPort > 0 ? envPort : DEFAULT_PORT;
};

export const startCampaignOsApiServer = async ({
  host = DEFAULT_HOST,
  logger = console,
  port,
}: StartCampaignOsApiServerOptions = {}): Promise<CampaignOsApiServerHandle> => {
  const runtime = createCampaignOsApiRuntime();
  const resolvedPort = resolvePort(port);
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    const runtimeResponse = await runtime.handle({
      body,
      headers: toRuntimeHeaders(request),
      method: request.method ?? "GET",
      path: request.url ?? "/",
    });

    writeJsonResponse(
      response,
      runtimeResponse.status,
      runtimeResponse.headers,
      runtimeResponse.body,
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(resolvedPort, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const url = `http://${host}:${address.port}`;

  if (logger) {
    logger.log(`[campaign-os-api-runtime] listening on ${url} (local_seeded, no live operations)`);
  }

  return {
    server,
    url,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
};

if (process.argv.includes("--listen")) {
  startCampaignOsApiServer().catch((error: unknown) => {
    console.error("[campaign-os-api-runtime] failed to start", error);
    process.exitCode = 1;
  });
}
