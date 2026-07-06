import type { LocalizedText } from "../domain/types";
import type { ApiRuntimeErrorBody } from "./errors";

export type ApiRuntimeMode = "local_seeded";

export interface ApiRuntimeSafety {
  localOnly: true;
  seededDataOnly: true;
  noLiveApi: true;
  noMigrationRunner: true;
  noProductionDatabase: true;
  noWalletSignature: true;
  noSecretHandling: true;
  noContractWrite: true;
  noExportFile: true;
  noStorageWrite: true;
  noRewardCustody: true;
  noRewardDistribution: true;
}

export interface ApiRuntimeMetadata {
  mode: ApiRuntimeMode;
  name: "campaign-os-api-runtime";
  routeCount: number;
  version: string;
}

interface ApiRuntimeEnvelopeBase {
  ok: boolean;
  runtime: ApiRuntimeMetadata;
  safety: ApiRuntimeSafety;
  timestamp: string;
  traceId: string;
}

export interface ApiRuntimeSuccessEnvelope<TPayload> extends ApiRuntimeEnvelopeBase {
  data: TPayload;
  error?: never;
  ok: true;
}

export interface ApiRuntimeFailureEnvelope extends ApiRuntimeEnvelopeBase {
  data?: never;
  error: ApiRuntimeErrorBody;
  ok: false;
}

export type ApiRuntimeEnvelope<TPayload = unknown> =
  | ApiRuntimeSuccessEnvelope<TPayload>
  | ApiRuntimeFailureEnvelope;

export const runtimeBoundary: LocalizedText = {
  "en-US":
    "Local seeded API runtime only. No live API, production database, migration runner, provider call, wallet signature, contract write, storage-backed export file, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅本地 seeded API runtime。不会执行实时 API、生产数据库、migration runner、provider 调用、钱包签名、合约写入、storage-backed 导出文件、奖励托管或发奖。",
  "zh-TW":
    "僅本地 seeded API runtime。不會執行即時 API、生產資料庫、migration runner、provider 呼叫、錢包簽名、合約寫入、storage-backed 匯出檔案、獎勵託管或發獎。",
};

export const createRuntimeSafety = (): ApiRuntimeSafety => ({
  localOnly: true,
  noContractWrite: true,
  noExportFile: true,
  noLiveApi: true,
  noMigrationRunner: true,
  noProductionDatabase: true,
  noRewardCustody: true,
  noRewardDistribution: true,
  noSecretHandling: true,
  noStorageWrite: true,
  noWalletSignature: true,
  seededDataOnly: true,
});

export const createRuntimeMetadata = ({
  routeCount,
  version = "0.1.0-local",
}: {
  routeCount: number;
  version?: string;
}): ApiRuntimeMetadata => ({
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount,
  version,
});

const createEnvelopeBase = ({
  routeCount,
  timestamp,
  traceId,
  version,
}: {
  routeCount: number;
  timestamp: string;
  traceId: string;
  version?: string;
}): Pick<ApiRuntimeEnvelopeBase, "runtime" | "safety" | "timestamp" | "traceId"> => ({
  runtime: createRuntimeMetadata({ routeCount, version }),
  safety: createRuntimeSafety(),
  timestamp,
  traceId,
});

export const createSuccessEnvelope = <TPayload>({
  data,
  routeCount,
  timestamp = new Date().toISOString(),
  traceId,
  version,
}: {
  data: TPayload;
  routeCount: number;
  timestamp?: string;
  traceId: string;
  version?: string;
}): ApiRuntimeSuccessEnvelope<TPayload> => ({
  ...createEnvelopeBase({ routeCount, timestamp, traceId, version }),
  data,
  ok: true,
});

export const createFailureEnvelope = ({
  error,
  routeCount,
  timestamp = new Date().toISOString(),
  traceId,
  version,
}: {
  error: ApiRuntimeErrorBody;
  routeCount: number;
  timestamp?: string;
  traceId: string;
  version?: string;
}): ApiRuntimeFailureEnvelope => ({
  ...createEnvelopeBase({ routeCount, timestamp, traceId, version }),
  error,
  ok: false,
});
