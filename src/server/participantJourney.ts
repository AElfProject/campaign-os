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
import { createCanonicalTaskVerificationRevision } from "./taskVerification";
import type { TaskVerificationAttemptSafeRecord } from "./taskVerificationAttemptStore";

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
  | "COMPLETION_EVIDENCE_HASH_MISMATCH"
  | "COMPLETION_EVIDENCE_ID_MISMATCH"
  | "COMPLETION_EVIDENCE_STATUS_MISMATCH"
  | "COMPLETION_WITHOUT_EVIDENCE"
  | "DUPLICATE_COMPLETION"
  | "DUPLICATE_EVIDENCE"
  | "DUPLICATE_TASK"
  | "EVIDENCE_WITHOUT_COMPLETION"
  | "LIVE_PROVIDER_ATTEMPT_LINKAGE_INVALID"
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
  readonly evidenceHash: string | null;
  readonly evidenceId: string | null;
  readonly evidenceRef: string | null;
  readonly evidenceSource: CampaignDbTaskCompletionEvidenceSource | null;
  readonly liveProviderExecuted: boolean;
  readonly pointsAvailable: number;
  readonly pointsAwarded: number;
  readonly required: boolean;
  readonly status: ParticipantJourneyTaskStatus;
  readonly taskId: string;
  readonly templateCode: string;
  readonly updatedAt: string | null;
  readonly verificationAttemptId: string | null;
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
  readonly attempts: readonly TaskVerificationAttemptSafeRecord[];
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

const safeEvidenceHash = (value: string | undefined): string | null =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : null;

const safeEvidenceRef = (value: string | undefined): string | null =>
  typeof value === "string"
  && value.length <= 256
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : null;

const compareAttemptRecency = (
  left: TaskVerificationAttemptSafeRecord,
  right: TaskVerificationAttemptSafeRecord,
): number => {
  const updatedAtComparison = compareExactText(right.updatedAt, left.updatedAt);

  if (updatedAtComparison !== 0) {
    return updatedAtComparison;
  }

  const createdAtComparison = compareExactText(right.createdAt, left.createdAt);

  return createdAtComparison !== 0
    ? createdAtComparison
    : compareExactText(left.id, right.id);
};

const journeyStatusForAttempt = (
  status: TaskVerificationAttemptSafeRecord["status"],
): CampaignDbTaskCompletionStatus | null => {
  switch (status) {
    case "requested":
    case "running":
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    case "manual_review":
      return "manual_review";
    case "completed":
    default:
      return null;
  }
};

const matchesCurrentTaskRevision = (
  attempt: TaskVerificationAttemptSafeRecord,
  task: CampaignDbTaskDraft,
): "invalid" | "match" | "stale" => {
  if (attempt.taskRevision !== (task.revision ?? 1)) {
    return "stale";
  }

  if (
    (task.verificationType !== "ON_CHAIN" && task.verificationType !== "DAPP_API")
    || attempt.verificationType !== task.verificationType
  ) {
    return "invalid";
  }

  try {
    const canonicalTask = createCanonicalTaskVerificationRevision({
      campaignId: task.campaignId,
      evidenceRule: task.evidenceRule,
      points: task.points,
      required: task.required,
      revision: task.revision ?? 1,
      taskId: task.id,
      traceId: "participant-journey-attempt-linkage",
      updatedAt: task.updatedAt,
      verificationType: task.verificationType,
      walletPolicy: task.walletCompatibility,
    });

    return canonicalTask.taskRevisionDigest === attempt.taskRevisionDigest
      && canonicalTask.evidenceRuleDigest === attempt.evidenceRuleDigest
      ? "match"
      : "invalid";
  } catch {
    return "invalid";
  }
};

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
  const canonicalTasksById = new Map<string, CampaignDbTaskDraft>();
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
    canonicalTasksById.set(task.id, task);
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

  const currentAttemptsByTaskId = new Map<string, TaskVerificationAttemptSafeRecord[]>();
  const currentAttemptsById = new Map<string, TaskVerificationAttemptSafeRecord>();
  const currentAttemptTaskById = new Map<string, string>();
  const invalidAttemptTaskIds = new Set<string>();

  for (const attempt of input.attempts) {
    if (attempt.walletAddress !== input.subject.walletAddress) {
      continue;
    }

    const task = canonicalTasksById.get(attempt.taskId);
    if (attempt.campaignId !== campaignId || !task) {
      addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
      continue;
    }

    const revisionPosture = matchesCurrentTaskRevision(attempt, task);
    if (revisionPosture === "stale") {
      continue;
    }

    const previousTaskId = currentAttemptTaskById.get(attempt.id);
    const invalidLinkage = revisionPosture === "invalid"
      || attempt.accountType !== input.subject.accountType
      || attempt.walletSource !== input.subject.walletSource
      || previousTaskId !== undefined;

    if (invalidLinkage) {
      invalidAttemptTaskIds.add(task.id);
      if (previousTaskId) {
        invalidAttemptTaskIds.add(previousTaskId);
      }
      addDiagnostic("LIVE_PROVIDER_ATTEMPT_LINKAGE_INVALID", "task", task.id);
      if (previousTaskId && previousTaskId !== task.id) {
        addDiagnostic("LIVE_PROVIDER_ATTEMPT_LINKAGE_INVALID", "task", previousTaskId);
      }
      continue;
    }

    currentAttemptTaskById.set(attempt.id, task.id);
    currentAttemptsById.set(attempt.id, attempt);
    const taskAttempts = currentAttemptsByTaskId.get(task.id) ?? [];
    taskAttempts.push(attempt);
    currentAttemptsByTaskId.set(task.id, taskAttempts);
  }

  for (const attempts of currentAttemptsByTaskId.values()) {
    attempts.sort(compareAttemptRecency);
  }

  const scopedParticipant = input.participant?.campaignId === campaignId
    && input.participant.walletAddress === input.subject.walletAddress
    ? input.participant
    : undefined;

  if (input.participant && !scopedParticipant) {
    addDiagnostic("OUT_OF_SCOPE_RECORD_IGNORED", "snapshot");
  }

  const participantSubjectMismatch = Boolean(scopedParticipant && (
    scopedParticipant.accountType !== input.subject.accountType
    || scopedParticipant.walletSource !== input.subject.walletSource
  ));

  if (participantSubjectMismatch) {
    addDiagnostic("SUBJECT_METADATA_MISMATCH", "participant");
  }

  const participantMissingWithProgress = !scopedParticipant
    && (completionsByTaskId.size > 0 || evidenceByTaskId.size > 0);

  if (participantMissingWithProgress) {
    addDiagnostic("PARTICIPANT_MISSING", "participant");
  }

  let hasIncompatiblePersistedProgress = false;
  const progress = canonicalTasks.map((task): ParticipantJourneyTaskProgress => {
    const completion = completionsByTaskId.get(task.id);
    const evidence = evidenceByTaskId.get(task.id);
    const currentAttempts = currentAttemptsByTaskId.get(task.id) ?? [];
    const latestAttempt = currentAttempts[0];
    const compatible = isParticipantAccountTypeCompatible(
      input.campaign.walletPolicy,
      input.subject.accountType,
    ) && isParticipantAccountTypeCompatible(task.walletCompatibility, input.subject.accountType);
    const inconsistentDuplicate = duplicateTaskIds.has(task.id)
      || duplicateCompletionTaskIds.has(task.id)
      || duplicateEvidenceTaskIds.has(task.id);

    if (!compatible) {
      if (completion || evidence || currentAttempts.length > 0) {
        hasIncompatiblePersistedProgress = true;
        addDiagnostic("WALLET_INCOMPATIBLE_PROGRESS_IGNORED", "task", task.id);
      }

      return {
        action: "blocked",
        blockedReason: "wallet_incompatible",
        campaignId,
        completionId: null,
        evidenceHash: null,
        evidenceId: null,
        evidenceRef: null,
        evidenceSource: null,
        liveProviderExecuted: false,
        pointsAvailable: task.points,
        pointsAwarded: 0,
        required: task.required,
        status: "not_started",
        taskId: task.id,
        templateCode: task.templateCode,
        updatedAt: null,
        verificationAttemptId: null,
        verificationType: task.verificationType,
        walletCompatibility: task.walletCompatibility,
      };
    }

    let inconsistent = inconsistentDuplicate
      || invalidAttemptTaskIds.has(task.id)
      || (participantMissingWithProgress && Boolean(completion || evidence));

    if (completion && !evidence) {
      if (completion.status === "completed") {
        addDiagnostic("COMPLETION_WITHOUT_EVIDENCE", "task", task.id);
        inconsistent = true;
      }

      if (!isSubjectMetadataConsistent(completion, input.subject)) {
        addDiagnostic("SUBJECT_METADATA_MISMATCH", "task", task.id);
        inconsistent = true;
      }

      if (completion.pointsAwarded !== 0) {
        addDiagnostic("POINTS_AWARD_MISMATCH", "task", task.id);
        inconsistent = true;
      }
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

      if (
        completion.status === "completed"
        && completion.evidenceHash !== evidence.evidenceHash
      ) {
        addDiagnostic("COMPLETION_EVIDENCE_HASH_MISMATCH", "task", task.id);
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

      const completionAttemptId = completion.verificationAttemptId;
      const evidenceAttemptId = evidence.verificationAttemptId;
      const hasAttemptLinkage = completionAttemptId !== undefined
        || evidenceAttemptId !== undefined;

      if (evidence.liveProviderExecuted || hasAttemptLinkage) {
        const linkedAttempt = completionAttemptId
          ? currentAttemptsById.get(completionAttemptId)
          : undefined;
        if (
          completion.status !== "completed"
          || !evidence.liveProviderExecuted
          || !completionAttemptId
          || completionAttemptId !== evidenceAttemptId
          || !linkedAttempt
          || linkedAttempt.status !== "completed"
          || linkedAttempt.evidenceHash !== evidence.evidenceHash
          || linkedAttempt.evidenceRef !== evidence.evidenceRef
          || linkedAttempt.evidenceSource !== evidence.evidenceSource
          || !["AEFINDER", "AELFSCAN", "DAPP_API"].includes(evidence.evidenceSource)
        ) {
          addDiagnostic("LIVE_PROVIDER_ATTEMPT_LINKAGE_INVALID", "task", task.id);
          inconsistent = true;
        }
      }
    }

    if (
      !completion
      && !evidence
      && currentAttempts.some((attempt) => attempt.status === "completed")
    ) {
      addDiagnostic("LIVE_PROVIDER_ATTEMPT_LINKAGE_INVALID", "task", task.id);
      inconsistent = true;
    }

    if (inconsistent) {
      return {
        action: "blocked",
        blockedReason: "inconsistent_records",
        campaignId,
        completionId: null,
        evidenceHash: null,
        evidenceId: null,
        evidenceRef: null,
        evidenceSource: null,
        liveProviderExecuted: false,
        pointsAvailable: task.points,
        pointsAwarded: 0,
        required: task.required,
        status: "not_started",
        taskId: task.id,
        templateCode: task.templateCode,
        updatedAt: null,
        verificationAttemptId: null,
        verificationType: task.verificationType,
        walletCompatibility: task.walletCompatibility,
      };
    }

    const attemptStatus = !completion && !evidence && latestAttempt
      ? journeyStatusForAttempt(latestAttempt.status)
      : null;
    const status = completion?.status ?? attemptStatus ?? "not_started";
    const exposesEvidence = status === "completed" && Boolean(evidence);

    return {
      action: actionForStatus(status),
      blockedReason: null,
      campaignId,
      completionId: completion?.id ?? null,
      evidenceHash: exposesEvidence ? safeEvidenceHash(evidence?.evidenceHash) : null,
      evidenceId: exposesEvidence ? evidence?.id ?? null : null,
      evidenceRef: exposesEvidence ? safeEvidenceRef(evidence?.evidenceRef) : null,
      evidenceSource: exposesEvidence ? evidence?.evidenceSource ?? null : null,
      liveProviderExecuted: exposesEvidence && evidence?.liveProviderExecuted === true,
      pointsAvailable: task.points,
      pointsAwarded: status === "completed" ? completion?.pointsAwarded ?? 0 : 0,
      required: task.required,
      status,
      taskId: task.id,
      templateCode: task.templateCode,
      updatedAt: completion
        ? evidence
          ? maxTimestamp(completion.updatedAt, evidence.updatedAt)
          : completion.updatedAt
        : latestAttempt?.updatedAt ?? null,
      verificationAttemptId: exposesEvidence
        ? evidence?.verificationAttemptId ?? completion?.verificationAttemptId ?? null
        : completion?.verificationAttemptId ?? latestAttempt?.id ?? null,
      verificationType: task.verificationType,
      walletCompatibility: task.walletCompatibility,
    };
  });

  const completedPoints = progress.reduce(
    (total, task) => total + (task.status === "completed" ? task.pointsAwarded : 0),
    0,
  );
  const totalPoints = completedPoints;
  const participantPointsMismatch = Boolean(
    scopedParticipant && scopedParticipant.totalPoints !== completedPoints,
  );

  if (participantPointsMismatch) {
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
  const hasUnsafeEligibilityState = participantMissingWithProgress
    || participantSubjectMismatch
    || hasIncompatiblePersistedProgress
    || hasUnsafeInconsistentProgress;
  const eligibilityStatus: ParticipantJourneyEligibility["status"] = riskFlags.length > 0
    ? "risk_flagged"
    : hasUnsafeEligibilityState
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
        ? input.rankingParticipants.map((participant) =>
          participant.walletAddress === input.subject.walletAddress
            ? { ...participant, totalPoints }
            : participant)
        : input.rankingParticipants.filter(
          (participant) => participant.walletAddress !== input.subject.walletAddress,
        ),
    ),
    repository: { ...input.repository },
    tasks: progress,
  };
};
