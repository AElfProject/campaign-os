import type { CampaignShellDetail, LocalizedText } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

export type ContractWriterRuntimeSource = "seeded_runtime" | "server_runtime";
export type ContractWriterRuntimeStatus = "blocked" | "review_required" | "local_ready";
export type ContractWriterConfigHandoffStatus = "missing" | "partial" | "ready_disabled";
export type ContractWriterApprovalGateStatus = "approved" | "missing" | "review_required";
export type ContractWriterReadiness = "blocked" | "local_only" | "review_required";
export type ContractWriterRiskLevel = "critical" | "high" | "medium";
export type ContractWriterOwnerRole = "contract_reviewer" | "internal_operator" | "project_owner";
export type ContractWriterDiagnosticSeverity = "error" | "info" | "warning";
export type ContractWriterDiagnosticSource =
  | "approval"
  | "config"
  | "operation_catalog"
  | "redaction"
  | "runtime"
  | "safety"
  | (string & {});
export type ContractWriterDiagnosticCode =
  | "CONTRACT_WRITER_ABI_PACKAGE_MISSING"
  | "CONTRACT_WRITER_APPROVAL_GATE_MISSING"
  | "CONTRACT_WRITER_CONFIG_INCOMPLETE"
  | "CONTRACT_WRITER_CONFIG_MISSING"
  | "CONTRACT_WRITER_LIVE_EXECUTION_DISABLED"
  | "CONTRACT_WRITER_OPERATION_REVIEW_REQUIRED"
  | "CONTRACT_WRITER_SIGNER_POLICY_MISSING"
  | "CONTRACT_WRITER_UNSAFE_DIAGNOSTIC_REDACTED";
export type ContractWriterContractId =
  | "campaign_points_ledger_v2"
  | "campaign_registry_v2"
  | "eligibility_root_registry_v2"
  | "referral_registry_v2";

export interface ContractWriterRuntimeDiagnostic {
  code: ContractWriterDiagnosticCode;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: ContractWriterDiagnosticSeverity;
  source: ContractWriterDiagnosticSource;
}

export interface ContractWriterOperation {
  boundary: LocalizedText;
  evidenceSurface: LocalizedText;
  id: string;
  liveWriteEnabled: false;
  methodName: string;
  requiresIdempotency: boolean;
  requiresOperatorApproval: boolean;
  requiresSignerPolicy: boolean;
  riskLevel: ContractWriterRiskLevel;
}

export interface ContractWriterOperationGroup {
  boundary: LocalizedText;
  contractId: ContractWriterContractId;
  contractName: string;
  evidenceRefs: readonly string[];
  nextAction: LocalizedText;
  operations: readonly ContractWriterOperation[];
  ownerRole: ContractWriterOwnerRole;
  phase: "P1";
  readiness: ContractWriterReadiness;
}

export interface ContractWriterConfigHandoffInput {
  abiPackageRef?: string;
  endpointRef?: string;
  idempotencyStoreRef?: string;
  liveEnablementRef?: string;
  observabilityRef?: string;
  operatorApprovalRef?: string;
  queueHandoffRef?: string;
  runbookRef?: string;
  signerPolicyRef?: string;
}

export interface ContractWriterConfigHandoff {
  abiPackageRef?: string;
  endpointRef?: string;
  idempotencyStoreRef?: string;
  liveEnablementRef?: string;
  missingConfigKeys: readonly string[];
  observabilityRef?: string;
  operatorApprovalRef?: string;
  productionReady: false;
  queueHandoffRef?: string;
  requiredConfigKeys: readonly string[];
  runbookRef?: string;
  signerPolicyRef?: string;
  status: ContractWriterConfigHandoffStatus;
  topBlocker: LocalizedText;
}

export interface ContractWriterApprovalGate {
  id: string;
  label: LocalizedText;
  requiredBeforeProduction: true;
  status: ContractWriterApprovalGateStatus;
}

export interface ContractWriterNoLiveSideEffects {
  liveAbiGeneration: false;
  liveContractWrite: false;
  liveExportFileWrite: false;
  liveObjectStorageWrite: false;
  liveProductionDatabaseMutation: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveRootWrite: false;
  liveSchedulerExecution: false;
  liveSignerExecution: false;
  liveWalletSignature: false;
}

export interface ContractWriterRuntimeSummary {
  approvalGateCount: number;
  approvedApprovalGateCount: number;
  contractGroupCount: number;
  missingConfigCount: number;
  operationCount: number;
  requiredConfigCount: number;
  topBlocker: LocalizedText;
  topNextAction: LocalizedText;
}

export interface CreateContractWriterRuntimeReadinessOptions {
  campaign: CampaignShellDetail;
  configHandoff?: ContractWriterConfigHandoffInput;
  diagnostics?: readonly ContractWriterRuntimeDiagnostic[];
  source?: ContractWriterRuntimeSource;
  traceId?: string;
}

export interface ContractWriterRuntimeReadiness {
  approvalGates: readonly ContractWriterApprovalGate[];
  boundary: LocalizedText;
  campaignId: string;
  configHandoff: ContractWriterConfigHandoff;
  diagnosticCodes: readonly ContractWriterDiagnosticCode[];
  diagnostics: readonly ContractWriterRuntimeDiagnostic[];
  noLiveSideEffects: ContractWriterNoLiveSideEffects;
  operationCatalog: readonly ContractWriterOperationGroup[];
  productionReady: false;
  source: ContractWriterRuntimeSource;
  status: ContractWriterRuntimeStatus;
  summary: ContractWriterRuntimeSummary;
  traceId?: string;
  valid: boolean;
}

export const contractWriterRuntimeBoundary = text(
  "Local contract writer runtime readiness only. No live signer, wallet signature, ABI generation, contract write, root write, queue publishing, scheduler execution, production database mutation, storage write, export file write, reward custody, or reward distribution is executed.",
  "仅本地 contract writer runtime readiness。不会执行真实 signer、钱包签名、ABI 生成、合约写入、root 写入、队列发布、调度执行、生产数据库变更、存储写入、导出文件写入、奖励托管或发奖。",
);

export const contractWriterNoLiveSideEffects: ContractWriterNoLiveSideEffects = {
  liveAbiGeneration: false,
  liveContractWrite: false,
  liveExportFileWrite: false,
  liveObjectStorageWrite: false,
  liveProductionDatabaseMutation: false,
  liveQueuePublishing: false,
  liveRewardCustody: false,
  liveRewardDistribution: false,
  liveRootWrite: false,
  liveSchedulerExecution: false,
  liveSignerExecution: false,
  liveWalletSignature: false,
};

export const contractWriterRequiredConfigKeys = [
  "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_SIGNER_POLICY_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_OPERATOR_APPROVAL_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_ABI_PACKAGE_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_IDEMPOTENCY_STORE_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_QUEUE_HANDOFF_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_OBSERVABILITY_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_RUNBOOK_REF",
  "CAMPAIGN_OS_CONTRACT_WRITER_LIVE_ENABLEMENT_REF",
] as const;

const operationBoundary = text(
  "Planned writer operation only. No signer, wallet signature, ABI generation, contract transaction, root write, reward custody, or reward distribution is executed.",
  "仅规划 writer operation。不会执行 signer、钱包签名、ABI 生成、合约交易、root 写入、奖励托管或发奖。",
);

const evidence = (name: string): LocalizedText => text(name, name, name);

const operation = (
  id: string,
  methodName: string,
  evidenceSurface: LocalizedText,
  riskLevel: ContractWriterRiskLevel,
): ContractWriterOperation => ({
  boundary: operationBoundary,
  evidenceSurface,
  id,
  liveWriteEnabled: false,
  methodName,
  requiresIdempotency: true,
  requiresOperatorApproval: true,
  requiresSignerPolicy: true,
  riskLevel,
});

const operationGroups: readonly ContractWriterOperationGroup[] = [
  {
    boundary: operationBoundary,
    contractId: "campaign_points_ledger_v2",
    contractName: "CampaignPointsLedgerV2",
    evidenceRefs: ["points-batch-root", "points-ranking-ledger-runtime"],
    nextAction: text(
      "Review batch cadence, root format, reason hash, idempotency, and rollback semantics before any writer implementation.",
      "任何 writer 实现前，先审核批次周期、root 格式、reason hash、幂等性与回滚语义。",
    ),
    operations: [
      operation("points-ledger-commit-points-batch", "CommitPointsBatch", evidence("Contract Interface Matrix: CampaignPointsLedgerV2.CommitPointsBatch"), "critical"),
      operation("points-ledger-revoke-points-batch", "RevokePointsBatch", evidence("Contract Interface Matrix: CampaignPointsLedgerV2.RevokePointsBatch"), "high"),
      operation("points-ledger-get-points-batch", "GetPointsBatch", evidence("Contract Interface Matrix: CampaignPointsLedgerV2.GetPointsBatch"), "medium"),
    ],
    ownerRole: "internal_operator",
    phase: "P1",
    readiness: "review_required",
  },
  {
    boundary: operationBoundary,
    contractId: "campaign_registry_v2",
    contractName: "CampaignRegistryV2",
    evidenceRefs: ["campaign-metadata-hash", "task-config-hash", "contract-status-mapping"],
    nextAction: text(
      "Review authorization, metadata hash, task config hash, locale, wallet policy, and status transitions before live writer enablement.",
      "启用真实 writer 前，先审核授权、metadata hash、task config hash、语言、钱包策略与状态流转。",
    ),
    operations: [
      operation("campaign-registry-create-campaign", "CreateCampaign", evidence("Contract Interface Matrix: CampaignRegistryV2.CreateCampaign"), "critical"),
      operation("campaign-registry-update-metadata", "UpdateCampaignMetadata", evidence("Contract Interface Matrix: CampaignRegistryV2.UpdateCampaignMetadata"), "high"),
      operation("campaign-registry-update-task-config-hash", "UpdateTaskConfigHash", evidence("Contract Interface Matrix: CampaignRegistryV2.UpdateTaskConfigHash"), "high"),
      operation("campaign-registry-set-status", "SetCampaignStatus", evidence("Contract Status Mapping Readiness"), "critical"),
      operation("campaign-registry-set-wallet-policy", "SetWalletPolicy", evidence("Contract Interface Matrix: CampaignRegistryV2.SetWalletPolicy"), "high"),
      operation("campaign-registry-set-supported-locales", "SetSupportedLocales", evidence("Contract Interface Matrix: CampaignRegistryV2.SetSupportedLocales"), "medium"),
      operation("campaign-registry-transfer-owner", "TransferCampaignOwner", evidence("Contract Interface Matrix: CampaignRegistryV2.TransferCampaignOwner"), "critical"),
      operation("campaign-registry-pause-campaign", "PauseCampaign", evidence("Contract Interface Matrix: CampaignRegistryV2.PauseCampaign"), "critical"),
      operation("campaign-registry-get-campaign", "GetCampaign", evidence("Contract Interface Matrix: CampaignRegistryV2.GetCampaign"), "medium"),
    ],
    ownerRole: "contract_reviewer",
    phase: "P1",
    readiness: "review_required",
  },
  {
    boundary: operationBoundary,
    contractId: "eligibility_root_registry_v2",
    contractName: "EligibilityRootRegistryV2",
    evidenceRefs: ["eligibility-root-preview", "export-confirmation-readiness"],
    nextAction: text(
      "Review root format, proof semantics, privacy boundaries, and winner eligibility evidence before root publication.",
      "发布 root 前，先审核 root 格式、proof 语义、隐私边界与 winner eligibility 证据。",
    ),
    operations: [
      operation("eligibility-root-set-root", "SetEligibilityRoot", evidence("Contract Interface Matrix: EligibilityRootRegistryV2.SetEligibilityRoot"), "critical"),
      operation("eligibility-root-update-root", "UpdateEligibilityRoot", evidence("Contract Interface Matrix: EligibilityRootRegistryV2.UpdateEligibilityRoot"), "critical"),
      operation("eligibility-root-get-root", "GetEligibilityRoot", evidence("Contract Interface Matrix: EligibilityRootRegistryV2.GetEligibilityRoot"), "medium"),
      operation("eligibility-root-verify-proof", "VerifyEligibilityProof", evidence("Contract Interface Matrix: EligibilityRootRegistryV2.VerifyEligibilityProof"), "medium"),
    ],
    ownerRole: "contract_reviewer",
    phase: "P1",
    readiness: "review_required",
  },
  {
    boundary: operationBoundary,
    contractId: "referral_registry_v2",
    contractName: "ReferralRegistryV2",
    evidenceRefs: ["referral-binding-root", "referral-runtime-review-surface"],
    nextAction: text(
      "Review duplicate, self-referral, circular-referral, qualification, and removal policies before writer implementation.",
      "writer 实现前，先审核重复邀请、自邀请、循环邀请、资格标记与移除策略。",
    ),
    operations: [
      operation("referral-registry-bind-referral", "BindReferral", evidence("Contract Interface Matrix: ReferralRegistryV2.BindReferral"), "critical"),
      operation("referral-registry-mark-qualified", "MarkReferralQualified", evidence("Contract Interface Matrix: ReferralRegistryV2.MarkReferralQualified"), "high"),
      operation("referral-registry-remove-referral", "RemoveReferral", evidence("Contract Interface Matrix: ReferralRegistryV2.RemoveReferral"), "high"),
      operation("referral-registry-get-referral", "GetReferral", evidence("Contract Interface Matrix: ReferralRegistryV2.GetReferral"), "medium"),
    ],
    ownerRole: "contract_reviewer",
    phase: "P1",
    readiness: "review_required",
  },
];

export const createContractWriterRuntimeReadiness = ({
  campaign,
  configHandoff,
  diagnostics = [],
  source = "seeded_runtime",
  traceId,
}: CreateContractWriterRuntimeReadinessOptions): ContractWriterRuntimeReadiness => {
  const handoff = createConfigHandoff(configHandoff);
  const approvalGates = createApprovalGates(handoff);
  const diagnosticCodes = createDiagnosticCodes(handoff);
  const status = handoff.status === "ready_disabled" ? "review_required" : "blocked";
  const baseDiagnostics = diagnosticCodes.map(createDiagnostic);

  return {
    approvalGates,
    boundary: contractWriterRuntimeBoundary,
    campaignId: campaign.id,
    configHandoff: handoff,
    diagnosticCodes,
    diagnostics: [
      ...baseDiagnostics,
      ...diagnostics.map(sanitizeDiagnostic),
    ],
    noLiveSideEffects: contractWriterNoLiveSideEffects,
    operationCatalog: operationGroups,
    productionReady: false,
    source,
    status,
    summary: createSummary(operationGroups, handoff, approvalGates),
    ...(traceId ? { traceId: sanitizeContractWriterRuntimeText(traceId) } : {}),
    valid: true,
  };
};

const createConfigHandoff = (
  input: ContractWriterConfigHandoffInput | undefined,
): ContractWriterConfigHandoff => {
  const safeInput = sanitizeConfigInput(input);
  const missingKeys = missingConfigKeys(safeInput);
  const hasAnyConfig = Object.values(safeInput).some((value) => typeof value === "string" && value.length > 0);
  const status: ContractWriterConfigHandoffStatus = !hasAnyConfig
    ? "missing"
    : missingKeys.length > 0
      ? "partial"
      : "ready_disabled";

  return {
    ...safeInput,
    missingConfigKeys: missingKeys,
    productionReady: false,
    requiredConfigKeys: contractWriterRequiredConfigKeys,
    status,
    topBlocker: topConfigBlocker(status),
  };
};

const sanitizeConfigInput = (
  input: ContractWriterConfigHandoffInput | undefined,
): Partial<ContractWriterConfigHandoffInput> => ({
  abiPackageRef: normalizeSafeReference(input?.abiPackageRef),
  endpointRef: normalizeSafeReference(input?.endpointRef),
  idempotencyStoreRef: normalizeSafeReference(input?.idempotencyStoreRef),
  liveEnablementRef: normalizeSafeReference(input?.liveEnablementRef),
  observabilityRef: normalizeSafeReference(input?.observabilityRef),
  operatorApprovalRef: normalizeSafeReference(input?.operatorApprovalRef),
  queueHandoffRef: normalizeSafeReference(input?.queueHandoffRef),
  runbookRef: normalizeSafeReference(input?.runbookRef),
  signerPolicyRef: normalizeSafeReference(input?.signerPolicyRef),
});

const missingConfigKeys = (
  input: Partial<ContractWriterConfigHandoffInput>,
): string[] => [
  ["endpointRef", "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF"],
  ["signerPolicyRef", "CAMPAIGN_OS_CONTRACT_WRITER_SIGNER_POLICY_REF"],
  ["operatorApprovalRef", "CAMPAIGN_OS_CONTRACT_WRITER_OPERATOR_APPROVAL_REF"],
  ["abiPackageRef", "CAMPAIGN_OS_CONTRACT_WRITER_ABI_PACKAGE_REF"],
  ["idempotencyStoreRef", "CAMPAIGN_OS_CONTRACT_WRITER_IDEMPOTENCY_STORE_REF"],
  ["queueHandoffRef", "CAMPAIGN_OS_CONTRACT_WRITER_QUEUE_HANDOFF_REF"],
  ["observabilityRef", "CAMPAIGN_OS_CONTRACT_WRITER_OBSERVABILITY_REF"],
  ["runbookRef", "CAMPAIGN_OS_CONTRACT_WRITER_RUNBOOK_REF"],
  ["liveEnablementRef", "CAMPAIGN_OS_CONTRACT_WRITER_LIVE_ENABLEMENT_REF"],
]
  .filter(([field]) => !input[field as keyof ContractWriterConfigHandoffInput])
  .map(([, key]) => key);

const topConfigBlocker = (status: ContractWriterConfigHandoffStatus): LocalizedText => {
  if (status === "missing") {
    return text(
      "Contract writer handoff is missing; keep all companion contract writes local-review only.",
      "Contract writer handoff 缺失；所有 companion contract 写入保持仅本地审核。",
    );
  }

  if (status === "partial") {
    return text(
      "Contract writer handoff is incomplete; review endpoint, signer policy, approvals, ABI package, idempotency, queue, observability, runbook, and live enablement refs.",
      "Contract writer handoff 不完整；请审核 endpoint、signer policy、approval、ABI package、idempotency、queue、observability、runbook 与 live enablement 引用。",
    );
  }

  return text(
    "Contract writer handoff refs are present for review; live signing and contract writes remain disabled.",
    "Contract writer handoff 引用已可审核；真实签名与合约写入仍保持禁用。",
  );
};

const createApprovalGates = (
  handoff: ContractWriterConfigHandoff,
): ContractWriterApprovalGate[] => [
  ["signer-policy", "Signer policy", handoff.signerPolicyRef],
  ["operator-approval", "Operator approval", handoff.operatorApprovalRef],
  ["abi-package", "ABI/package reference", handoff.abiPackageRef],
  ["idempotency-store", "Idempotency store", handoff.idempotencyStoreRef],
  ["queue-handoff", "Queue handoff", handoff.queueHandoffRef],
  ["observability", "Observability exporter", handoff.observabilityRef],
  ["runbook", "Contract ops runbook", handoff.runbookRef],
  ["live-enablement", "Live enablement gate", handoff.liveEnablementRef],
].map(([id, label, ref]) => ({
  id,
  label: text(label, label),
  requiredBeforeProduction: true,
  status: ref ? "review_required" : "missing",
}));

const createDiagnosticCodes = (
  handoff: ContractWriterConfigHandoff,
): ContractWriterDiagnosticCode[] => unique([
  ...(handoff.status === "missing" ? ["CONTRACT_WRITER_CONFIG_MISSING" as const] : []),
  ...(handoff.status === "partial" ? ["CONTRACT_WRITER_CONFIG_INCOMPLETE" as const] : []),
  ...(!handoff.signerPolicyRef ? ["CONTRACT_WRITER_SIGNER_POLICY_MISSING" as const] : []),
  ...(!handoff.operatorApprovalRef ? ["CONTRACT_WRITER_APPROVAL_GATE_MISSING" as const] : []),
  ...(!handoff.abiPackageRef ? ["CONTRACT_WRITER_ABI_PACKAGE_MISSING" as const] : []),
  "CONTRACT_WRITER_OPERATION_REVIEW_REQUIRED" as const,
  "CONTRACT_WRITER_LIVE_EXECUTION_DISABLED" as const,
]);

const createDiagnostic = (
  code: ContractWriterDiagnosticCode,
): ContractWriterRuntimeDiagnostic => {
  const definitions: Record<ContractWriterDiagnosticCode, Omit<ContractWriterRuntimeDiagnostic, "code">> = {
    CONTRACT_WRITER_ABI_PACKAGE_MISSING: {
      field: "configHandoff.abiPackageRef",
      message: "Contract writer ABI/package reference is missing.",
      severity: "error",
      source: "config",
    },
    CONTRACT_WRITER_APPROVAL_GATE_MISSING: {
      field: "configHandoff.operatorApprovalRef",
      message: "Contract writer operator approval gate is missing.",
      severity: "error",
      source: "approval",
    },
    CONTRACT_WRITER_CONFIG_INCOMPLETE: {
      field: "configHandoff",
      message: "Contract writer production handoff is incomplete.",
      severity: "error",
      source: "config",
    },
    CONTRACT_WRITER_CONFIG_MISSING: {
      field: "configHandoff",
      message: "Contract writer production handoff is missing.",
      severity: "error",
      source: "config",
    },
    CONTRACT_WRITER_LIVE_EXECUTION_DISABLED: {
      field: "noLiveSideEffects",
      message: "Live signer execution, wallet signatures, ABI generation, contract writes, queue publishing, and reward actions are disabled.",
      severity: "info",
      source: "safety",
    },
    CONTRACT_WRITER_OPERATION_REVIEW_REQUIRED: {
      field: "operationCatalog",
      message: "Companion contract writer operations are local review records until signer, approval, ABI, idempotency, queue, observability, runbook, and live enablement gates are approved.",
      severity: "warning",
      source: "operation_catalog",
    },
    CONTRACT_WRITER_SIGNER_POLICY_MISSING: {
      field: "configHandoff.signerPolicyRef",
      message: "Contract writer signer policy reference is missing.",
      severity: "error",
      source: "config",
    },
    CONTRACT_WRITER_UNSAFE_DIAGNOSTIC_REDACTED: {
      field: "diagnostics",
      message: "Unsafe contract writer diagnostic values were redacted before serialization.",
      severity: "warning",
      source: "redaction",
    },
  };

  return { code, ...definitions[code] };
};

const sanitizeDiagnostic = (
  diagnostic: ContractWriterRuntimeDiagnostic,
): ContractWriterRuntimeDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeContractWriterRuntimeText(diagnostic.field),
  message: sanitizeContractWriterRuntimeText(diagnostic.message),
  safeDetails: diagnostic.safeDetails === undefined
    ? undefined
    : sanitizeContractWriterRuntimeValue(diagnostic.safeDetails),
  severity: diagnostic.severity,
  source: sanitizeContractWriterRuntimeText(diagnostic.source),
});

const createSummary = (
  groups: readonly ContractWriterOperationGroup[],
  handoff: ContractWriterConfigHandoff,
  approvalGates: readonly ContractWriterApprovalGate[],
): ContractWriterRuntimeSummary => ({
  approvalGateCount: approvalGates.length,
  approvedApprovalGateCount: approvalGates.filter((gate) => gate.status === "approved").length,
  contractGroupCount: groups.length,
  missingConfigCount: handoff.missingConfigKeys.length,
  operationCount: groups.reduce((total, group) => total + group.operations.length, 0),
  requiredConfigCount: handoff.requiredConfigKeys.length,
  topBlocker: handoff.topBlocker,
  topNextAction: text(
    "Review operation catalog, signer policy, approval gates, idempotency, queue handoff, observability, runbook, and live enablement before any production contract writer.",
    "启用任何生产 contract writer 前，请审核 operation catalog、signer policy、approval gates、idempotency、queue handoff、observability、runbook 与 live enablement。",
  ),
});

export const sanitizeContractWriterRuntimeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return "[REDACTED:STACK]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeContractWriterRuntimeValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeContractWriterRuntimeField(key, nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return sanitizeContractWriterRuntimeText(value);
  }

  return value;
};

export const sanitizeContractWriterRuntimeText = (value: string): string => {
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
    .replace(endpointPattern, "[REDACTED:ENDPOINT]")
    .replace(privatePathPattern, "[REDACTED:PRIVATE_PATH]")
    .replace(objectStorageKeyPattern, "[REDACTED:OBJECT_KEY]")
    .replace(providerPayloadPattern, "[REDACTED:PROVIDER_PAYLOAD]")
    .replace(privateKeyPattern, "[REDACTED:PRIVATE_KEY]")
    .replace(credentialPattern, "[REDACTED:CREDENTIAL]")
    .replace(walletSignaturePattern, "[REDACTED:WALLET_SIGNATURE]");
};

const sanitizeContractWriterRuntimeField = (key: string, value: unknown): unknown => {
  if (typeof value === "string" && isSafeReference(value)) {
    return value;
  }

  if (/stack/i.test(key)) {
    return "[REDACTED:STACK]";
  }

  if (/private[-_]?key|signer[-_]?(secret|key)|mnemonic|seed[-_]?phrase/i.test(key)) {
    return "[REDACTED:PRIVATE_KEY]";
  }

  if (/raw[-_]?signature|wallet[-_]?signature|signature|signed[-_]?payload/i.test(key)) {
    return "[REDACTED:WALLET_SIGNATURE]";
  }

  if (/signed[-_]?url|download[-_]?url|endpoint|dsn|host|url/i.test(key)) {
    return "[REDACTED:ENDPOINT]";
  }

  if (/object[-_]?key|storage[-_]?key|bucket/i.test(key)) {
    return "[REDACTED:OBJECT_KEY]";
  }

  if (/credential|authorization|api[-_]?key|bearer|secret|token/i.test(key)) {
    return "[REDACTED:CREDENTIAL]";
  }

  if (/provider[-_]?(payload|response|request)|raw[-_]?(payload|body|request|response)/i.test(key)
    && typeof value === "string") {
    return "[REDACTED:PROVIDER_PAYLOAD]";
  }

  return sanitizeContractWriterRuntimeValue(value);
};

const normalizeSafeReference = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 && isSafeReference(trimmed) ? trimmed : undefined;
};

const isSafeReference = (value: string) =>
  /^(abi-ref|approval-ref|config-ref|enablement-ref|evidence-ref|idempotency-ref|observability-ref|policy-ref|queue-ref|runbook-ref|signer-policy-ref|writer-endpoint-ref):[a-z0-9._:-]+$/i.test(
    value,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isProviderPayloadDocument = (value: string) =>
  /^\s*(?:raw provider payload|provider[-_ ]?(?:payload|response|request)|raw[-_ ]?(?:payload|request|response))\b/i.test(
    value,
  );

const isStackTrace = (value: string) =>
  /\n\s+at\s+|Error:\s.*\n|^\s*at\s+\S+/i.test(value);

const unique = <T>(values: readonly T[]): T[] => Array.from(new Set(values));

const signedUrlPattern = /https?:\/\/[^"'\s<>]*(?:x-amz-signature|x-goog-signature|signature=|signed=)[^"'\s<>]*|\bsigned[-_ ]?url\b/gi;
const endpointPattern = /https?:\/\/[^"'\s<>]+/gi;
const privatePathPattern = /\/Users\/[^"'\s<>]*|\/private\/[^"'\s<>]*|\bcampaign-os-kitty\b/gi;
const objectStorageKeyPattern = /\b(?:object[-_ ]?key|storage[-_ ]?key)\b(?:\s+[^\s,.]+)?|s3:\/\/[^"'\s<>]+|gs:\/\/[^"'\s<>]+|tenant\/raw\/[^"'\s<>]+|[A-Za-z0-9._/-]+\.(?:csv|json)(?:\?[^"'\s<>]+)?/gi;
const providerPayloadPattern = /\bprovider[-_ ]?(?:payload|response|request)\b|\braw[-_ ]?(?:payload|request|response)\b|\braw provider payload\b/gi;
const privateKeyPattern = /\bprivate[-_ ]?key\b|\bsigner[-_ ]?(?:secret|key)\b|\bmnemonic\b|\bseed[-_ ]?phrase\b/gi;
const credentialPattern = /\bapi[-_]?key\b|\bbearer\s+[^\s,.]+|\bcredential=[^\s,.]+|\bplain-secret[^\s,.]*|\bsecret[^\s,.]*|\btoken=[^\s,.]+|\baccess[-_]?token\b|\brefresh[-_]?token\b/gi;
const walletSignaturePattern = /\braw[-_]?signature\b|\bwallet[-_]?signature\b|\bwallet-signature\b|\bsigned[-_]?payload\b/gi;
