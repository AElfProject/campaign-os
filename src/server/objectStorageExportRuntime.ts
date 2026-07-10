export type ObjectStorageExportReadinessStatus = "blocked" | "deferred" | "local_ready";
export type ObjectStorageExportProviderStatus =
  | "approval_required"
  | "configured_disabled"
  | "not_configured"
  | "ready_for_provider_binding";
export type ObjectStorageExportRetentionClass =
  | "compliance_hold"
  | "review_only"
  | "short_lived";

export type ObjectStorageExportRuntimeDiagnosticCode =
  | "OBJECT_STORAGE_APPROVAL_REQUIRED"
  | "OBJECT_STORAGE_BUCKET_MISSING"
  | "OBJECT_STORAGE_CREDENTIAL_REF_MISSING"
  | "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED"
  | "OBJECT_STORAGE_PROVIDER_MISSING"
  | "OBJECT_STORAGE_RETENTION_POLICY_MISSING"
  | "OBJECT_STORAGE_SIGNED_URL_POLICY_MISSING";

export interface ObjectStorageExportRuntimeDiagnostic {
  code: ObjectStorageExportRuntimeDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: "error" | "info" | "warning";
}

export interface ObjectStorageExportRuntimeConfig {
  bucketRef?: string;
  credentialRef?: string;
  enabled?: boolean;
  providerRef?: string;
  retentionPolicyRef?: string;
  signedUrlPolicyRef?: string;
}

export interface ObjectStorageExportManifestArtifact {
  batchId?: string;
  format?: string;
}

export interface ObjectStorageExportManifestInput {
  artifacts?: readonly ObjectStorageExportManifestArtifact[];
  retentionClass?: ObjectStorageExportRetentionClass;
  traceId?: string;
}

export interface CreateObjectStorageExportReadinessOptions {
  approvalGranted?: boolean;
  config?: ObjectStorageExportRuntimeConfig;
  diagnostics?: readonly ObjectStorageExportRuntimeDiagnostic[];
  manifest?: ObjectStorageExportManifestInput;
}

export interface ObjectStorageExportManifestSummary {
  artifactCount: number;
  auditTraceId: string;
  classification: "local_manifest_only";
  containsDownloadUrl: false;
  containsObjectKey: false;
  containsSignedUrl: false;
  exportBatchId: string;
  formats: readonly string[];
  retentionClass: ObjectStorageExportRetentionClass;
}

export interface ObjectStorageExportRuntimeSafety {
  contractWriteExecuted: false;
  downloadEnabled: false;
  liveUploadEnabled: false;
  localReviewOnly: true;
  manifestOnly: true;
  objectKeyCreated: false;
  providerCallAttempted: false;
  queueExecutionEnabled: false;
  rewardCustodyExecuted: false;
  rewardDistributionExecuted: false;
  schedulerExecutionEnabled: false;
  signedUrlCreated: false;
  unsafeValueRedacted: true;
  walletSignatureExecuted: false;
}

export interface ObjectStorageExportReadiness {
  blockerCount: number;
  diagnosticCodes: readonly ObjectStorageExportRuntimeDiagnosticCode[];
  diagnostics: readonly ObjectStorageExportRuntimeDiagnostic[];
  id: "campaign-os-object-storage-export-runtime";
  manifestSummary: ObjectStorageExportManifestSummary;
  nextAction: string;
  productionReady: false;
  providerStatus: ObjectStorageExportProviderStatus;
  requiredConfigKeys: readonly string[];
  safety: ObjectStorageExportRuntimeSafety;
  status: ObjectStorageExportReadinessStatus;
  supportMode: "local_review";
  valid: boolean;
}

type ConfigField =
  | "bucketRef"
  | "credentialRef"
  | "providerRef"
  | "retentionPolicyRef"
  | "signedUrlPolicyRef";

const readinessId = "campaign-os-object-storage-export-runtime" as const;
const defaultTraceId = "object-storage-export-local-review";
const defaultExportBatchId = "local-export-review";

export const objectStorageExportRequiredConfigKeys = [
  "CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_BUCKET_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_CREDENTIAL_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_SIGNED_URL_POLICY_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_RETENTION_POLICY_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF",
] as const;

export const objectStorageExportRuntimeNoLiveSafety: ObjectStorageExportRuntimeSafety = {
  contractWriteExecuted: false,
  downloadEnabled: false,
  liveUploadEnabled: false,
  localReviewOnly: true,
  manifestOnly: true,
  objectKeyCreated: false,
  providerCallAttempted: false,
  queueExecutionEnabled: false,
  rewardCustodyExecuted: false,
  rewardDistributionExecuted: false,
  schedulerExecutionEnabled: false,
  signedUrlCreated: false,
  unsafeValueRedacted: true,
  walletSignatureExecuted: false,
};

const diagnosticDefinitions: Record<
  ObjectStorageExportRuntimeDiagnosticCode,
  { field: string; message: string; severity: ObjectStorageExportRuntimeDiagnostic["severity"] }
> = {
  OBJECT_STORAGE_APPROVAL_REQUIRED: {
    field: "approval",
    message: "Object storage export requires explicit provider approval before live binding.",
    severity: "warning",
  },
  OBJECT_STORAGE_BUCKET_MISSING: {
    field: "config.bucketRef",
    message: "Object storage export bucket reference is missing or unsafe.",
    severity: "error",
  },
  OBJECT_STORAGE_CREDENTIAL_REF_MISSING: {
    field: "config.credentialRef",
    message: "Object storage export credential reference is missing or unsafe.",
    severity: "error",
  },
  OBJECT_STORAGE_LIVE_EXECUTION_DISABLED: {
    field: "safety.liveUploadEnabled",
    message: "Live upload, object key creation, signed URL creation, and download remain disabled.",
    severity: "info",
  },
  OBJECT_STORAGE_PROVIDER_MISSING: {
    field: "config.providerRef",
    message: "Object storage export provider reference is missing or unsafe.",
    severity: "error",
  },
  OBJECT_STORAGE_RETENTION_POLICY_MISSING: {
    field: "config.retentionPolicyRef",
    message: "Object storage export retention policy reference is missing or unsafe.",
    severity: "error",
  },
  OBJECT_STORAGE_SIGNED_URL_POLICY_MISSING: {
    field: "config.signedUrlPolicyRef",
    message: "Object storage export signed URL policy reference is missing or unsafe.",
    severity: "error",
  },
};

const configFieldCodes: Record<ConfigField, ObjectStorageExportRuntimeDiagnosticCode> = {
  bucketRef: "OBJECT_STORAGE_BUCKET_MISSING",
  credentialRef: "OBJECT_STORAGE_CREDENTIAL_REF_MISSING",
  providerRef: "OBJECT_STORAGE_PROVIDER_MISSING",
  retentionPolicyRef: "OBJECT_STORAGE_RETENTION_POLICY_MISSING",
  signedUrlPolicyRef: "OBJECT_STORAGE_SIGNED_URL_POLICY_MISSING",
};

const configFields: ConfigField[] = [
  "providerRef",
  "bucketRef",
  "credentialRef",
  "signedUrlPolicyRef",
  "retentionPolicyRef",
];

const createDiagnostic = (
  code: ObjectStorageExportRuntimeDiagnosticCode,
  safeDetails?: unknown,
): ObjectStorageExportRuntimeDiagnostic => {
  const definition = diagnosticDefinitions[code];

  return {
    code,
    field: definition.field,
    message: definition.message,
    safeDetails: safeDetails === undefined
      ? undefined
      : sanitizeObjectStorageExportRuntimeValue(safeDetails),
    severity: definition.severity,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isSafeReference = (value: string) =>
  /^(config-ref|credential-ref|evidence-ref|policy-ref|provider\.|runbook-ref|secret-ref):?[a-z0-9._:-]*$/i.test(
    value,
  );

const isConfiguredReference = (value: unknown): value is string =>
  typeof value === "string"
  && value.trim().length > 0
  && isSafeReference(value.trim());

const missingConfigCodes = (
  config: ObjectStorageExportRuntimeConfig | undefined,
): ObjectStorageExportRuntimeDiagnosticCode[] =>
  configFields
    .filter((field) => !isConfiguredReference(config?.[field]))
    .map((field) => configFieldCodes[field]);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

const createManifestSummary = (
  manifest: ObjectStorageExportManifestInput | undefined,
): ObjectStorageExportManifestSummary => {
  const artifacts = manifest?.artifacts ?? [];
  const batchIds = unique(
    artifacts
      .map((artifact) => normalizeManifestText(artifact.batchId))
      .filter((batchId): batchId is string => Boolean(batchId))
      .sort(),
  );
  const formats = unique(
    artifacts
      .map((artifact) => normalizeManifestText(artifact.format)?.toLowerCase())
      .filter((format): format is string => Boolean(format))
      .sort(),
  );

  return {
    artifactCount: artifacts.length,
    auditTraceId: normalizeManifestText(manifest?.traceId) ?? defaultTraceId,
    classification: "local_manifest_only",
    containsDownloadUrl: false,
    containsObjectKey: false,
    containsSignedUrl: false,
    exportBatchId: batchIds[0] ?? defaultExportBatchId,
    formats,
    retentionClass: manifest?.retentionClass ?? "review_only",
  };
};

const normalizeManifestText = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && !isUnsafeObjectStorageExportRuntimeString(trimmed)
    ? trimmed
    : undefined;
};

const createProviderStatus = (
  config: ObjectStorageExportRuntimeConfig | undefined,
  missingCodes: readonly ObjectStorageExportRuntimeDiagnosticCode[],
  approvalGranted: boolean,
): ObjectStorageExportProviderStatus => {
  if (!isConfiguredReference(config?.providerRef)) {
    return "not_configured";
  }

  if (config?.enabled === false) {
    return "configured_disabled";
  }

  if (!approvalGranted || missingCodes.length > 0) {
    return "approval_required";
  }

  return "ready_for_provider_binding";
};

const createStatus = (
  providerStatus: ObjectStorageExportProviderStatus,
  missingCodes: readonly ObjectStorageExportRuntimeDiagnosticCode[],
): ObjectStorageExportReadinessStatus => {
  if (providerStatus === "configured_disabled") {
    return "deferred";
  }

  if (providerStatus === "ready_for_provider_binding" && missingCodes.length === 0) {
    return "local_ready";
  }

  return "blocked";
};

const nextActionByStatus: Record<ObjectStorageExportReadinessStatus, string> = {
  blocked: "Configure provider, bucket, credential reference, signed URL policy, retention policy, and approval before provider binding.",
  deferred: "Confirm object storage provider enablement remains intentionally disabled for local review.",
  local_ready: "Review provider binding readiness; live upload, signed URL creation, and download remain disabled.",
};

export const createObjectStorageExportReadiness = (
  options: CreateObjectStorageExportReadinessOptions = {},
): ObjectStorageExportReadiness => {
  const missingCodes = missingConfigCodes(options.config);
  const approvalGranted = options.approvalGranted === true;
  const diagnosticCodes = unique([
    ...missingCodes,
    ...(!approvalGranted ? ["OBJECT_STORAGE_APPROVAL_REQUIRED" as const] : []),
    "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED" as const,
  ]);
  const providerStatus = createProviderStatus(options.config, missingCodes, approvalGranted);
  const status = createStatus(providerStatus, missingCodes);
  const baseDiagnostics = diagnosticCodes.map((code) => createDiagnostic(code));
  const extraDiagnostics = (options.diagnostics ?? []).map((diagnostic) => ({
    code: diagnostic.code,
    field: sanitizeObjectStorageExportRuntimeText(diagnostic.field),
    message: sanitizeObjectStorageExportRuntimeText(diagnostic.message),
    safeDetails: diagnostic.safeDetails === undefined
      ? undefined
      : sanitizeObjectStorageExportRuntimeValue(diagnostic.safeDetails),
    severity: diagnostic.severity,
  }));

  return {
    blockerCount: diagnosticCodes.length,
    diagnosticCodes,
    diagnostics: [...baseDiagnostics, ...extraDiagnostics],
    id: readinessId,
    manifestSummary: createManifestSummary(options.manifest),
    nextAction: nextActionByStatus[status],
    productionReady: false,
    providerStatus,
    requiredConfigKeys: objectStorageExportRequiredConfigKeys,
    safety: objectStorageExportRuntimeNoLiveSafety,
    status,
    supportMode: "local_review",
    valid: true,
  };
};

export const sanitizeObjectStorageExportRuntimeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return "[REDACTED:STACK]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectStorageExportRuntimeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeObjectStorageExportRuntimeField(key, nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return sanitizeObjectStorageExportRuntimeText(value);
  }

  return value;
};

export const sanitizeObjectStorageExportRuntimeText = (value: string): string => {
  if (isSafeReference(value)) {
    return value;
  }

  if (isStackTrace(value)) {
    return "[REDACTED:STACK]";
  }

  if (isProviderPayloadDocument(value)) {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  return value
    .replace(signedUrlPattern, "[REDACTED:SIGNED_URL]")
    .replace(privatePathPattern, "[REDACTED:PRIVATE_PATH]")
    .replace(objectStorageKeyPattern, "[REDACTED:OBJECT_KEY]")
    .replace(providerPayloadPattern, "[REDACTED:PROVIDER_PAYLOAD]")
    .replace(credentialPattern, "[REDACTED:CREDENTIAL]")
    .replace(walletSignaturePattern, "[REDACTED:WALLET_SIGNATURE]");
};

const sanitizeObjectStorageExportRuntimeField = (key: string, value: unknown): unknown => {
  if (typeof value === "string" && isSafeReference(value)) {
    return value;
  }

  if (/stack/i.test(key)) {
    return "[REDACTED:STACK]";
  }

  if (/signed[-_]?url|download[-_]?url|url/i.test(key)) {
    return "[REDACTED:SIGNED_URL]";
  }

  if (/object[-_]?key|storage[-_]?key|bucket/i.test(key)) {
    return "[REDACTED:OBJECT_KEY]";
  }

  if (/private[-_]?key|raw[-_]?signature|wallet[-_]?signature/i.test(key)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (/credential|authorization|api[-_]?key|bearer|secret|token/i.test(key)) {
    return "[REDACTED:CREDENTIAL]";
  }

  if (/provider[-_]?(payload|response|request)|raw[-_]?(payload|body)/i.test(key)
    && typeof value === "string") {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  return sanitizeObjectStorageExportRuntimeValue(value);
};

const isUnsafeObjectStorageExportRuntimeString = (value: string): boolean =>
  !isSafeReference(value)
  && (isSignedUrl(value)
  || isPrivatePath(value)
  || isObjectStorageKey(value)
  || isProviderPayload(value)
  || isCredentialLike(value)
  || isWalletSignature(value)
  || isStackTrace(value));

const isSignedUrl = (value: string): boolean =>
  matches(signedUrlPattern, value);

const isPrivatePath = (value: string): boolean =>
  matches(privatePathPattern, value);

const isObjectStorageKey = (value: string): boolean =>
  matches(objectStorageKeyPattern, value);

const isProviderPayload = (value: string): boolean =>
  matches(providerPayloadPattern, value);

const isProviderPayloadDocument = (value: string): boolean =>
  /^\s*(?:raw provider payload|provider[-_ ]?(?:payload|response|request)|raw[-_ ]?(?:payload|request|response))\b/i.test(
    value,
  );

const isCredentialLike = (value: string): boolean =>
  matches(credentialPattern, value);

const isWalletSignature = (value: string): boolean =>
  matches(walletSignaturePattern, value);

const isStackTrace = (value: string): boolean =>
  /\n\s+at\s+|Error:\s.*\n|^\s*at\s+\S+/i.test(value);

const signedUrlPattern = /https?:\/\/[^"'\s<>]*(?:x-amz-signature|x-goog-signature|signature=|token=)[^"'\s<>]*|\bsigned[-_ ]?url\b/gi;
const privatePathPattern = /\/Users\/[^"'\s<>]*|\/private\/[^"'\s<>]*|\bcampaign-os-kitty\b/gi;
const objectStorageKeyPattern = /\b(?:object[-_ ]?key|storage[-_ ]?key)\b(?:\s+[^\s,.]+)?|s3:\/\/[^"'\s<>]+|gs:\/\/[^"'\s<>]+|tenant\/raw\/[^"'\s<>]+|\/raw\/[^"'\s<>]+|[A-Za-z0-9._/-]+\.(?:csv|json)(?:\?[^"'\s<>]+)?/gi;
const providerPayloadPattern = /\bprovider[-_ ]?(?:payload|response|request)\b|\braw[-_ ]?(?:payload|request|response)\b|\braw provider payload\b/gi;
const credentialPattern = /\bapi[-_]?key\b|\bbearer\s+[^\s,.]+|\bcredential=[^\s,.]+|\bplain-secret[^\s,.]*|\bsecret[^\s,.]*|\btoken=[^\s,.]+|\baccess[-_]?token\b|\brefresh[-_]?token\b/gi;
const walletSignaturePattern = /\braw[-_]?signature\b|\bwallet[-_]?signature\b|\bwallet-signature\b|\bsigned[-_]?payload\b/gi;

const matches = (pattern: RegExp, value: string): boolean => {
  pattern.lastIndex = 0;

  return pattern.test(value);
};
