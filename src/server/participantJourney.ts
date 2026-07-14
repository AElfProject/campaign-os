import type {
  AccountType,
  CampaignStatus,
  SupportedLocale,
  VerificationType,
  WalletCompatibility,
  WalletPolicy,
  WalletSource,
} from "../domain/types";
import type {
  CampaignDbDraft,
  CampaignDbParticipantRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskCompletionEvidenceSource,
  CampaignDbTaskCompletionStatus,
  CampaignDbTaskDraft,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";

export interface ParticipantJourneyRepositoryMetadata {
  readonly adapterId: string;
  readonly createdViaRepository: true;
  readonly repositoryId: string;
  readonly storeId: "campaign-db";
}

export interface ParticipantJourneySubject {
  readonly accountType: AccountType;
  readonly walletAddress: string;
  readonly walletSource: WalletSource;
}

export type ParticipantJourneyDiagnosticCode =
  | "COMPLETION_EVIDENCE_ID_MISMATCH"
  | "COMPLETION_EVIDENCE_STATUS_MISMATCH"
  | "COMPLETION_WITHOUT_EVIDENCE"
  | "DUPLICATE_COMPLETION"
  | "DUPLICATE_EVIDENCE"
  | "DUPLICATE_TASK"
  | "EVIDENCE_WITHOUT_COMPLETION"
  | "OUT_OF_SCOPE_RECORD_IGNORED"
  | "PARTICIPANT_MISSING"
  | "PARTICIPANT_POINTS_MISMATCH"
  | "POINTS_AWARD_MISMATCH"
  | "SUBJECT_METADATA_MISMATCH"
  | "WALLET_INCOMPATIBLE_PROGRESS_IGNORED";

export interface ParticipantJourneyDiagnostic {
  readonly code: ParticipantJourneyDiagnosticCode;
  readonly scope: "participant" | "snapshot" | "task";
  readonly taskId?: string;
}

export interface ParticipantJourneyCampaignSummary {
  readonly campaignId: string;
  readonly endTime: string;
  readonly goal: string;
  readonly projectId: string;
  readonly rewardDescription: string;
  readonly startTime: string;
  readonly status: CampaignStatus;
  readonly taskCount: number;
  readonly walletPolicy: WalletPolicy;
}

export type ParticipantJourneyTaskStatus = CampaignDbTaskCompletionStatus | "not_started";
export type ParticipantJourneyTaskAction = "await_review" | "blocked" | "completed" | "retry" | "verify";
export type ParticipantJourneyTaskBlockedReason = "inconsistent_records" | "wallet_incompatible" | null;

export interface ParticipantJourneyTaskProgress {
  readonly action: ParticipantJourneyTaskAction;
  readonly blockedReason: ParticipantJourneyTaskBlockedReason;
  readonly campaignId: string;
  readonly completionId: string | null;
  readonly evidenceId: string | null;
  readonly evidenceSource: CampaignDbTaskCompletionEvidenceSource | null;
  readonly pointsAvailable: number;
  readonly pointsAwarded: number;
  readonly required: boolean;
  readonly status: ParticipantJourneyTaskStatus;
  readonly taskId: string;
  readonly templateCode: string;
  readonly updatedAt: string | null;
  readonly verificationType: VerificationType;
  readonly walletCompatibility: WalletCompatibility;
}

export interface ParticipantJourneyParticipant {
  readonly accountType: AccountType;
  readonly campaignId: string;
  readonly localePreference: SupportedLocale;
  readonly participantId: string | null;
  readonly riskFlags: readonly string[];
  readonly totalPoints: number;
  readonly walletAddress: string;
  readonly walletSource: WalletSource;
  readonly walletTypeVerified: boolean;
}

export interface ParticipantJourneyRanking {
  readonly campaignId: string;
  readonly participantCount: number;
  readonly rank: number | null;
  readonly source: "repository_projection";
  readonly totalPoints: number;
  readonly walletAddress: string;
}

export interface ParticipantJourneyEligibility {
  readonly accountType: AccountType;
  readonly campaignId: string;
  readonly eligible: boolean;
  readonly localePreference: SupportedLocale;
  readonly missingTasks: readonly string[];
  readonly riskFlags: readonly string[];
  readonly score: number;
  readonly status: "eligible" | "not_eligible" | "pending" | "risk_flagged";
  readonly walletAddress: string;
  readonly walletSource: WalletSource;
  readonly walletTypeVerified: boolean;
}

export interface ParticipantJourneyProjection {
  readonly campaign: ParticipantJourneyCampaignSummary;
  readonly diagnostics: readonly ParticipantJourneyDiagnostic[];
  readonly eligibility: ParticipantJourneyEligibility;
  readonly participant: ParticipantJourneyParticipant;
  readonly ranking: ParticipantJourneyRanking;
  readonly repository: ParticipantJourneyRepositoryMetadata;
  readonly tasks: readonly ParticipantJourneyTaskProgress[];
}

export interface ParticipantJourneyProjectionInput {
  readonly campaign: CampaignDbDraft;
  readonly completions: readonly CampaignDbTaskCompletion[];
  readonly evidence: readonly CampaignDbTaskEvidenceRecord[];
  readonly participant?: CampaignDbParticipantRecord;
  readonly rankingParticipants: readonly ParticipantRankRow[];
  readonly repository: ParticipantJourneyRepositoryMetadata;
  readonly subject: ParticipantJourneySubject;
  readonly tasks: readonly CampaignDbTaskDraft[];
}

export interface ParticipantRankRow {
  readonly campaignId: string;
  readonly createdAt: string;
  readonly id: string;
  readonly totalPoints: number;
  readonly walletAddress: string;
}

const compareExactText = (left: string, right: string): number =>
  left === right ? 0 : left < right ? -1 : 1;
const MAX_PARTICIPANT_JOURNEY_DIAGNOSTICS = 100;

export const compareParticipantRankRows = (
  left: ParticipantRankRow,
  right: ParticipantRankRow,
): number => {
  const pointsComparison = right.totalPoints - left.totalPoints;

  if (pointsComparison !== 0) {
    return pointsComparison;
  }

  const createdAtComparison = compareExactText(left.createdAt, right.createdAt);

  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  const idComparison = compareExactText(left.id, right.id);

  return idComparison !== 0
    ? idComparison
    : compareExactText(left.walletAddress, right.walletAddress);
};

export const toParticipantRankRow = (
  participant: CampaignDbParticipantRecord,
): ParticipantRankRow => ({
  campaignId: participant.campaignId,
  createdAt: participant.createdAt,
  id: participant.id,
  totalPoints: participant.totalPoints,
  walletAddress: participant.walletAddress,
});

export const withoutParticipantRank = (
  participant: CampaignDbParticipantRecord,
): CampaignDbParticipantRecord => {
  const sanitized = { ...participant };
  delete sanitized.rank;

  return sanitized;
};

export const projectParticipantRanking = (
  campaignId: string,
  walletAddress: string,
  totalPoints: number,
  participants: readonly ParticipantRankRow[],
): ParticipantJourneyRanking => {
  const seenWallets = new Set<string>();
  const rankedParticipants: ParticipantRankRow[] = [];

  for (const participant of [...participants]
    .filter((record) => record.campaignId === campaignId)
    .sort(compareParticipantRankRows)) {
    if (seenWallets.has(participant.walletAddress)) {
      continue;
    }

    seenWallets.add(participant.walletAddress);
    rankedParticipants.push(participant);
  }

  const subjectIndex = rankedParticipants.findIndex(
    (participant) => participant.walletAddress === walletAddress,
  );

  return {
    campaignId,
    participantCount: rankedParticipants.length,
    rank: subjectIndex < 0 ? null : subjectIndex + 1,
    source: "repository_projection",
    totalPoints,
    walletAddress,
  };
};

export const isParticipantAccountTypeCompatible = (
  policy: WalletPolicy | WalletCompatibility,
  accountType: AccountType,
): boolean => {
  if (accountType !== "AA" && accountType !== "EOA") {
    return false;
  }

  return policy === "ANY"
    || (policy === "AA_ONLY" && accountType === "AA")
    || (policy === "EOA_ONLY" && accountType === "EOA");
};

const isSubjectMetadataConsistent = (
  record: CampaignDbTaskCompletion | CampaignDbTaskEvidenceRecord,
  subject: ParticipantJourneySubject,
) => record.accountType === subject.accountType && record.walletSource === subject.walletSource;

const actionForStatus = (status: ParticipantJourneyTaskStatus): ParticipantJourneyTaskAction => {
  switch (status) {
    case "completed":
      return "completed";
    case "pending":
    case "manual_review":
      return "await_review";
    case "failed":
      return "retry";
    case "not_started":
    default:
      return "verify";
  }
};

const maxTimestamp = (left: string, right: string): string =>
  compareExactText(left, right) >= 0 ? left : right;

const safeRiskFlags = (flags: readonly string[]): string[] =>
  Array.from(new Set(
    flags
      .filter((flag) => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(flag))
      .slice(0, 100),
  )).sort(compareExactText);

export const projectParticipantJourney = (
  input: ParticipantJourneyProjectionInput,
): ParticipantJourneyProjection => {
  const campaignId = input.campaign.id;
  const diagnostics = new Map<string, ParticipantJourneyDiagnostic>();
  const addDiagnostic = (
    code: ParticipantJourneyDiagnosticCode,
    scope: ParticipantJourneyDiagnostic["scope"],
    taskId?: string,
  ) => {
    const issue: ParticipantJourneyDiagnostic = {
      code,
      scope,
      ...(taskId ? { taskId } : {}),
    };
    const key = `${code}:${scope}:${taskId ?? ""}`;

    if (
      !diagnostics.has(key)
      && diagnostics.size < MAX_PARTICIPANT_JOURNEY_DIAGNOSTICS
    ) {
      diagnostics.set(key, issue);
    }
  };

  const canonicalTasks: CampaignDbTaskDraft[] = [];
  const taskIds = new Set<string>();
  const duplicateTaskIds = new Set<string>();

  for (const task of input.tasks) {
    if (task.campaignId !== campaignId) {
      addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
      continue;
    }

    if (taskIds.has(task.id)) {
      duplicateTaskIds.add(task.id);
      addDiagnostic("DUPLICATE_TASK", "task", task.id);
      continue;
    }

    taskIds.add(task.id);
    canonicalTasks.push(task);
  }

  const completionsByTaskId = new Map<string, CampaignDbTaskCompletion>();
  const duplicateCompletionTaskIds = new Set<string>();

  for (const completion of input.completions) {
    if (completion.walletAddress !== input.subject.walletAddress) {
      continue;
    }

    if (completion.campaignId !== campaignId || !taskIds.has(completion.taskId)) {
      addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
      continue;
    }

    if (completionsByTaskId.has(completion.taskId)) {
      duplicateCompletionTaskIds.add(completion.taskId);
      addDiagnostic("DUPLICATE_COMPLETION", "task", completion.taskId);
      continue;
    }

    completionsByTaskId.set(completion.taskId, completion);
  }

  const evidenceByTaskId = new Map<string, CampaignDbTaskEvidenceRecord>();
  const duplicateEvidenceTaskIds = new Set<string>();

  for (const evidence of input.evidence) {
    if (evidence.walletAddress !== input.subject.walletAddress) {
      continue;
    }

    if (evidence.campaignId !== campaignId || !taskIds.has(evidence.taskId)) {
      addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
      continue;
    }

    if (evidenceByTaskId.has(evidence.taskId)) {
      duplicateEvidenceTaskIds.add(evidence.taskId);
      addDiagnostic("DUPLICATE_EVIDENCE", "task", evidence.taskId);
      continue;
    }

    evidenceByTaskId.set(evidence.taskId, evidence);
  }

  const scopedParticipant = input.participant?.campaignId === campaignId
    && input.participant.walletAddress === input.subject.walletAddress
    ? input.participant
    : undefined;

  if (input.participant && !scopedParticipant) {
    addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
  }

  if (scopedParticipant && (
    scopedParticipant.accountType !== input.subject.accountType
    || scopedParticipant.walletSource !== input.subject.walletSource
  )) {
    addDiagnostic("SUBJECT_METADATA_MISMATCH", "participant");
  }

  const participantMissingWithProgress = !scopedParticipant
    && (completionsByTaskId.size > 0 || evidenceByTaskId.size > 0);

  if (participantMissingWithProgress) {
    addDiagnostic("PARTICIPANT_MISSING", "participant");
  }

  const progress = canonicalTasks.map((task): ParticipantJourneyTaskProgress => {
    const completion = completionsByTaskId.get(task.id);
    const evidence = evidenceByTaskId.get(task.id);
    const compatible = isParticipantAccountTypeCompatible(
      input.campaign.walletPolicy,
      input.subject.accountType,
    ) && isParticipantAccountTypeCompatible(task.walletCompatibility, input.subject.accountType);
    const inconsistentDuplicate = duplicateTaskIds.has(task.id)
      || duplicateCompletionTaskIds.has(task.id)
      || duplicateEvidenceTaskIds.has(task.id);

    if (!compatible) {
      if (completion || evidence) {
        addDiagnostic("WALLET_INCOMPATIBLE_PROGRESS_IGNORED", "task", task.id);
      }

      return {
        action: "blocked",
        blockedReason: "wallet_incompatible",
        campaignId,
        completionId: null,
        evidenceId: null,
        evidenceSource: null,
        pointsAvailable: task.points,
        pointsAwarded: 0,
        required: task.required,
        status: "not_started",
        taskId: task.id,
        templateCode: task.templateCode,
        updatedAt: null,
        verificationType: task.verificationType,
        walletCompatibility: task.walletCompatibility,
      };
    }

    let inconsistent = inconsistentDuplicate
      || (participantMissingWithProgress && Boolean(completion || evidence));

    if (completion && !evidence) {
      addDiagnostic("COMPLETION_WITHOUT_EVIDENCE", "task", task.id);
      inconsistent = true;
    } else if (!completion && evidence) {
      addDiagnostic("EVIDENCE_WITHOUT_COMPLETION", "task", task.id);
      inconsistent = true;
    } else if (completion && evidence) {
      if (completion.evidenceId !== evidence.id || evidence.completionId !== completion.id) {
        addDiagnostic("COMPLETION_EVIDENCE_ID_MISMATCH", "task", task.id);
        inconsistent = true;
      }

      if (completion.status !== evidence.status) {
        addDiagnostic("COMPLETION_EVIDENCE_STATUS_MISMATCH", "task", task.id);
        inconsistent = true;
      }

      if (!isSubjectMetadataConsistent(completion, input.subject)
        || !isSubjectMetadataConsistent(evidence, input.subject)) {
        addDiagnostic("SUBJECT_METADATA_MISMATCH", "task", task.id);
        inconsistent = true;
      }

      const expectedPoints = completion.status === "completed" ? task.points : 0;
      if (
        completion.pointsAwarded !== expectedPoints
        || evidence.pointsAwarded !== completion.pointsAwarded
      ) {
        addDiagnostic("POINTS_AWARD_MISMATCH", "task", task.id);
        inconsistent = true;
      }
    }

    if (inconsistent) {
      return {
        action: "blocked",
        blockedReason: "inconsistent_records",
        campaignId,
        completionId: null,
        evidenceId: null,
        evidenceSource: null,
        pointsAvailable: task.points,
        pointsAwarded: 0,
        required: task.required,
        status: "not_started",
        taskId: task.id,
        templateCode: task.templateCode,
        updatedAt: null,
        verificationType: task.verificationType,
        walletCompatibility: task.walletCompatibility,
      };
    }

    const status = completion?.status ?? "not_started";

    return {
      action: actionForStatus(status),
      blockedReason: null,
      campaignId,
      completionId: completion?.id ?? null,
      evidenceId: evidence?.id ?? null,
      evidenceSource: evidence?.evidenceSource ?? completion?.evidenceSource ?? null,
      pointsAvailable: task.points,
      pointsAwarded: status === "completed" ? completion?.pointsAwarded ?? 0 : 0,
      required: task.required,
      status,
      taskId: task.id,
      templateCode: task.templateCode,
      updatedAt: completion && evidence
        ? maxTimestamp(completion.updatedAt, evidence.updatedAt)
        : null,
      verificationType: task.verificationType,
      walletCompatibility: task.walletCompatibility,
    };
  });

  const completedPoints = progress.reduce(
    (total, task) => total + (task.status === "completed" ? task.pointsAwarded : 0),
    0,
  );
  const totalPoints = scopedParticipant?.totalPoints ?? completedPoints;

  if (scopedParticipant && scopedParticipant.totalPoints !== completedPoints) {
    addDiagnostic("PARTICIPANT_POINTS_MISMATCH", "participant");
  }

  const riskFlags = safeRiskFlags(scopedParticipant?.riskFlags ?? []);
  const walletTypeVerified = scopedParticipant?.walletTypeVerified
    ?? (input.subject.accountType !== "UNKNOWN"
      && input.subject.walletSource !== "OTHER"
      && input.subject.walletSource !== "AGENT_SKILL");
  const localePreference = scopedParticipant?.localePreference ?? input.campaign.defaultLocale;
  const missingTasks = progress
    .filter((task) => task.required && task.status !== "completed")
    .map((task) => task.templateCode || task.taskId);
  const hasPendingRequiredTask = progress.some((task) =>
    task.required && (task.status === "pending" || task.status === "manual_review"));
  const hasUnsafeInconsistentProgress = progress.some((task) =>
    task.blockedReason === "inconsistent_records");
  const eligibilityStatus: ParticipantJourneyEligibility["status"] = riskFlags.length > 0
    ? "risk_flagged"
    : hasUnsafeInconsistentProgress
      ? "not_eligible"
      : missingTasks.length === 0
        ? "eligible"
        : hasPendingRequiredTask
          ? "pending"
          : "not_eligible";

  return {
    campaign: {
      campaignId,
      endTime: input.campaign.endTime,
      goal: input.campaign.goal,
      projectId: input.campaign.projectId,
      rewardDescription: input.campaign.rewardDescription,
      startTime: input.campaign.startTime,
      status: input.campaign.status,
      taskCount: canonicalTasks.length,
      walletPolicy: input.campaign.walletPolicy,
    },
    diagnostics: [...diagnostics.values()].sort((left, right) => {
      const codeComparison = compareExactText(left.code, right.code);

      if (codeComparison !== 0) {
        return codeComparison;
      }

      const scopeComparison = compareExactText(left.scope, right.scope);

      return scopeComparison !== 0
        ? scopeComparison
        : compareExactText(left.taskId ?? "", right.taskId ?? "");
    }),
    eligibility: {
      accountType: input.subject.accountType,
      campaignId,
      eligible: eligibilityStatus === "eligible",
      localePreference,
      missingTasks,
      riskFlags,
      score: totalPoints,
      status: eligibilityStatus,
      walletAddress: input.subject.walletAddress,
      walletSource: input.subject.walletSource,
      walletTypeVerified,
    },
    participant: {
      accountType: input.subject.accountType,
      campaignId,
      localePreference,
      participantId: scopedParticipant?.id ?? null,
      riskFlags,
      totalPoints,
      walletAddress: input.subject.walletAddress,
      walletSource: input.subject.walletSource,
      walletTypeVerified,
    },
    ranking: projectParticipantRanking(
      campaignId,
      input.subject.walletAddress,
      totalPoints,
      scopedParticipant
        ? input.rankingParticipants
        : input.rankingParticipants.filter(
          (participant) => participant.walletAddress !== input.subject.walletAddress,
        ),
    ),
    repository: { ...input.repository },
    tasks: progress,
  };
};
