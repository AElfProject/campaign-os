import { startCampaignOsApiServer } from "./server";

type SmokePayload = {
  data?: unknown;
  ok?: boolean;
  traceId?: string;
};

export interface BackendRuntimeSmokeOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  port?: number;
  shutdownTimeoutMs?: number;
}

export interface BackendRuntimeSmokeCheck {
  activationPresent: boolean;
  deploymentHandoff?: unknown;
  endpoint: "/api/health" | "/api/contracts";
  ok: boolean;
  status: number;
  traceId: string;
}

export interface BackendRuntimeSmokeSummary {
  activationId?: string;
  checks: {
    contracts: BackendRuntimeSmokeCheck;
    health: BackendRuntimeSmokeCheck;
  };
  host: string;
  liveSideEffectsEnabled: boolean;
  port: number;
  productionReady: boolean;
  requiredBeforeProduction: string[];
  shutdownState: "running" | "stopping" | "stopped";
  status: "passed";
  traceIds: {
    contracts: string;
    health: string;
  };
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJson = async (response: Response): Promise<SmokePayload> => {
  const parsed = await response.json();

  return isRecord(parsed) ? parsed : {};
};

const readNestedRecord = (
  value: unknown,
  path: string[],
): Record<string, unknown> | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return isRecord(current) ? current : undefined;
};

const createSmokeCheck = async ({
  baseUrl,
  endpoint,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  endpoint: BackendRuntimeSmokeCheck["endpoint"];
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<{
  activation?: Record<string, unknown>;
  check: BackendRuntimeSmokeCheck;
}> => {
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    headers: { "x-campaign-os-trace-id": traceId },
  });
  const payload = await readJson(response);
  const activation = endpoint === "/api/health"
    ? readNestedRecord(payload.data, ["backendService", "activation"])
    : readNestedRecord(payload.data, ["activation"]);
  const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);

  return {
    activation,
    check: {
      activationPresent: Boolean(activation),
      deploymentHandoff,
      endpoint,
      ok: payload.ok === true && payload.traceId === traceId,
      status: response.status,
      traceId: payload.traceId ?? "",
    },
  };
};

const getBoolean = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === true;

const isExplicitFalse = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === false;

const getStringArray = (
  record: Record<string, unknown> | undefined,
  key: string,
): string[] => Array.isArray(record?.[key])
  ? record[key].filter((item): item is string => typeof item === "string")
  : [];

export const runBackendRuntimeSmoke = async ({
  env,
  fetchImpl = fetch,
  host = "127.0.0.1",
  logger = false,
  port = 0,
  shutdownTimeoutMs,
}: BackendRuntimeSmokeOptions = {}): Promise<BackendRuntimeSmokeSummary> => {
  const server = await startCampaignOsApiServer({
    env,
    host,
    logger,
    port,
    shutdownTimeoutMs,
  });

  let summaryDraft: Omit<BackendRuntimeSmokeSummary, "shutdownState"> | undefined;

  try {
    const health = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/health",
      fetchImpl,
      traceId: "campaign-os-smoke-health",
    });
    const contracts = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/contracts",
      fetchImpl,
      traceId: "campaign-os-smoke-contracts",
    });
    const activation = contracts.activation ?? health.activation;
    const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);

    if (
      health.check.status !== 200
      || contracts.check.status !== 200
      || !health.check.ok
      || !contracts.check.ok
      || !health.check.activationPresent
      || !contracts.check.activationPresent
      || !isExplicitFalse(activation, "productionReady")
      || !isExplicitFalse(activation, "liveSideEffectsEnabled")
    ) {
      throw new Error("Campaign OS backend runtime smoke check failed.");
    }

    summaryDraft = {
      activationId: typeof activation?.id === "string" ? activation.id : undefined,
      checks: {
        contracts: contracts.check,
        health: health.check,
      },
      host,
      liveSideEffectsEnabled: getBoolean(activation, "liveSideEffectsEnabled"),
      port: new URL(server.url).port ? Number(new URL(server.url).port) : 0,
      productionReady: getBoolean(activation, "productionReady"),
      requiredBeforeProduction: getStringArray(deploymentHandoff, "requiredBeforeProduction"),
      status: "passed",
      traceIds: {
        contracts: contracts.check.traceId,
        health: health.check.traceId,
      },
      url: server.url,
    };
  } finally {
    await server.stop();
  }

  if (!summaryDraft) {
    throw new Error("Campaign OS backend runtime smoke check did not produce a summary.");
  }

  return {
    ...summaryDraft,
    shutdownState: server.getReadiness().shutdownState.state,
  };
};

if (process.argv.includes("--run")) {
  runBackendRuntimeSmoke()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error: unknown) => {
      console.error("[campaign-os-api-runtime] smoke failed", error);
      process.exitCode = 1;
    });
}
