import type {
  ExportArtifact,
  ExportPreviewMode,
  LocalizedText,
} from "../domain/types";

export const exportArtifactRegistryForbiddenFields = [
  "downloadUrl",
  "fileUrl",
  "storageKey",
  "objectKey",
  "signedUrl",
  "contractRoot",
  "transactionId",
  "privateKey",
  "signedPayload",
  "walletSignature",
  "providerPayload",
  "rewardCustody",
  "rewardDistribution",
] as const;

export type ExportArtifactRegistryDiagnosticCode =
  | "EXPORT_ARTIFACT_REGISTRY_INVALID_ARTIFACT"
  | "EXPORT_ARTIFACT_REGISTRY_REQUIRED_FIELD_MISSING"
  | "EXPORT_ARTIFACT_REGISTRY_UNSAFE_FIELD";

export interface ExportArtifactRegistryDiagnostic {
  code: ExportArtifactRegistryDiagnosticCode;
  field: string;
  message: string;
  severity: "error";
}

export interface ExportArtifactRegistryRetention {
  expiresAt: string;
  mode: "local_review_ttl";
  productionStorageBacked: false;
  purgeRequired: true;
  ttlHours: number;
}

export type ExportArtifactRegistryAuditEventType =
  | "registered_local_artifact"
  | "storage_disabled";

export interface ExportArtifactRegistryAuditEvent {
  actor: "api_runtime";
  at: string;
  id: string;
  message: LocalizedText;
  routeId: string;
  traceId: string;
  type: ExportArtifactRegistryAuditEventType;
}

export interface ExportArtifactRegistrySafety {
  boundary: LocalizedText;
  contractRootWriteEnabled: false;
  downloadUrlEnabled: false;
  forbiddenFieldsAbsent: boolean;
  localReviewOnly: true;
  objectKeyEnabled: false;
  providerCallEnabled: false;
  queueExecutionEnabled: false;
  rewardCustodyEnabled: false;
  rewardDistributionEnabled: false;
  schedulerExecutionEnabled: false;
  signedUrlEnabled: false;
  storageWriteEnabled: false;
  walletSigningEnabled: false;
}

export interface ExportArtifactRegistryRecord {
  artifactId: string;
  auditEvents: readonly ExportArtifactRegistryAuditEvent[];
  batchId: string;
  blockedRows: number;
  boundary: LocalizedText;
  campaignId: string;
  checksum: string;
  checksumAlgorithm: string;
  createdAt: string;
  expiresAt: string;
  fileName: string;
  format: ExportPreviewMode;
  mimeType: string;
  payloadBytes: number;
  readyRows: number;
  retention: ExportArtifactRegistryRetention;
  reviewRequiredRows: number;
  routeId: string;
  safety: ExportArtifactRegistrySafety;
  totalRows: number;
  traceId: string;
}

export interface RegisterExportArtifactContext {
  createdAt?: string;
  routeId: string;
  traceId: string;
  ttlHours?: number;
}

export type RegisterExportArtifactResult =
  | {
    ok: true;
    record: ExportArtifactRegistryRecord;
  }
  | {
    diagnostics: readonly ExportArtifactRegistryDiagnostic[];
    ok: false;
    safety: ExportArtifactRegistrySafety;
  };

export interface ExportArtifactRegistry {
  register(
    artifact: unknown,
    context: RegisterExportArtifactContext,
  ): RegisterExportArtifactResult;
}

const registryBoundary: LocalizedText = {
  "en-US":
    "Local export artifact registry only. No download URL, storage write, object key, signed URL, provider call, contract root write, wallet signing, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅本地导出 artifact registry。不会生成下载链接、写入存储、生成 object key、signed URL、调用 provider、写入合约 root、执行钱包签名、队列执行、调度执行、托管奖励或发奖。",
  "zh-TW":
    "Local export artifact registry only. No download URL, storage write, object key, signed URL, provider call, contract root write, wallet signing, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
};

const registeredEventMessage: LocalizedText = {
  "en-US": "Local export artifact metadata registered for audit review.",
  "zh-CN": "本地导出 artifact 元数据已登记用于审计审核。",
  "zh-TW": "Local export artifact metadata registered for audit review.",
};

const storageDisabledEventMessage: LocalizedText = {
  "en-US": "Storage, download, contract, wallet, queue, scheduler, reward custody, and reward distribution remain disabled.",
  "zh-CN": "存储、下载、合约、钱包、队列、调度、奖励托管和发奖保持禁用。",
  "zh-TW": "Storage, download, contract, wallet, queue, scheduler, reward custody, and reward distribution remain disabled.",
};

const DEFAULT_CREATED_AT = "2026-07-09T00:00:00.000Z";
const DEFAULT_TTL_HOURS = 24;

const diagnostic = (
  code: ExportArtifactRegistryDiagnosticCode,
  field: string,
  message: string,
): ExportArtifactRegistryDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

const createSafety = (forbiddenFieldsAbsent: boolean): ExportArtifactRegistrySafety => ({
  boundary: registryBoundary,
  contractRootWriteEnabled: false,
  downloadUrlEnabled: false,
  forbiddenFieldsAbsent,
  localReviewOnly: true,
  objectKeyEnabled: false,
  providerCallEnabled: false,
  queueExecutionEnabled: false,
  rewardCustodyEnabled: false,
  rewardDistributionEnabled: false,
  schedulerExecutionEnabled: false,
  signedUrlEnabled: false,
  storageWriteEnabled: false,
  walletSigningEnabled: false,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringField = (
  value: unknown,
  field: string,
  issues: ExportArtifactRegistryDiagnostic[],
): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  issues.push(diagnostic(
    "EXPORT_ARTIFACT_REGISTRY_REQUIRED_FIELD_MISSING",
    field,
    `Export artifact registry requires ${field}.`,
  ));

  return undefined;
};

const nonNegativeInteger = (
  value: unknown,
  field: string,
  issues: ExportArtifactRegistryDiagnostic[],
): number | undefined => {
  if (Number.isInteger(value) && (value as number) >= 0) {
    return value as number;
  }

  issues.push(diagnostic(
    "EXPORT_ARTIFACT_REGISTRY_REQUIRED_FIELD_MISSING",
    field,
    `Export artifact registry requires a non-negative integer ${field}.`,
  ));

  return undefined;
};

const findForbiddenField = (value: unknown): string | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findForbiddenField(item);

      if (nested) {
        return nested;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if ((exportArtifactRegistryForbiddenFields as readonly string[]).includes(key)) {
      return key;
    }

    const nested = findForbiddenField(record[key]);

    if (nested) {
      return nested;
    }
  }

  return undefined;
};

const stableHash = (input: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const registryHashInput = ({
  batchId,
  campaignId,
  checksum,
  format,
  routeId,
  traceId,
}: {
  batchId: string;
  campaignId: string;
  checksum: string;
  format: string;
  routeId: string;
  traceId: string;
}) => [
  campaignId,
  batchId,
  format,
  checksum,
  routeId,
  traceId,
].join("|");

const createRetention = (createdAt: string, ttlHours: number): ExportArtifactRegistryRetention => {
  const createdAtMs = Date.parse(createdAt);
  const expiresAt = Number.isFinite(createdAtMs)
    ? new Date(createdAtMs + ttlHours * 60 * 60 * 1000).toISOString()
    : DEFAULT_CREATED_AT;

  return {
    expiresAt,
    mode: "local_review_ttl",
    productionStorageBacked: false,
    purgeRequired: true,
    ttlHours,
  };
};

const createAuditEvents = ({
  createdAt,
  routeId,
  traceId,
}: {
  createdAt: string;
  routeId: string;
  traceId: string;
}): ExportArtifactRegistryAuditEvent[] => [
  {
    actor: "api_runtime",
    at: createdAt,
    id: `artifact-registry-event-${stableHash(`${routeId}|${traceId}|registered`)}`,
    message: registeredEventMessage,
    routeId,
    traceId,
    type: "registered_local_artifact",
  },
  {
    actor: "api_runtime",
    at: createdAt,
    id: `artifact-registry-event-${stableHash(`${routeId}|${traceId}|storage-disabled`)}`,
    message: storageDisabledEventMessage,
    routeId,
    traceId,
    type: "storage_disabled",
  },
];

export const createExportArtifactRegistry = (): ExportArtifactRegistry => ({
  register: (
    artifact: unknown,
    context: RegisterExportArtifactContext,
  ): RegisterExportArtifactResult => {
    const forbiddenField = findForbiddenField(artifact);

    if (forbiddenField) {
      return {
        diagnostics: [
          diagnostic(
            "EXPORT_ARTIFACT_REGISTRY_UNSAFE_FIELD",
            forbiddenField,
            `Export artifact registry input contains forbidden live field ${forbiddenField}.`,
          ),
        ],
        ok: false,
        safety: createSafety(false),
      };
    }

    if (!isRecord(artifact) || !isRecord(artifact.metadata)) {
      return {
        diagnostics: [
          diagnostic(
            "EXPORT_ARTIFACT_REGISTRY_INVALID_ARTIFACT",
            "artifact",
            "Export artifact registry requires a structured local export artifact.",
          ),
        ],
        ok: false,
        safety: createSafety(false),
      };
    }

    const issues: ExportArtifactRegistryDiagnostic[] = [];
    const campaignId = stringField(artifact.campaignId, "campaignId", issues);
    const batchId = stringField(artifact.batchId, "batchId", issues);
    const format = stringField(artifact.format, "format", issues) as ExportPreviewMode | undefined;
    const fileName = stringField(artifact.fileName, "fileName", issues);
    const mimeType = stringField(artifact.mimeType, "mimeType", issues);
    const checksum = stringField(artifact.metadata.checksum, "metadata.checksum", issues);
    const checksumAlgorithm = stringField(
      artifact.metadata.checksumAlgorithm,
      "metadata.checksumAlgorithm",
      issues,
    );
    const routeId = stringField(context.routeId, "routeId", issues);
    const traceId = stringField(context.traceId, "traceId", issues);
    const payloadBytes = nonNegativeInteger(artifact.metadata.payloadBytes, "metadata.payloadBytes", issues);
    const totalRows = nonNegativeInteger(artifact.metadata.totalRows, "metadata.totalRows", issues);
    const readyRows = nonNegativeInteger(artifact.metadata.readyRows, "metadata.readyRows", issues);
    const reviewRequiredRows = nonNegativeInteger(
      artifact.metadata.reviewRequiredRows,
      "metadata.reviewRequiredRows",
      issues,
    );
    const blockedRows = nonNegativeInteger(artifact.metadata.blockedRows, "metadata.blockedRows", issues);

    if (issues.length > 0) {
      return {
        diagnostics: issues,
        ok: false,
        safety: createSafety(false),
      };
    }

    const createdAt = context.createdAt ?? DEFAULT_CREATED_AT;
    const ttlHours = Number.isFinite(context.ttlHours) && (context.ttlHours ?? 0) > 0
      ? Math.trunc(context.ttlHours ?? DEFAULT_TTL_HOURS)
      : DEFAULT_TTL_HOURS;
    const retention = createRetention(createdAt, ttlHours);
    const artifactId = `export-artifact-local-${stableHash(registryHashInput({
      batchId: batchId as string,
      campaignId: campaignId as string,
      checksum: checksum as string,
      format: format as string,
      routeId: routeId as string,
      traceId: traceId as string,
    }))}`;
    const safety = createSafety(true);

    return {
      ok: true,
      record: {
        artifactId,
        auditEvents: createAuditEvents({
          createdAt,
          routeId: routeId as string,
          traceId: traceId as string,
        }),
        batchId: batchId as string,
        blockedRows: blockedRows as number,
        boundary: registryBoundary,
        campaignId: campaignId as string,
        checksum: checksum as string,
        checksumAlgorithm: checksumAlgorithm as string,
        createdAt,
        expiresAt: retention.expiresAt,
        fileName: fileName as string,
        format: format as ExportPreviewMode,
        mimeType: mimeType as string,
        payloadBytes: payloadBytes as number,
        readyRows: readyRows as number,
        retention,
        reviewRequiredRows: reviewRequiredRows as number,
        routeId: routeId as string,
        safety,
        totalRows: totalRows as number,
        traceId: traceId as string,
      },
    };
  },
});
