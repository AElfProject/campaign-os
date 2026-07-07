import type { VerificationType } from "../domain/types";
import {
  providerIndexerAdapterGroups,
  redactProviderIndexerValue,
  type ProviderIndexerAdapterGroup,
} from "./providerIndexerAdapters";
import {
  queueRuntimePlans,
  type QueueDegradedOutcome,
  type QueuePlan,
} from "./queueRuntime";
import {
  redactWorkerSchedulerValue,
  workerJobCatalog,
} from "./workerSchedulerRuntime";

export type VerificationDegradationOutcome =
  | "pending"
  | "manual_review"
  | "disable_provider_task_templates"
  | "local_only"
  | "blocked";
export type VerificationProviderGroupAvailability = "available" | "scaffolded" | "unavailable";
export type VerificationWorkerAvailability = "available" | "scaffolded" | "unavailable";
export type VerificationSourceDiagnosticSeverity = "error" | "warning" | "info";
export type VerificationSourceDiagnosticCode =
  | "UNKNOWN_VERIFICATION_TYPE"
  | "UNKNOWN_PROVIDER_GROUP"
  | "UNKNOWN_WORKER_JOB"
  | "UNKNOWN_QUEUE_PLAN"
  | "UNSUPPORTED_EVIDENCE_SOURCE"
  | "PROVIDER_GROUP_UNAVAILABLE"
  | "WORKER_JOB_UNAVAILABLE";

export interface VerificationQueuePosture {
  dryRunEnqueueEnabled: boolean;
  jobIds: string[];
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  queueRuntimeId: "campaign-os-queue-runtime-foundation";
  queueUnavailableOutcome: VerificationDegradationOutcome;
  queuePlans: Array<{
    degradedOutcome: QueueDegradedOutcome;
    jobId: string;
    payloadReferencePolicy: string;
    queueId: string;
    sideEffectBoundary: string;
  }>;
}

export interface VerificationSourcePolicy {
  authSessionRequired: boolean;
  defaultDegradationOutcome: VerificationDegradationOutcome;
  diagnosticNotes: string[];
  evidenceSourceLabels: string[];
  jobIds: string[];
  liveExecutionEnabled: false;
  providerGroupIds: string[];
  providerReadinessSatisfiesAuthentication: boolean;
  queuePosture: VerificationQueuePosture;
  unavailableDegradationOutcome: VerificationDegradationOutcome;
  unavailableWorkerOutcome: VerificationDegradationOutcome;
  verificationType: VerificationType;
  workerRequired: boolean;
}

type VerificationSourcePolicyDefinition = Omit<VerificationSourcePolicy, "queuePosture">;

export interface VerificationSourceDiagnostic {
  code: VerificationSourceDiagnosticCode;
  field: string;
  message: string;
  severity: VerificationSourceDiagnosticSeverity;
}

export interface VerificationSourceResolution {
  degradationOutcome: VerificationDegradationOutcome;
  diagnosticCodes: VerificationSourceDiagnosticCode[];
  diagnostics: VerificationSourceDiagnostic[];
  entry?: VerificationSourcePolicy;
  valid: boolean;
}

export interface VerificationSourceHandoffSummary {
  diagnosticCodes: VerificationSourceDiagnosticCode[];
  diagnostics: VerificationSourceDiagnostic[];
  entries: VerificationSourcePolicy[];
  id: "campaign-os-verification-source-handoff";
  liveExecutionEnabled: false;
  supportedVerificationTypes: VerificationType[];
  valid: boolean;
}

export interface VerificationSourceHandoffOptions {
  diagnosticNotes?: string[];
}

export interface ResolveVerificationSourceHandoffOptions {
  evidenceSourceLabels?: string[];
  jobIds?: string[];
  providerGroupAvailability?: VerificationProviderGroupAvailability;
  providerGroupIds?: string[];
  workerAvailability?: VerificationWorkerAvailability;
}

export const allowedVerificationDegradationOutcomes: VerificationDegradationOutcome[] = [
  "pending",
  "manual_review",
  "disable_provider_task_templates",
  "local_only",
  "blocked",
];

const supportedEvidenceSourceLabels = [
  "Auth/session wallet proof",
  "AeFinder indexer evidence",
  "AelfScan explorer evidence",
  "dApp API evidence",
  "Social API evidence",
  "Manual review evidence",
] as const;

const policy = (entry: VerificationSourcePolicyDefinition): VerificationSourcePolicyDefinition => entry;

export const verificationSourcePolicies: VerificationSourcePolicyDefinition[] = [
  policy({
    authSessionRequired: true,
    defaultDegradationOutcome: "local_only",
    diagnosticNotes: [
      "WALLET verification uses auth/session wallet proof from the M183 handoff.",
      "Provider readiness metadata is never accepted as wallet authentication.",
    ],
    evidenceSourceLabels: ["Auth/session wallet proof"],
    jobIds: [],
    liveExecutionEnabled: false,
    providerGroupIds: ["wallet-auth-session"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "blocked",
    unavailableWorkerOutcome: "blocked",
    verificationType: "WALLET",
    workerRequired: false,
  }),
  policy({
    authSessionRequired: false,
    defaultDegradationOutcome: "pending",
    diagnosticNotes: [
      "ON_CHAIN verification is handed to AeFinder/AelfScan adapter groups when live adapters are later enabled.",
      "Unavailable indexer evidence remains pending or manual review; it never completes a task.",
    ],
    evidenceSourceLabels: ["AeFinder indexer evidence", "AelfScan explorer evidence"],
    jobIds: ["task-verification-worker"],
    liveExecutionEnabled: false,
    providerGroupIds: ["aefinder-aelfscan-indexers"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "pending",
    unavailableWorkerOutcome: "pending",
    verificationType: "ON_CHAIN",
    workerRequired: true,
  }),
  policy({
    authSessionRequired: false,
    defaultDegradationOutcome: "disable_provider_task_templates",
    diagnosticNotes: [
      "DAPP_API verification depends on provider-specific dApp adapters.",
      "Unavailable dApp providers disable provider-backed task templates instead of completing tasks.",
    ],
    evidenceSourceLabels: ["dApp API evidence"],
    jobIds: ["task-verification-worker"],
    liveExecutionEnabled: false,
    providerGroupIds: ["dapp-api-adapters"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "disable_provider_task_templates",
    unavailableWorkerOutcome: "disable_provider_task_templates",
    verificationType: "DAPP_API",
    workerRequired: true,
  }),
  policy({
    authSessionRequired: false,
    defaultDegradationOutcome: "manual_review",
    diagnosticNotes: [
      "SOCIAL verification depends on social API adapter groups.",
      "Unavailable social evidence falls back to manual review only.",
    ],
    evidenceSourceLabels: ["Social API evidence"],
    jobIds: ["task-verification-worker"],
    liveExecutionEnabled: false,
    providerGroupIds: ["social-api-adapters"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "manual_review",
    unavailableWorkerOutcome: "manual_review",
    verificationType: "SOCIAL",
    workerRequired: true,
  }),
  policy({
    authSessionRequired: false,
    defaultDegradationOutcome: "manual_review",
    diagnosticNotes: [
      "MANUAL verification is an operator review source.",
      "No provider live call or worker execution is required for the handoff policy.",
    ],
    evidenceSourceLabels: ["Manual review evidence"],
    jobIds: [],
    liveExecutionEnabled: false,
    providerGroupIds: ["manual-review"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "manual_review",
    unavailableWorkerOutcome: "manual_review",
    verificationType: "MANUAL",
    workerRequired: false,
  }),
];

const registeredProviderGroupIds = new Set(providerIndexerAdapterGroups.map((group) => group.id));
const registeredWorkerJobIds = new Set(workerJobCatalog.map((job) => job.id));
const queuePlanByJobId = new Map(queueRuntimePlans.map((queuePlan) => [queuePlan.jobId, queuePlan]));
const evidenceSourceLabelSet = new Set<string>(supportedEvidenceSourceLabels);

export const createVerificationSourceHandoff = (
  options: VerificationSourceHandoffOptions = {},
): VerificationSourceHandoffSummary => {
  const entries = verificationSourcePolicies.map((sourcePolicy) => sanitizePolicy(sourcePolicy, options));
  const diagnostics = entries.flatMap((entry) =>
    validateQueuePlans(entry.queuePosture.queuePlans).concat(
      validateProviderGroups(entry.providerGroupIds),
      validateEvidenceSources(entry.evidenceSourceLabels),
    ),
  );

  return {
    diagnosticCodes: diagnosticCodes(diagnostics),
    diagnostics,
    entries,
    id: "campaign-os-verification-source-handoff",
    liveExecutionEnabled: false,
    supportedVerificationTypes: entries.map((entry) => entry.verificationType),
    valid: diagnostics.length === 0,
  };
};

export const resolveVerificationSourceHandoff = (
  verificationType: string,
  options: ResolveVerificationSourceHandoffOptions = {},
): VerificationSourceResolution => {
  const sourcePolicy = verificationSourcePolicies.find((entry) => entry.verificationType === verificationType);

  if (!sourcePolicy) {
    const diagnostics = [
      diagnostic(
        "UNKNOWN_VERIFICATION_TYPE",
        "verificationType",
        `Unsupported verification type: ${redactProviderIndexerValue(verificationType)}`,
      ),
    ];

    return failClosed(diagnostics);
  }

  const entry = sanitizePolicy(sourcePolicy);
  const providerIds = options.providerGroupIds ?? entry.providerGroupIds;
  const jobIds = options.jobIds ?? entry.jobIds;
  const evidenceLabels = options.evidenceSourceLabels ?? entry.evidenceSourceLabels;
  const diagnostics = [
    ...validateWorkerJobs(jobIds),
    ...validateProviderGroups(providerIds),
    ...validateEvidenceSources(evidenceLabels),
    ...validateAvailability(entry, options.providerGroupAvailability),
    ...validateWorkerAvailability(entry, options.workerAvailability),
  ];
  const degradationOutcome =
    diagnostics.length > 0 ? resolveFailedOutcome(entry, diagnostics) : entry.defaultDegradationOutcome;

  return {
    degradationOutcome,
    diagnosticCodes: diagnosticCodes(diagnostics),
    diagnostics,
    entry: {
      ...entry,
      evidenceSourceLabels: sanitizeStrings(evidenceLabels),
      jobIds: sanitizeStrings(jobIds),
      providerGroupIds: providerIds,
      queuePosture: createQueuePosture(entry.workerRequired, jobIds, entry.unavailableWorkerOutcome),
    },
    valid: diagnostics.length === 0,
  };
};

const sanitizePolicy = (
  sourcePolicy: VerificationSourcePolicyDefinition,
  options: VerificationSourceHandoffOptions = {},
): VerificationSourcePolicy => ({
  ...sourcePolicy,
  diagnosticNotes: sanitizeStrings([
    ...sourcePolicy.diagnosticNotes,
    ...(options.diagnosticNotes ?? []),
  ]),
  evidenceSourceLabels: sanitizeStrings(sourcePolicy.evidenceSourceLabels),
  jobIds: sanitizeStrings(sourcePolicy.jobIds),
  providerGroupIds: [...sourcePolicy.providerGroupIds],
  queuePosture: createQueuePosture(
    sourcePolicy.workerRequired,
    sourcePolicy.jobIds,
    sourcePolicy.unavailableWorkerOutcome,
  ),
});

const sanitizeStrings = (values: readonly string[]): string[] =>
  values.map((value) => {
    const redacted = redactProviderIndexerValue(value);

    return typeof redacted === "string" ? redacted : "[redacted]";
  });

const validateProviderGroups = (ids: readonly string[]): VerificationSourceDiagnostic[] =>
  ids
    .filter((id) => !registeredProviderGroupIds.has(id))
    .map((id) =>
      diagnostic(
        "UNKNOWN_PROVIDER_GROUP",
        "providerGroupIds",
        `Unknown provider group id: ${redactProviderIndexerValue(id)}`,
      ),
    );

const validateWorkerJobs = (ids: readonly string[]): VerificationSourceDiagnostic[] =>
  ids
    .filter((id) => !registeredWorkerJobIds.has(id))
    .map((id) =>
      diagnostic(
        "UNKNOWN_WORKER_JOB",
        "jobIds",
        `Unknown worker job id: ${redactWorkerSchedulerValue(id)}`,
      ),
    );

const validateQueuePlans = (
  queuePlans: readonly VerificationQueuePosture["queuePlans"][number][],
): VerificationSourceDiagnostic[] =>
  queuePlans
    .filter((queuePlan) => !queuePlanByJobId.has(queuePlan.jobId))
    .map((queuePlan) =>
      diagnostic(
        "UNKNOWN_QUEUE_PLAN",
        "queuePosture.queuePlans",
        `Unknown queue plan job id: ${redactWorkerSchedulerValue(queuePlan.jobId)}`,
      ),
    );

const validateEvidenceSources = (labels: readonly string[]): VerificationSourceDiagnostic[] =>
  labels
    .filter((label) => !evidenceSourceLabelSet.has(label))
    .map((label) =>
      diagnostic(
        "UNSUPPORTED_EVIDENCE_SOURCE",
        "evidenceSourceLabels",
        `Unsupported evidence source label: ${redactProviderIndexerValue(label)}`,
      ),
    );

const validateAvailability = (
  entry: VerificationSourcePolicy,
  availability: VerificationProviderGroupAvailability | undefined,
): VerificationSourceDiagnostic[] => {
  if (availability !== "unavailable") {
    return [];
  }

  return [
    diagnostic(
      "PROVIDER_GROUP_UNAVAILABLE",
      "providerGroupAvailability",
      `${entry.verificationType} provider group is unavailable; using ${entry.unavailableDegradationOutcome}.`,
    ),
  ];
};

const validateWorkerAvailability = (
  entry: VerificationSourcePolicy,
  availability: VerificationWorkerAvailability | undefined,
): VerificationSourceDiagnostic[] => {
  if (!entry.workerRequired || availability !== "unavailable") {
    return [];
  }

  return [
    diagnostic(
      "WORKER_JOB_UNAVAILABLE",
      "workerAvailability",
      `${entry.verificationType} worker job is unavailable; using ${entry.unavailableWorkerOutcome}.`,
    ),
  ];
};

const resolveFailedOutcome = (
  entry: VerificationSourcePolicy,
  diagnostics: readonly VerificationSourceDiagnostic[],
): VerificationDegradationOutcome => {
  if (
    diagnostics.some((item) =>
      item.code === "UNKNOWN_PROVIDER_GROUP"
      || item.code === "UNKNOWN_WORKER_JOB"
      || item.code === "UNSUPPORTED_EVIDENCE_SOURCE"
    )
  ) {
    return "blocked";
  }

  if (diagnostics.some((item) => item.code === "WORKER_JOB_UNAVAILABLE")) {
    return entry.unavailableWorkerOutcome;
  }

  return entry.unavailableDegradationOutcome;
};

const failClosed = (diagnostics: VerificationSourceDiagnostic[]): VerificationSourceResolution => ({
  degradationOutcome: "blocked",
  diagnosticCodes: diagnosticCodes(diagnostics),
  diagnostics,
  entry: undefined,
  valid: false,
});

const diagnostic = (
  code: VerificationSourceDiagnosticCode,
  field: string,
  message: string,
  severity: VerificationSourceDiagnosticSeverity = "error",
): VerificationSourceDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const diagnosticCodes = (diagnostics: readonly VerificationSourceDiagnostic[]) =>
  Array.from(new Set(diagnostics.map((item) => item.code)));

const createQueuePosture = (
  workerRequired: boolean,
  jobIds: readonly string[],
  queueUnavailableOutcome: VerificationDegradationOutcome,
): VerificationQueuePosture => {
  const queuePlans = workerRequired
    ? jobIds.flatMap((jobId) => {
      const queuePlan = queuePlanByJobId.get(jobId);

      return queuePlan ? [queuePlan] : [];
    })
    : [];

  return {
    dryRunEnqueueEnabled: workerRequired && queuePlans.length > 0,
    jobIds: sanitizeStrings(jobIds),
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    queueRuntimeId: "campaign-os-queue-runtime-foundation",
    queueUnavailableOutcome,
    queuePlans: queuePlans.map(toVerificationQueuePlan),
  };
};

const toVerificationQueuePlan = (
  queuePlan: QueuePlan,
): VerificationQueuePosture["queuePlans"][number] => ({
  degradedOutcome: queuePlan.degradedOutcome,
  jobId: queuePlan.jobId,
  payloadReferencePolicy: queuePlan.payloadReferencePolicy,
  queueId: queuePlan.queueId,
  sideEffectBoundary: queuePlan.sideEffectBoundary,
});

export const verificationSourceProviderGroups: ProviderIndexerAdapterGroup[] =
  providerIndexerAdapterGroups.filter((group) =>
    verificationSourcePolicies.some((policyEntry) => policyEntry.providerGroupIds.includes(group.id)),
  );
