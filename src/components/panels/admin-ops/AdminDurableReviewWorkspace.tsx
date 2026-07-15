import {
  AlertTriangle,
  Check,
  FileDown,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  AdminArtifactDetailData,
  AdminArtifactDownloadData,
  AdminArtifactListData,
  AdminArtifactMetadata,
  AdminCampaignListData,
  AdminDurableReviewApiBridge,
  AdminDurableReviewRequestContext,
  AdminDurableReviewResult,
  AdminReviewDetailData,
  AdminReviewQueueData,
  AdminWinnerListData,
} from "../../../api/adminDurableReviewApiBridge";
import type { NormalizedWalletSession, SupportedLocale } from "../../../domain/types";
import { adminOpsCopy } from "./copy";
import {
  adminDurableReviewWorkflowReducer,
  createAdminDurableReviewSessionKey,
  createAdminDurableReviewWorkflowState,
  nextAdminDurableReviewRequestToken,
  selectAdminDurableReviewCapabilities,
  selectAdminDurableReviewRequestActive,
  selectAdminDurableReviewRetryTarget,
  type AdminDurableReviewDownloadRetryTarget,
  type AdminDurableReviewOperation,
  type AdminDurableReviewReadOperation,
  type AdminDurableReviewRefreshOperation,
  type AdminDurableReviewRequestToken,
  type AdminDurableReviewWorkflowEvent,
  type AdminDurableReviewWorkflowFailure,
} from "./adminDurableReviewWorkflow";

interface AdminDurableReviewWorkspaceProps {
  bridge: AdminDurableReviewApiBridge;
  locale: SupportedLocale;
  onReconnect?: () => void;
  session: NormalizedWalletSession | null;
}

const reasonCodes = {
  approved: ["evidence_verified"],
  needs_review: ["manual_review_required", "risk_requires_review"],
  rejected: ["eligibility_not_met", "evidence_invalid"],
} as const;

const readOperations = [
  "campaigns",
  "queue",
  "detail",
  "winners",
  "artifacts",
  "artifactDetail",
] as const satisfies readonly AdminDurableReviewReadOperation[];
const objectUrlReleaseDelayMs = 0;
const snapshotTextMaxLength = 4_096;
const diagnosticCodeMaxLength = 128;
const diagnosticCodeMaxCount = 64;
const modalFocusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
const unsafeSnapshotTextPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const diagnosticCodePattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;

const readValue = <T,>(value: unknown): T | null => value && typeof value === "object"
  ? value as T
  : null;

const safeSnapshotText = (value: unknown, maxLength = snapshotTextMaxLength): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0
    && normalized.length <= maxLength
    && !unsafeSnapshotTextPattern.test(normalized)
    ? normalized
    : null;
};

const safeSnapshotField = (
  record: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): string => {
  for (const field of fields) {
    const value = safeSnapshotText(record[field]);
    if (value) {
      return value;
    }
  }
  return "-";
};

const safeSnapshotDetails = (
  record: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): readonly string[] => fields.flatMap((field) => {
  const value = record[field];
  const safeText = safeSnapshotText(value);
  return safeText
    || (typeof value === "number" && Number.isFinite(value))
    || typeof value === "boolean"
    ? [`${field}: ${safeText ?? String(value)}`]
    : [];
});

const safeSnapshotDiagnosticDetails = (
  record: Readonly<Record<string, unknown>>,
): readonly string[] => {
  const value = record.diagnosticCodes;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, diagnosticCodeMaxCount).flatMap((item) => {
    const safeCode = safeSnapshotText(item, diagnosticCodeMaxLength);
    return safeCode && diagnosticCodePattern.test(safeCode)
      ? [`diagnosticCodes: ${safeCode}`]
      : [];
  });
};

const workflowFailure = (result: Exclude<AdminDurableReviewResult, { ok: true }>) => ({
  code: result.code,
  ...(typeof (result as { httpStatus?: unknown }).httpStatus === "number"
    ? { httpStatus: (result as { httpStatus: number }).httpStatus }
    : {}),
  reconnectRequired: result.reconnectRequired,
  retryable: result.retryable,
  traceId: result.traceId,
}) satisfies AdminDurableReviewWorkflowFailure;

interface DecisionIdempotencyInput {
  readonly campaignId: string;
  readonly decision: "approved" | "needs_review" | "rejected";
  readonly note: string;
  readonly operatorAddress: string;
  readonly participantId: string;
  readonly reasonCode: string;
  readonly snapshotFingerprint: string;
}

interface DecisionAttempt extends DecisionIdempotencyInput {
  readonly attemptNonce: string;
}

const decisionPayloadIdentity = (input: DecisionIdempotencyInput): string => JSON.stringify([
  input.operatorAddress,
  input.campaignId,
  input.participantId,
  input.snapshotFingerprint,
  input.decision,
  input.reasonCode,
  input.note,
]);

const createDecisionAttemptNonce = (): string | null => {
  try {
    if (!globalThis.crypto?.getRandomValues) {
      return null;
    }
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
};

const createDecisionIdempotencyKey = async (
  input: DecisionAttempt,
): Promise<string | null> => {
  try {
    if (!globalThis.crypto?.subtle || !/^[a-f0-9]{32}$/u.test(input.attemptNonce)) {
      return null;
    }
    const canonicalPayload = JSON.stringify([
      "admin-decision-v2",
      input.attemptNonce,
      input.operatorAddress,
      input.campaignId,
      input.participantId,
      input.snapshotFingerprint,
      input.decision,
      input.reasonCode,
      input.note,
    ]);
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalPayload),
    );
    const hexDigest = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    return `admin-decision-${hexDigest}`;
  } catch {
    return null;
  }
};

type ArtifactFreshness = "current" | "stale";

const artifactFreshness = (
  item: AdminArtifactMetadata,
  winnerSourceFingerprint: string | null,
): ArtifactFreshness | null => winnerSourceFingerprint
  ? item.sourceFingerprint === winnerSourceFingerprint ? "current" : "stale"
  : null;

export const AdminDurableReviewWorkspace = ({
  bridge,
  locale,
  onReconnect,
  session,
}: AdminDurableReviewWorkspaceProps) => {
  const copy = adminOpsCopy[locale];
  const sessionKey = useMemo(() => createAdminDurableReviewSessionKey(session), [session]);
  const [state, dispatch] = useReducer(
    adminDurableReviewWorkflowReducer,
    sessionKey,
    createAdminDurableReviewWorkflowState,
  );
  const [decisionConfirmation, setDecisionConfirmation] = useState<DecisionAttempt | null>(
    null,
  );
  const ambiguousDecisionAttemptRef = useRef<DecisionAttempt | null>(null);
  const bridgeRef = useRef(bridge);
  const stateRef = useRef(state);
  const sessionRef = useRef(session);
  const controllersRef = useRef<Partial<Record<AdminDurableReviewOperation, AbortController>>>({});
  const confirmationCancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmationRef = useRef<HTMLDivElement | null>(null);
  const confirmationInitiatorRef = useRef<HTMLButtonElement | null>(null);
  const confirmationRestorePendingRef = useRef(false);
  const diagnosticRef = useRef<HTMLDivElement | null>(null);
  const downloadDiagnosticRef = useRef<HTMLDivElement | null>(null);
  const observedFailuresRef = useRef({
    diagnostic: state.diagnostic,
    downloadFailure: state.downloadFailure,
  });
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const focusedParticipantRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const objectUrlReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  bridgeRef.current = bridge;
  sessionRef.current = session;
  stateRef.current = state;

  const applyEvent = useCallback((event: AdminDurableReviewWorkflowEvent) => {
    if (!mountedRef.current) {
      return stateRef.current;
    }
    const next = adminDurableReviewWorkflowReducer(stateRef.current, event);
    stateRef.current = next;
    dispatch(event);
    return next;
  }, []);

  const abortOperation = useCallback((operation: AdminDurableReviewOperation) => {
    controllersRef.current[operation]?.abort();
    delete controllersRef.current[operation];
  }, []);

  const abortAll = useCallback(() => {
    for (const controller of Object.values(controllersRef.current)) {
      controller?.abort();
    }
    controllersRef.current = {};
  }, []);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlReleaseTimerRef.current !== null) {
      clearTimeout(objectUrlReleaseTimerRef.current);
      objectUrlReleaseTimerRef.current = null;
    }
    const objectUrl = objectUrlRef.current;
    objectUrlRef.current = null;
    if (objectUrl && typeof URL.revokeObjectURL === "function") {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Browser cleanup must never leave the workflow stuck in a pending state.
      }
    }
  }, []);

  const scheduleObjectUrlRelease = useCallback(() => {
    if (objectUrlReleaseTimerRef.current !== null) {
      clearTimeout(objectUrlReleaseTimerRef.current);
    }
    objectUrlReleaseTimerRef.current = setTimeout(() => {
      objectUrlReleaseTimerRef.current = null;
      releaseObjectUrl();
    }, objectUrlReleaseDelayMs);
  }, [releaseObjectUrl]);

  const requestContext = useCallback((
    operation: AdminDurableReviewOperation,
    token: AdminDurableReviewRequestToken,
    controller: AbortController,
  ): AdminDurableReviewRequestContext => ({
    session: sessionRef.current,
    signal: controller.signal,
    traceId: `admin-ui-${operation}-${token.epoch}-${token.sequence}`,
  }), []);

  const beginRequest = useCallback((
    operation: AdminDurableReviewOperation,
    options?: { expectedContentHash: string },
  ) => {
    abortOperation(operation);
    const controller = new AbortController();
    controllersRef.current[operation] = controller;
    const token = nextAdminDurableReviewRequestToken(stateRef.current, operation, options);
    applyEvent({ token, type: "requestStarted" });
    return { controller, token };
  }, [abortOperation, applyEvent]);

  const closeDecisionConfirmation = useCallback(() => {
    confirmationRestorePendingRef.current = true;
    const initiator = confirmationInitiatorRef.current;
    if (initiator?.isConnected && !initiator.disabled) {
      initiator.focus();
    }
    setDecisionConfirmation(null);
  }, []);

  const finishRequest = useCallback((
    operation: AdminDurableReviewOperation,
    controller: AbortController,
  ) => {
    if (controllersRef.current[operation] === controller) {
      delete controllersRef.current[operation];
    }
  }, []);

  const runRead = useCallback(async (
    operation: AdminDurableReviewReadOperation,
    invoke: (context: AdminDurableReviewRequestContext) => Promise<AdminDurableReviewResult>,
  ) => {
    if (!stateRef.current.identity.sessionKey || !sessionRef.current) {
      return;
    }
    const { controller, token } = beginRequest(operation);
    try {
      const result = await invoke(requestContext(operation, token, controller));
      if (result.ok) {
        applyEvent({ data: result.data, token, type: "readSucceeded" });
      } else {
        applyEvent({ failure: workflowFailure(result), token, type: "requestFailed" });
      }
    } finally {
      finishRequest(operation, controller);
    }
  }, [applyEvent, beginRequest, finishRequest, requestContext]);

  const loadCampaigns = useCallback(() => runRead(
    "campaigns",
    (context) => bridgeRef.current.listCampaigns(context, { limit: 100 }),
  ), [runRead]);

  const loadQueue = useCallback(() => {
    const { selectedCampaignId } = stateRef.current.identity;
    if (!selectedCampaignId) {
      return Promise.resolve();
    }
    const stateFilter = stateRef.current.draft.queueState;
    return runRead(
      "queue",
      (context) => bridgeRef.current.listReviews(selectedCampaignId, context, {
        limit: 100,
        ...(stateFilter === "all" ? {} : { state: stateFilter }),
      }),
    );
  }, [runRead]);

  const loadDetail = useCallback(() => {
    const { selectedCampaignId, selectedParticipantId } = stateRef.current.identity;
    return selectedCampaignId && selectedParticipantId
      ? runRead(
          "detail",
          (context) => bridgeRef.current.getReviewDetail(
            selectedCampaignId,
            selectedParticipantId,
            context,
          ),
        )
      : Promise.resolve();
  }, [runRead]);

  const loadWinners = useCallback(() => {
    const { selectedCampaignId } = stateRef.current.identity;
    return selectedCampaignId
      ? runRead(
          "winners",
          (context) => bridgeRef.current.listWinners(selectedCampaignId, context, { limit: 100 }),
        )
      : Promise.resolve();
  }, [runRead]);

  const loadArtifacts = useCallback(() => {
    const { selectedCampaignId } = stateRef.current.identity;
    return selectedCampaignId
      ? runRead(
          "artifacts",
          (context) => bridgeRef.current.listArtifacts(selectedCampaignId, context, { limit: 100 }),
        )
      : Promise.resolve();
  }, [runRead]);

  const loadArtifactDetail = useCallback(() => {
    const { selectedArtifactId, selectedCampaignId } = stateRef.current.identity;
    return selectedCampaignId && selectedArtifactId
      ? runRead(
          "artifactDetail",
          (context) => bridgeRef.current.getArtifactDetail(
            selectedCampaignId,
            selectedArtifactId,
            context,
          ),
        )
      : Promise.resolve();
  }, [runRead]);

  const consumeRefresh = useCallback((
    operation: AdminDurableReviewRefreshOperation,
    run: () => Promise<void> | void,
  ) => {
    const cursor = stateRef.current.refresh[operation];
    if (cursor.requested <= cursor.consumed) {
      return;
    }
    const before = stateRef.current;
    const next = applyEvent({ operation, type: "refreshConsumed", version: cursor.requested });
    if (next !== before) {
      void run();
    }
  }, [applyEvent]);

  useEffect(() => {
    mountedRef.current = true;
    abortAll();
    releaseObjectUrl();
    applyEvent({ sessionKey, type: "sessionChanged" });
    if (sessionKey) {
      void loadCampaigns();
    }

    return () => {
      mountedRef.current = false;
      abortAll();
      releaseObjectUrl();
    };
  }, [abortAll, applyEvent, loadCampaigns, releaseObjectUrl, sessionKey]);

  useEffect(() => {
    const previous = observedFailuresRef.current;
    const diagnosticChanged = state.diagnostic !== previous.diagnostic;
    const downloadFailureChanged = state.downloadFailure !== previous.downloadFailure;
    observedFailuresRef.current = {
      diagnostic: state.diagnostic,
      downloadFailure: state.downloadFailure,
    };

    if (diagnosticChanged && state.diagnostic) {
      diagnosticRef.current?.focus();
    } else if (downloadFailureChanged && state.downloadFailure) {
      downloadDiagnosticRef.current?.focus();
    }
  }, [state.diagnostic, state.downloadFailure]);

  const pendingReadOperations = () => readOperations.filter(
    (operation) => Boolean(stateRef.current.activeRequests[operation]),
  );

  const restartReadOperation = (operation: AdminDurableReviewReadOperation) => {
    switch (operation) {
      case "campaigns":
        return loadCampaigns();
      case "queue":
        return loadQueue();
      case "detail":
        return loadDetail();
      case "winners":
        return loadWinners();
      case "artifacts":
        return loadArtifacts();
      case "artifactDetail":
        return loadArtifactDetail();
    }
  };

  const selectCampaign = (campaignId: string) => {
    const restartCampaigns = Boolean(stateRef.current.activeRequests.campaigns);
    abortAll();
    releaseObjectUrl();
    applyEvent({ campaignId: campaignId || null, type: "campaignSelected" });
    if (restartCampaigns) {
      void loadCampaigns();
    }
    if (campaignId) {
      void Promise.all([loadQueue(), loadWinners(), loadArtifacts()]);
    }
  };

  const selectParticipant = (participantId: string) => {
    const readsToRestart = pendingReadOperations().filter((operation) => operation !== "detail");
    abortAll();
    applyEvent({ participantId, type: "participantSelected" });
    void loadDetail();
    for (const operation of readsToRestart) {
      void restartReadOperation(operation);
    }
  };

  const changeQueueFilter = (queueState: string) => {
    const participantSelected = Boolean(stateRef.current.identity.selectedParticipantId);
    const readsToRestart = participantSelected
      ? pendingReadOperations().filter(
          (operation) => operation !== "detail" && operation !== "queue",
        )
      : [];

    if (participantSelected) {
      abortAll();
      applyEvent({ participantId: null, type: "participantSelected" });
    }
    applyEvent({ field: "queueState", type: "draftChanged", value: queueState });
    void loadQueue();
    for (const operation of readsToRestart) {
      void restartReadOperation(operation);
    }
  };

  const selectArtifact = (artifactId: string) => {
    const readsToRestart = pendingReadOperations().filter(
      (operation) => operation !== "artifactDetail",
    );
    abortAll();
    releaseObjectUrl();
    applyEvent({ artifactId, type: "artifactSelected" });
    void loadArtifactDetail();
    for (const operation of readsToRestart) {
      void restartReadOperation(operation);
    }
  };

  const selectDecision = (decision: "approved" | "needs_review" | "rejected") => {
    ambiguousDecisionAttemptRef.current = null;
    applyEvent({ field: "decision", type: "draftChanged", value: decision });
    applyEvent({
      field: "reasonCode",
      type: "draftChanged",
      value: reasonCodes[decision][0],
    });
  };

  const requestDecisionConfirmation = (initiator: HTMLButtonElement) => {
    const current = stateRef.current;
    const { selectedCampaignId, selectedParticipantId } = current.identity;
    const detail = readValue<AdminReviewDetailData>(current.reads.detail.current);
    const activeSession = sessionRef.current;
    if (
      !selectAdminDurableReviewCapabilities(current).canDecide
      || !current.draft.decisionExplicitlySelected
      || !activeSession
      || !selectedCampaignId
      || !selectedParticipantId
      || !detail
    ) {
      return;
    }
    const input: DecisionIdempotencyInput = {
      campaignId: selectedCampaignId,
      decision: current.draft.decision,
      note: current.draft.decisionNote.trim(),
      operatorAddress: activeSession.address,
      participantId: selectedParticipantId,
      reasonCode: current.draft.reasonCode,
      snapshotFingerprint: detail.snapshot.fingerprint,
    };
    const ambiguousAttempt = ambiguousDecisionAttemptRef.current;
    const retryAttempt = ambiguousAttempt
      && decisionPayloadIdentity(ambiguousAttempt) === decisionPayloadIdentity(input)
      ? ambiguousAttempt
      : null;
    if (!retryAttempt) {
      ambiguousDecisionAttemptRef.current = null;
    }
    confirmationInitiatorRef.current = initiator;
    confirmationRestorePendingRef.current = false;
    setDecisionConfirmation({
      ...input,
      attemptNonce: retryAttempt?.attemptNonce ?? createDecisionAttemptNonce() ?? "",
    });
  };

  const submitDecision = async (confirmation: DecisionAttempt) => {
    closeDecisionConfirmation();
    const current = stateRef.current;
    const { selectedCampaignId, selectedParticipantId } = current.identity;
    const detail = readValue<AdminReviewDetailData>(current.reads.detail.current);
    const activeSession = sessionRef.current;
    if (
      !selectAdminDurableReviewCapabilities(current).canDecide
      || !activeSession
      || selectedCampaignId !== confirmation.campaignId
      || selectedParticipantId !== confirmation.participantId
      || !detail
      || detail.snapshot.fingerprint !== confirmation.snapshotFingerprint
      || activeSession.address !== confirmation.operatorAddress
      || !current.draft.decisionExplicitlySelected
      || current.draft.decision !== confirmation.decision
      || current.draft.reasonCode !== confirmation.reasonCode
      || current.draft.decisionNote.trim() !== confirmation.note
    ) {
      ambiguousDecisionAttemptRef.current = null;
      return;
    }
    const { controller, token } = beginRequest("decision");
    try {
      const idempotencyKey = await createDecisionIdempotencyKey(confirmation);
      if (controller.signal.aborted) {
        return;
      }
      if (!idempotencyKey) {
        const before = stateRef.current;
        const next = applyEvent({
          failure: {
            code: "ADMIN_IDEMPOTENCY_CRYPTO_UNAVAILABLE",
            reconnectRequired: false,
            retryable: false,
            traceId: `admin-ui-decision-${token.epoch}-${token.sequence}`,
          },
          token,
          type: "requestFailed",
        });
        if (next !== before) {
          ambiguousDecisionAttemptRef.current = null;
          confirmationInitiatorRef.current = null;
          confirmationRestorePendingRef.current = false;
        }
        return;
      }
      const result = await bridgeRef.current.submitDecision(
        confirmation.campaignId,
        confirmation.participantId,
        {
          decision: confirmation.decision,
          idempotencyKey,
          ...(confirmation.note ? { note: confirmation.note } : {}),
          reasonCode: confirmation.reasonCode,
          snapshotFingerprint: confirmation.snapshotFingerprint,
        },
        requestContext("decision", token, controller),
      );
      if (!result.ok) {
        const before = stateRef.current;
        const next = applyEvent({ failure: workflowFailure(result), token, type: "requestFailed" });
        if (next !== before) {
          ambiguousDecisionAttemptRef.current = result.retryable ? confirmation : null;
          confirmationInitiatorRef.current = null;
          confirmationRestorePendingRef.current = false;
        }
        return;
      }
      const before = stateRef.current;
      const next = applyEvent({ receipt: result.data, token, type: "decisionSucceeded" });
      if (next !== before) {
        ambiguousDecisionAttemptRef.current = null;
        consumeRefresh("queue", loadQueue);
        consumeRefresh("detail", loadDetail);
        consumeRefresh("winners", loadWinners);
      }
    } finally {
      finishRequest("decision", controller);
    }
  };

  const generateArtifact = async () => {
    const current = stateRef.current;
    const { selectedCampaignId } = current.identity;
    const winners = readValue<AdminWinnerListData>(current.reads.winners.current);
    const activeSession = sessionRef.current;
    if (
      !selectAdminDurableReviewCapabilities(current).canGenerate
      || !activeSession
      || !selectedCampaignId
      || !winners
    ) {
      return;
    }
    const { controller, token } = beginRequest("generate");
    try {
      const result = await bridgeRef.current.generateArtifact(
        selectedCampaignId,
        {
          expectedSourceFingerprint: winners.sourceFingerprint,
          format: current.draft.artifactFormat,
        },
        requestContext("generate", token, controller),
      );
      if (!result.ok) {
        applyEvent({ failure: workflowFailure(result), token, type: "requestFailed" });
        return;
      }
      const before = stateRef.current;
      const next = applyEvent({ receipt: result.data, token, type: "generateSucceeded" });
      if (next !== before) {
        consumeRefresh("artifacts", loadArtifacts);
        consumeRefresh("winners", loadWinners);
      }
    } finally {
      finishRequest("generate", controller);
    }
  };

  const downloadArtifact = async (
    retryTarget?: AdminDurableReviewDownloadRetryTarget,
  ) => {
    const current = stateRef.current;
    const { selectedArtifactId, selectedCampaignId } = current.identity;
    const detail = readValue<AdminArtifactDetailData>(current.reads.artifactDetail.current);
    const activeSession = sessionRef.current;
    const target = retryTarget ?? (selectedCampaignId && selectedArtifactId && detail
      ? {
          ...current.identity,
          epoch: current.epoch,
          expectedContentHash: detail.artifact.contentHash,
          operation: "download" as const,
        }
      : null);
    if (
      !selectAdminDurableReviewCapabilities(current).canDownload
      || !activeSession
      || !selectedCampaignId
      || !selectedArtifactId
      || !detail
      || !target
      || target.epoch !== current.epoch
      || target.sessionKey !== current.identity.sessionKey
      || target.selectedCampaignId !== selectedCampaignId
      || target.selectedParticipantId !== current.identity.selectedParticipantId
      || target.selectedArtifactId !== selectedArtifactId
      || detail.artifact.campaignId !== selectedCampaignId
      || detail.artifact.artifactId !== selectedArtifactId
      || detail.artifact.contentHash !== target.expectedContentHash
    ) {
      return;
    }
    const { controller, token } = beginRequest("download", {
      expectedContentHash: target.expectedContentHash,
    });
    try {
      const result = await bridgeRef.current.downloadArtifact(
        target.selectedCampaignId,
        target.selectedArtifactId,
        requestContext("download", token, controller),
        { expectedContentHash: target.expectedContentHash },
      );
      if (!result.ok) {
        applyEvent({ failure: workflowFailure(result), token, type: "requestFailed" });
        return;
      }
      if (
        !mountedRef.current
        || controller.signal.aborted
        || !selectAdminDurableReviewRequestActive(stateRef.current, token)
      ) {
        return;
      }
      const download = readValue<AdminArtifactDownloadData>(result.data);
      const byteView = download?.bytes;
      if (
        !download
        || !byteView
        || !ArrayBuffer.isView(byteView)
        || Object.prototype.toString.call(byteView) !== "[object Uint8Array]"
        || typeof URL.createObjectURL !== "function"
      ) {
        applyEvent({
          failure: {
            code: "BRIDGE_DOWNLOAD_UNAVAILABLE",
            reconnectRequired: false,
            retryable: false,
            traceId: result.traceId,
          },
          token,
          type: "requestFailed",
        });
        return;
      }
      let anchor: HTMLAnchorElement | null = null;
      let handoffSucceeded = false;
      try {
        releaseObjectUrl();
        const url = URL.createObjectURL(new Blob([download.bytes as BlobPart], {
          type: download.mimeType,
        }));
        objectUrlRef.current = url;
        anchor = document.createElement("a");
        anchor.download = download.fileName;
        anchor.href = url;
        anchor.hidden = true;
        document.body.append(anchor);
        anchor.click();
        applyEvent({ token, type: "downloadSucceeded" });
        handoffSucceeded = true;
      } catch {
        applyEvent({
          failure: {
            code: "BRIDGE_DOWNLOAD_UNAVAILABLE",
            reconnectRequired: false,
            retryable: false,
            traceId: result.traceId,
          },
          token,
          type: "requestFailed",
        });
      } finally {
        try {
          anchor?.remove();
        } catch {
          // The temporary node is detached best-effort after the download handoff.
        }
        if (handoffSucceeded) {
          scheduleObjectUrlRelease();
        } else {
          releaseObjectUrl();
        }
      }
    } finally {
      finishRequest("download", controller);
    }
  };

  const retryFailedRequest = (operation: AdminDurableReviewOperation) => {
    const target = selectAdminDurableReviewRetryTarget(stateRef.current, operation);
    if (!target) {
      return;
    }
    if (target.operation === "download") {
      void downloadArtifact(target);
      return;
    }
    void restartReadOperation(target.operation);
  };

  const refreshWorkspace = () => {
    void loadCampaigns();
    if (stateRef.current.identity.selectedCampaignId) {
      void Promise.all([loadQueue(), loadWinners(), loadArtifacts()]);
    }
    if (stateRef.current.identity.selectedParticipantId) {
      void loadDetail();
    }
    if (stateRef.current.identity.selectedArtifactId) {
      void loadArtifactDetail();
    }
  };

  const campaigns = readValue<AdminCampaignListData>(state.reads.campaigns.current)?.campaigns ?? [];
  const queue = readValue<AdminReviewQueueData>(state.reads.queue.current);
  const detail = readValue<AdminReviewDetailData>(state.reads.detail.current);
  const winners = readValue<AdminWinnerListData>(state.reads.winners.current);
  const artifacts = readValue<AdminArtifactListData>(state.reads.artifacts.current)?.artifacts ?? [];
  const artifactDetail = readValue<AdminArtifactDetailData>(state.reads.artifactDetail.current);
  const winnerSourceFingerprint = winners?.sourceFingerprint ?? null;
  const artifactDetailFreshness = artifactDetail
    ? artifactFreshness(artifactDetail.artifact, winnerSourceFingerprint)
    : null;
  const diagnosticRetryOperation = state.diagnostic?.retryTarget?.operation ?? null;
  const capabilities = selectAdminDurableReviewCapabilities(state);
  const reconnectActionRequired = !sessionKey || state.status === "reconnect";

  useEffect(() => {
    ambiguousDecisionAttemptRef.current = null;
    confirmationInitiatorRef.current = null;
    confirmationRestorePendingRef.current = false;
    setDecisionConfirmation(null);
  }, [
    detail?.snapshot.fingerprint,
    sessionKey,
    state.identity.selectedCampaignId,
    state.identity.selectedParticipantId,
  ]);

  useEffect(() => {
    if (!decisionConfirmation) {
      return;
    }
    confirmationCancelRef.current?.focus();
    const containModalFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDecisionConfirmation();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = confirmationRef.current;
      if (!dialog) {
        return;
      }
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(modalFocusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", containModalFocus);
    return () => document.removeEventListener("keydown", containModalFocus);
  }, [closeDecisionConfirmation, decisionConfirmation]);

  useEffect(() => {
    if (decisionConfirmation || !confirmationRestorePendingRef.current) {
      return;
    }
    const initiator = confirmationInitiatorRef.current;
    if (!initiator?.isConnected) {
      confirmationInitiatorRef.current = null;
      confirmationRestorePendingRef.current = false;
      return;
    }
    if (!initiator.disabled && capabilities.canDecide) {
      initiator.focus();
      confirmationInitiatorRef.current = null;
      confirmationRestorePendingRef.current = false;
    }
  }, [capabilities.canDecide, decisionConfirmation]);

  useEffect(() => {
    const participantId = state.identity.selectedParticipantId;
    if (!participantId) {
      focusedParticipantRef.current = null;
      return;
    }
    if (detail && focusedParticipantRef.current !== participantId) {
      focusedParticipantRef.current = participantId;
      detailHeadingRef.current?.focus();
    }
  }, [detail, state.identity.selectedParticipantId]);

  const statusLabel = state.status === "ready"
    ? copy.durableReady
    : state.status === "degraded"
      ? copy.durableDegraded
      : state.status === "loading"
        ? copy.durableLoading
        : state.status === "command_pending"
          ? copy.durablePending
          : state.status === "reconnect" || state.status === "no_session"
            ? copy.durableReconnect
            : copy.durableBlocked;

  return (
    <section aria-labelledby="admin-durable-review-title" className="admin-durable-workspace">
      <header className="admin-durable-workspace__header">
        <div>
          <h2 id="admin-durable-review-title">{copy.durableReviewTitle}</h2>
          <p aria-live="polite" className={`admin-durable-status admin-durable-status--${state.status}`}>
            {statusLabel}
          </p>
        </div>
        {reconnectActionRequired ? (
          onReconnect ? (
            <button className="admin-durable-command" onClick={onReconnect} type="button">
              {copy.durableConnect}
            </button>
          ) : null
        ) : sessionKey ? (
          <button
            aria-label={copy.durableRefresh}
            className="admin-durable-icon-button"
            onClick={refreshWorkspace}
            title={copy.durableRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={18} />
          </button>
        ) : null}
      </header>

      {state.diagnostic ? (
        <div
          className="admin-durable-diagnostic"
          ref={diagnosticRef}
          role="alert"
          tabIndex={-1}
        >
          <ShieldAlert aria-hidden="true" size={18} />
          <span>{state.diagnostic.code}</span>
          <code>{state.diagnostic.traceId}</code>
          {diagnosticRetryOperation ? (
            <button
              className="admin-durable-diagnostic__retry"
              onClick={() => retryFailedRequest(diagnosticRetryOperation)}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              {copy.durableRetryRequest}
            </button>
          ) : null}
        </div>
      ) : null}

      {state.downloadFailure ? (
        <div
          className="admin-durable-diagnostic admin-durable-diagnostic--download"
          ref={downloadDiagnosticRef}
          role="alert"
          tabIndex={-1}
        >
          <FileDown aria-hidden="true" size={18} />
          <span>{state.downloadFailure.code}</span>
          <code>{state.downloadFailure.traceId}</code>
          {state.downloadFailure.retryTarget?.operation === "download" ? (
            <button
              className="admin-durable-diagnostic__retry"
              onClick={() => retryFailedRequest("download")}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={16} />
              {copy.durableRetryDownload}
            </button>
          ) : null}
        </div>
      ) : null}

      {!sessionKey ? null : (
        <>
          <div className="admin-durable-toolbar">
            <label>
              <span>{copy.durableCampaign}</span>
              <select
                aria-label={copy.durableCampaign}
                onChange={(event) => selectCampaign(event.currentTarget.value)}
                value={state.identity.selectedCampaignId ?? ""}
              >
                <option value="">{copy.durableSelectCampaign}</option>
                {campaigns.map((item) => (
                  <option key={item.campaignId} value={item.campaignId}>
                    {item.campaignId} ({item.status})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{copy.durableQueueFilter}</span>
              <select
                aria-label={copy.durableQueueFilter}
                disabled={!state.identity.selectedCampaignId}
                onChange={(event) => changeQueueFilter(event.currentTarget.value)}
                value={state.draft.queueState}
              >
                <option value="all">{copy.durableAllStates}</option>
                <option value="pending_review">{copy.durablePending}</option>
                <option value="approved_current">{copy.durableApprove}</option>
                <option value="rejected_current">{copy.durableReject}</option>
                <option value="needs_review_current">{copy.durableNeedsReview}</option>
                <option value="stale">{copy.durableStale}</option>
              </select>
            </label>
          </div>

          {state.reads.campaigns.status === "ready" && campaigns.length === 0 ? (
            <p className="admin-durable-empty">{copy.durableNoCampaigns}</p>
          ) : null}

          {state.identity.selectedCampaignId ? (
            <div className="admin-durable-review-grid">
              <section aria-labelledby="admin-durable-queue-title" className="admin-durable-queue">
                <div className="admin-durable-section-heading">
                  <h3 id="admin-durable-queue-title">{copy.durableReviewQueue}</h3>
                  <span>{queue?.summary.total ?? queue?.items.length ?? 0}</span>
                </div>
                <div className="admin-durable-queue__items">
                  {queue?.items.map((item) => (
                    <button
                      aria-pressed={state.identity.selectedParticipantId === item.participantId}
                      className="admin-durable-queue-row"
                      key={item.participantId}
                      onClick={() => selectParticipant(item.participantId)}
                      type="button"
                    >
                      <span>
                        <strong>{item.participantId}</strong>
                        <small>{item.walletAddress}</small>
                        <small>{copy.durableRank}: {item.rank ?? "-"}</small>
                        <small>{item.eligible ? copy.durableEligible : copy.durableIneligible}</small>
                        <small>
                          {copy.durableCoverage}: {item.coverage.completedTasks}/{item.coverage.requiredTasks}
                          {` · ${item.coverage.evidenceCount} ${copy.durableEvidence}`}
                        </small>
                        <small title={item.riskFlags.join(", ")}>
                          {copy.durableRisk}: {item.riskFlags.length > 0
                            ? item.riskFlags.join(", ")
                            : copy.durableNoRisk}
                        </small>
                      </span>
                      <span>
                        <b>{item.totalPoints}</b>
                        <small>{copy.durablePoints}</small>
                      </span>
                      <span className={`admin-durable-state admin-durable-state--${item.reviewState}`}>
                        {item.reviewState.replace(/_/g, " ")}
                      </span>
                    </button>
                  ))}
                  {queue && queue.items.length === 0 ? (
                    <p className="admin-durable-empty">{copy.durableNoReviews}</p>
                  ) : null}
                </div>
              </section>

              <section aria-labelledby="admin-durable-detail-title" className="admin-durable-detail">
                <h3 id="admin-durable-detail-title" ref={detailHeadingRef} tabIndex={-1}>
                  {copy.durableParticipantDetail}
                </h3>
                {!detail ? (
                  <p className="admin-durable-empty">{copy.durableSelectParticipant}</p>
                ) : (
                  <>
                    <dl className="admin-durable-facts">
                      <div><dt>Participant</dt><dd>{detail.participantId}</dd></div>
                      <div><dt>{copy.durableCurrent}</dt><dd>{detail.reviewState.replace(/_/g, " ")}</dd></div>
                      <div className="admin-durable-facts__wide">
                        <dt>Fingerprint</dt><dd><code>{detail.snapshot.fingerprint}</code></dd>
                      </div>
                    </dl>
                    <div className="admin-durable-evidence-grid">
                      <div>
                        <h4>Tasks</h4>
                        {detail.snapshot.tasks.map((item, index) => {
                          const value = safeSnapshotField(item, ["id", "taskId"]);
                          return <code key={`${value}:${index}`}>{value}</code>;
                        })}
                      </div>
                      <div>
                        <h4>{copy.durableCompletions}</h4>
                        {detail.snapshot.completions.map((item, index) => {
                          const value = safeSnapshotField(item, ["id", "taskId"]);
                          return (
                            <span key={`${value}:${index}`}>
                              {safeSnapshotDetails(item, ["id", "taskId", "status"]).map((line) => (
                                <code key={line}>{line}</code>
                              ))}
                            </span>
                          );
                        })}
                      </div>
                      <div>
                        <h4>{copy.durableEvidence}</h4>
                        {detail.snapshot.evidence.map((item, index) => {
                          const value = safeSnapshotField(item, ["evidenceHash", "id"]);
                          return (
                            <span key={`${value}:${index}`}>
                              {[
                                ...safeSnapshotDetails(item, [
                                  "id",
                                  "taskId",
                                  "evidenceHash",
                                  "evidenceRef",
                                ]),
                                ...safeSnapshotDiagnosticDetails(item),
                              ].map((line, detailIndex) => (
                                <code key={`${line}:${detailIndex}`}>{line}</code>
                              ))}
                            </span>
                          );
                        })}
                      </div>
                      <div>
                        <h4>{copy.durableHistory}</h4>
                        {detail.history.length === 0 ? <span>0</span> : detail.history.map((item, index) => (
                          <span key={item.decisionId ?? index}>{item.decision} v{item.version}</span>
                        ))}
                      </div>
                    </div>
                    <div className="admin-durable-decision">
                      <div aria-label={copy.durableDecision} className="admin-durable-segments" role="group">
                        <button
                          aria-pressed={state.draft.decisionExplicitlySelected
                            && state.draft.decision === "approved"}
                          onClick={() => selectDecision("approved")}
                          type="button"
                        ><Check aria-hidden="true" size={16} />{copy.durableApprove}</button>
                        <button
                          aria-pressed={state.draft.decisionExplicitlySelected
                            && state.draft.decision === "rejected"}
                          onClick={() => selectDecision("rejected")}
                          type="button"
                        ><X aria-hidden="true" size={16} />{copy.durableReject}</button>
                        <button
                          aria-pressed={state.draft.decisionExplicitlySelected
                            && state.draft.decision === "needs_review"}
                          onClick={() => selectDecision("needs_review")}
                          type="button"
                        ><AlertTriangle aria-hidden="true" size={16} />{copy.durableNeedsReview}</button>
                      </div>
                      <label>
                        <span>{copy.durableReason}</span>
                        <select
                          disabled={!state.draft.decisionExplicitlySelected}
                          onChange={(event) => {
                            ambiguousDecisionAttemptRef.current = null;
                            applyEvent({
                              field: "reasonCode",
                              type: "draftChanged",
                              value: event.currentTarget.value,
                            });
                          }}
                          value={state.draft.reasonCode}
                        >
                          {reasonCodes[state.draft.decision].map((reason) => (
                            <option key={reason} value={reason}>{reason.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{copy.durableNote}</span>
                        <textarea
                          aria-label={copy.durableNote}
                          disabled={!state.draft.decisionExplicitlySelected}
                          maxLength={1_000}
                          onChange={(event) => {
                            ambiguousDecisionAttemptRef.current = null;
                            applyEvent({
                              field: "decisionNote",
                              type: "draftChanged",
                              value: event.currentTarget.value,
                            });
                          }}
                          rows={3}
                          value={state.draft.decisionNote}
                        />
                      </label>
                      <button
                        className="admin-durable-command"
                        disabled={!capabilities.canDecide}
                        onClick={(event) => requestDecisionConfirmation(event.currentTarget)}
                        type="button"
                      >
                        <Check aria-hidden="true" size={17} />
                        {copy.durableSubmit}
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          ) : null}

          {state.identity.selectedCampaignId ? (
            <section aria-labelledby="admin-durable-artifacts-title" className="admin-durable-artifact-workflow">
              <div className="admin-durable-section-heading">
                <div>
                  <h3 id="admin-durable-artifacts-title">{copy.durableArtifacts}</h3>
                  <p>{copy.durableWinners}: {winners?.rows.length ?? 0}</p>
                </div>
                <div aria-label="Artifact format" className="admin-durable-segments" role="group">
                  {(["csv", "json"] as const).map((format) => (
                    <button
                      aria-pressed={state.draft.artifactFormat === format}
                      key={format}
                      onClick={() => applyEvent({ field: "artifactFormat", type: "draftChanged", value: format })}
                      type="button"
                    >
                      {format === "csv" ? copy.durableCsv : copy.durableJson}
                    </button>
                  ))}
                </div>
                <button
                  className="admin-durable-command"
                  disabled={!capabilities.canGenerate}
                  onClick={() => void generateArtifact()}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={17} />
                  {copy.durableGenerate}
                </button>
              </div>
              {winners ? (
                <div className="admin-durable-winner-summary">
                  <p className="admin-durable-fingerprint">
                    {copy.durableSourceFingerprint}: <code>{winners.sourceFingerprint}</code>
                  </p>
                  <div>
                    {winners.rows.slice(0, 5).map((row) => (
                      <span key={row.participantId}>
                        <b>#{row.rank ?? "-"}</b>
                        <code>{row.participantId}</code>
                        <small>{row.totalPoints} {copy.durablePoints}</small>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="admin-durable-artifact-grid">
                <div className="admin-durable-artifact-list">
                  {artifacts.map((item) => {
                    const freshness = artifactFreshness(item, winnerSourceFingerprint);
                    return (
                      <button
                        aria-pressed={state.identity.selectedArtifactId === item.artifactId}
                        key={item.artifactId}
                        onClick={() => selectArtifact(item.artifactId)}
                        type="button"
                      >
                        <strong>{item.artifactId}</strong>
                        <span>{item.format.toUpperCase()} · {item.rowCount} {copy.durableRows}</span>
                        {freshness ? (
                          <span className={`admin-durable-artifact-state admin-durable-artifact-state--${freshness}`}>
                            {freshness === "current"
                              ? copy.durableArtifactCurrent
                              : copy.durableArtifactStale}
                          </span>
                        ) : null}
                        <code>{item.contentHash}</code>
                      </button>
                    );
                  })}
                </div>
                <div className="admin-durable-artifact-detail">
                  <h4>{copy.durableArtifactDetail}</h4>
                  {!artifactDetail ? (
                    <p className="admin-durable-empty">{copy.durableSelectArtifact}</p>
                  ) : (
                    <>
                      <strong>{artifactDetail.artifact.fileName}</strong>
                      {artifactDetailFreshness ? (
                        <span className={`admin-durable-artifact-state admin-durable-artifact-state--${artifactDetailFreshness}`}>
                          {artifactDetailFreshness === "current"
                            ? copy.durableArtifactCurrent
                            : copy.durableArtifactStale}
                        </span>
                      ) : null}
                      <dl className="admin-durable-facts">
                        <div><dt>{copy.durableRows}</dt><dd>{artifactDetail.artifact.rowCount}</dd></div>
                        <div><dt>{copy.durableBytes}</dt><dd>{artifactDetail.artifact.contentBytes}</dd></div>
                        <div><dt>{copy.durableFormat}</dt><dd>{artifactDetail.artifact.format.toUpperCase()}</dd></div>
                        <div><dt>{copy.durableCreated}</dt><dd>{artifactDetail.artifact.createdAt}</dd></div>
                        <div className="admin-durable-facts__wide">
                          <dt>{copy.durableCreator}</dt>
                          <dd>{artifactDetail.artifact.creatorSubject} ({artifactDetail.artifact.creatorRole})</dd>
                        </div>
                        <div className="admin-durable-facts__wide">
                          <dt>{copy.durableContentHash}</dt>
                          <dd><code>{artifactDetail.artifact.contentHash}</code></dd>
                        </div>
                        <div className="admin-durable-facts__wide">
                          <dt>{copy.durableSourceFingerprint}</dt>
                          <dd><code>{artifactDetail.artifact.sourceFingerprint}</code></dd>
                        </div>
                      </dl>
                      <button
                        aria-label={copy.durableDownload}
                        className="admin-durable-icon-button"
                        disabled={!capabilities.canDownload}
                        onClick={() => void downloadArtifact()}
                        title={copy.durableDownload}
                        type="button"
                      >
                        <FileDown aria-hidden="true" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
      {decisionConfirmation && sessionKey ? (
        <div className="admin-durable-confirmation-backdrop">
          <div
            aria-describedby="admin-durable-confirmation-warning"
            aria-labelledby="admin-durable-confirmation-title"
            aria-modal="true"
            className="admin-durable-confirmation"
            ref={confirmationRef}
            role="dialog"
            tabIndex={-1}
          >
            <h3 id="admin-durable-confirmation-title">{copy.durableConfirmDecision}</h3>
            <p id="admin-durable-confirmation-warning">
              <AlertTriangle aria-hidden="true" size={18} />
              {copy.durableAppendOnlyWarning}
            </p>
            <dl className="admin-durable-facts">
              <div>
                <dt>{copy.durableCampaign}</dt>
                <dd>{decisionConfirmation.campaignId}</dd>
              </div>
              <div>
                <dt>{copy.durableParticipant}</dt>
                <dd>{decisionConfirmation.participantId}</dd>
              </div>
              <div>
                <dt>{copy.durableDecision}</dt>
                <dd>{decisionConfirmation.decision.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt>{copy.durableReason}</dt>
                <dd>{decisionConfirmation.reasonCode}</dd>
              </div>
              <div className="admin-durable-facts__wide">
                <dt>{copy.durableFingerprint}</dt>
                <dd><code>{decisionConfirmation.snapshotFingerprint}</code></dd>
              </div>
              {decisionConfirmation.note ? (
                <div className="admin-durable-facts__wide">
                  <dt>{copy.durableNote}</dt>
                  <dd>{decisionConfirmation.note}</dd>
                </div>
              ) : null}
            </dl>
            <div className="admin-durable-confirmation__actions">
              <button
                className="admin-durable-confirmation__cancel"
                onClick={closeDecisionConfirmation}
                ref={confirmationCancelRef}
                type="button"
              >
                {copy.durableCancel}
              </button>
              <button
                className="admin-durable-command"
                disabled={!capabilities.canDecide}
                onClick={() => void submitDecision(decisionConfirmation)}
                type="button"
              >
                <Check aria-hidden="true" size={17} />
                {copy.durableConfirmAndSubmit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
