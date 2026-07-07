import type { VerificationType } from "../domain/types";
import {
  providerIndexerAdapterGroups,
  redactProviderIndexerValue,
  type ProviderIndexerAdapterGroup,
} from "./providerIndexerAdapters";

export type VerificationDegradationOutcome =
  | "pending"
  | "manual_review"
  | "disable_provider_task_templates"
  | "local_only"
  | "blocked";
export type VerificationProviderGroupAvailability = "available" | "scaffolded" | "unavailable";
export type VerificationSourceDiagnosticSeverity = "error" | "warning" | "info";
export type VerificationSourceDiagnosticCode =
  | "UNKNOWN_VERIFICATION_TYPE"
  | "UNKNOWN_PROVIDER_GROUP"
  | "UNSUPPORTED_EVIDENCE_SOURCE"
  | "PROVIDER_GROUP_UNAVAILABLE";

export interface VerificationSourcePolicy {
  authSessionRequired: boolean;
  defaultDegradationOutcome: VerificationDegradationOutcome;
  diagnosticNotes: string[];
  evidenceSourceLabels: string[];
  liveExecutionEnabled: false;
  providerGroupIds: string[];
  providerReadinessSatisfiesAuthentication: boolean;
  unavailableDegradationOutcome: VerificationDegradationOutcome;
  verificationType: VerificationType;
  workerRequired: boolean;
}

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
  providerGroupAvailability?: VerificationProviderGroupAvailability;
  providerGroupIds?: string[];
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

const policy = (entry: VerificationSourcePolicy): VerificationSourcePolicy => entry;

export const verificationSourcePolicies: VerificationSourcePolicy[] = [
  policy({
    authSessionRequired: true,
    defaultDegradationOutcome: "local_only",
    diagnosticNotes: [
      "WALLET verification uses auth/session wallet proof from the M183 handoff.",
      "Provider readiness metadata is never accepted as wallet authentication.",
    ],
    evidenceSourceLabels: ["Auth/session wallet proof"],
    liveExecutionEnabled: false,
    providerGroupIds: ["wallet-auth-session"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "blocked",
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
    liveExecutionEnabled: false,
    providerGroupIds: ["aefinder-aelfscan-indexers"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "pending",
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
    liveExecutionEnabled: false,
    providerGroupIds: ["dapp-api-adapters"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "disable_provider_task_templates",
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
    liveExecutionEnabled: false,
    providerGroupIds: ["social-api-adapters"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "manual_review",
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
    liveExecutionEnabled: false,
    providerGroupIds: ["manual-review"],
    providerReadinessSatisfiesAuthentication: false,
    unavailableDegradationOutcome: "manual_review",
    verificationType: "MANUAL",
    workerRequired: false,
  }),
];

const registeredProviderGroupIds = new Set(providerIndexerAdapterGroups.map((group) => group.id));
const evidenceSourceLabelSet = new Set<string>(supportedEvidenceSourceLabels);

export const createVerificationSourceHandoff = (
  options: VerificationSourceHandoffOptions = {},
): VerificationSourceHandoffSummary => {
  const entries = verificationSourcePolicies.map((sourcePolicy) => sanitizePolicy(sourcePolicy, options));
  const diagnostics = entries.flatMap((entry) =>
    validateProviderGroups(entry.providerGroupIds).concat(
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
  const evidenceLabels = options.evidenceSourceLabels ?? entry.evidenceSourceLabels;
  const diagnostics = [
    ...validateProviderGroups(providerIds),
    ...validateEvidenceSources(evidenceLabels),
    ...validateAvailability(entry, options.providerGroupAvailability),
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
      providerGroupIds: providerIds,
    },
    valid: diagnostics.length === 0,
  };
};

const sanitizePolicy = (
  sourcePolicy: VerificationSourcePolicy,
  options: VerificationSourceHandoffOptions = {},
): VerificationSourcePolicy => ({
  ...sourcePolicy,
  diagnosticNotes: sanitizeStrings([
    ...sourcePolicy.diagnosticNotes,
    ...(options.diagnosticNotes ?? []),
  ]),
  evidenceSourceLabels: sanitizeStrings(sourcePolicy.evidenceSourceLabels),
  providerGroupIds: [...sourcePolicy.providerGroupIds],
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

const resolveFailedOutcome = (
  entry: VerificationSourcePolicy,
  diagnostics: readonly VerificationSourceDiagnostic[],
): VerificationDegradationOutcome => {
  if (
    diagnostics.some((item) =>
      item.code === "UNKNOWN_PROVIDER_GROUP" || item.code === "UNSUPPORTED_EVIDENCE_SOURCE"
    )
  ) {
    return "blocked";
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

export const verificationSourceProviderGroups: ProviderIndexerAdapterGroup[] =
  providerIndexerAdapterGroups.filter((group) =>
    verificationSourcePolicies.some((policyEntry) => policyEntry.providerGroupIds.includes(group.id)),
  );
