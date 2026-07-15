import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AdminArtifactDownloadData,
  AdminArtifactMetadata,
  AdminCampaignListData,
  AdminCampaignSummary,
  AdminDecisionReceiptData,
  AdminDurableReviewApiBridge,
  AdminDurableReviewRequestContext,
  AdminDurableReviewResult,
  AdminRepositoryMetadata,
  AdminReviewQueueData,
  AdminReviewQueueItem,
  AdminWinnerListData,
} from "../../../api/adminDurableReviewApiBridge";
import type { NormalizedWalletSession } from "../../../domain/types";
import { AdminDurableReviewWorkspace } from "./AdminDurableReviewWorkspace";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

const session = (
  suffix = "A",
  overrides: Partial<NormalizedWalletSession> = {},
): NormalizedWalletSession => ({
  accountType: "EOA",
  address: `2F4AdminOperator${suffix}`,
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-07-15T00:00:00.000Z",
  displayAddress: `2F4A...${suffix}`,
  id: `wallet-session-admin-${suffix}`,
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: `issuer-admin-${suffix}`,
    ttlSeconds: 900,
    valid: true,
  },
  lastSeenAt: "2026-07-15T00:00:00.000Z",
  network: "testnet",
  normalUserRecommended: true,
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: `sess-admin-${suffix}`,
  signatureStatus: "signed",
  statusMessage: { "en-US": "Connected", "zh-CN": "Connected" },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
  ...overrides,
});

const success = <T,>(data: T, httpStatus = 200) => ({
  data,
  httpStatus,
  ok: true as const,
  traceId: "trace-admin-workspace",
});

const activateByKeyboard = (element: HTMLElement, key: " " | "Enter") => {
  element.focus();
  fireEvent.keyDown(element, { code: key === " " ? "Space" : "Enter", key });
  fireEvent.click(element, { detail: 0 });
  fireEvent.keyUp(element, { code: key === " " ? "Space" : "Enter", key });
};

const changeSelectByKeyboard = (
  element: HTMLSelectElement,
  value: string,
  key: " " | "Enter",
) => {
  element.focus();
  fireEvent.keyDown(element, { code: key === " " ? "Space" : "Enter", key });
  fireEvent.change(element, { target: { value } });
  fireEvent.keyUp(element, { code: key === " " ? "Space" : "Enter", key });
};

const campaign: AdminCampaignSummary = {
  campaignId: "campaign-admin-01",
  ownerAddress: "2F4CampaignOwner",
  participantCount: 1,
  projectId: "project-admin-01",
  status: "live",
  taskCount: 2,
};

const queueItem: AdminReviewQueueItem = {
  campaignId: campaign.campaignId,
  coverage: {
    completedTasks: 2,
    evidenceCount: 2,
    requiredTasks: 2,
    totalTasks: 2,
  },
  currentDecision: null,
  currentFingerprint: SHA_A,
  eligible: true,
  participantId: "participant-admin-01",
  rank: 1,
  reviewState: "pending_review",
  riskFlags: [],
  totalPoints: 200,
  walletAddress: "2F4Participant",
};

const artifact: AdminArtifactMetadata = {
  artifactId: "artifact-admin-01",
  campaignId: campaign.campaignId,
  contentBytes: 64,
  contentHash: SHA_B,
  createdAt: "2026-07-15T01:00:00.000Z",
  creatorRole: "review_operator",
  creatorSubject: "2F4AdminOperatorA",
  fileName: "campaign-admin-01-aabbccdd.csv",
  format: "csv",
  mimeType: "text/csv;charset=utf-8",
  rowCount: 1,
  sourceFingerprint: SHA_C,
  sourceVersion: "artifact-source-v1",
  traceId: "trace-artifact",
};

const repository: AdminRepositoryMetadata = {
  adapterId: "campaign-db-postgresql-adapter",
  durable: true,
  repositoryId: "campaign-db-runtime",
  storeId: "campaign-db",
};

const createBridge = () => {
  const bridge: AdminDurableReviewApiBridge = {
    listCampaigns: vi.fn(async () => success({
      campaigns: [campaign],
      repository,
    })),
    listReviews: vi.fn(async () => success({
      campaignId: campaign.campaignId,
      items: [queueItem],
      summary: {
        approvedCurrent: 0,
        needsReviewCurrent: 0,
        pendingReview: 1,
        rejectedCurrent: 0,
        stale: 0,
        total: 1,
      },
    })),
    getReviewDetail: vi.fn(async () => success({
      campaignId: campaign.campaignId,
      currentDecision: null,
      history: [],
      participantId: queueItem.participantId,
      reviewState: "pending_review" as const,
      snapshot: {
        campaignId: campaign.campaignId,
        completions: [{ id: "completion-01", taskId: "task-01" }],
        evidence: [{
          diagnosticCodes: ["MANUAL_REVIEW", "RISK_FLAG"],
          evidenceHash: SHA_B,
          evidenceRef: "aelfscan:tx-1",
          id: "evidence-01",
          taskId: "task-01",
        }, {
          diagnosticCodes: ["SAFE_CODE", `UNSAFE_${"x".repeat(256)}`],
          evidenceHash: "f".repeat(64),
          evidenceRef: `unsafe-${"x".repeat(4_096)}`,
          id: "evidence-unsafe",
          taskId: "task-02",
        }],
        fingerprint: SHA_A,
        fingerprintVersion: "review-snapshot-v1" as const,
        participantId: queueItem.participantId,
        tasks: [{ id: "task-01" }, { id: "task-02" }],
      },
    })),
    submitDecision: vi.fn(async () => success({
      campaignId: campaign.campaignId,
      created: true,
      decisionId: "decision-admin-01",
      participantId: queueItem.participantId,
      snapshotFingerprint: SHA_A,
      version: 1,
    }, 201)),
    listWinners: vi.fn(async () => success({
      campaignId: campaign.campaignId,
      rows: [{
        campaignId: campaign.campaignId,
        decisionId: "decision-admin-01",
        decisionVersion: 1,
        evidenceHashes: [SHA_B],
        participantId: queueItem.participantId,
        rank: 1,
        snapshotFingerprint: SHA_A,
        totalPoints: 200,
        walletAddress: queueItem.walletAddress,
      }],
      sourceFingerprint: SHA_C,
      sourceVersion: "artifact-source-v1" as const,
    })),
    generateArtifact: vi.fn(async () => success({ artifact, created: true }, 201)),
    listArtifacts: vi.fn(async () => success({
      artifacts: [artifact],
      campaignId: campaign.campaignId,
    })),
    getArtifactDetail: vi.fn(async () => success({
      artifact,
      sourceManifest: { rows: [], version: "artifact-source-v1" },
    })),
    downloadArtifact: vi.fn(async () => success({
      bytes: new TextEncoder().encode("campaignId,participantId\n"),
      contentBytes: 25,
      contentHash: SHA_B,
      fileName: artifact.fileName,
      mimeType: artifact.mimeType,
    })),
  };

  return bridge;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminDurableReviewWorkspace", () => {
  it("stays fail-closed without an API-issued session", () => {
    const bridge = createBridge();
    const onReconnect = vi.fn();

    render(
      <AdminDurableReviewWorkspace
        bridge={bridge}
        locale="en-US"
        onReconnect={onReconnect}
        session={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Durable Evidence Review" })).toBeInTheDocument();
    expect(screen.getByText("Reconnect required")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect issued wallet" }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(bridge.listCampaigns).not.toHaveBeenCalled();
    expect(screen.queryByText(campaign.campaignId)).not.toBeInTheDocument();
  });

  it("runs queue, decision, winner, artifact, and exact-download workflows with one refresh each", async () => {
    const bridge = createBridge();
    const createObjectURL = vi.fn(() => "blob:admin-artifact");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      expect(revokeObjectURL).not.toHaveBeenCalled();
    });

    render(
      <AdminDurableReviewWorkspace
        bridge={bridge}
        locale="en-US"
        session={session()}
      />,
    );

    const campaignSelect = await screen.findByLabelText("Campaign");
    await waitFor(() => expect(within(campaignSelect).getByRole("option", {
      name: /campaign-admin-01/,
    })).toBeInTheDocument());
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });

    const participant = await screen.findByRole("button", { name: /participant-admin-01/ });
    expect(within(participant).getByText("Rank: 1")).toBeInTheDocument();
    expect(within(participant).getByText("Eligible")).toBeInTheDocument();
    expect(within(participant).getByText(/Coverage: 2\/2/)).toBeInTheDocument();
    expect(within(participant).getByText(/Risk: No risk flags/)).toBeInTheDocument();
    fireEvent.click(participant);
    expect(await screen.findByText(SHA_A)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Participant detail" })).toHaveFocus());
    expect(screen.getByText("id: completion-01")).toBeInTheDocument();
    expect(screen.getByText(`evidenceHash: ${SHA_B}`)).toBeInTheDocument();
    expect(screen.getByText("evidenceRef: aelfscan:tx-1")).toBeInTheDocument();
    expect(screen.getByText("diagnosticCodes: MANUAL_REVIEW")).toBeInTheDocument();
    expect(screen.getByText("diagnosticCodes: RISK_FLAG")).toBeInTheDocument();
    expect(screen.getByText("diagnosticCodes: SAFE_CODE")).toBeInTheDocument();
    expect(screen.queryByText(/UNSAFE_/)).not.toBeInTheDocument();
    expect(screen.queryByText(/unsafe-x{20}/)).not.toBeInTheDocument();
    expect(await screen.findByText("#1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Evidence verified." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit decision" }));

    const confirmation = screen.getByRole("dialog", { name: "Confirm decision" });
    expect(within(confirmation).getByText(campaign.campaignId)).toBeInTheDocument();
    expect(within(confirmation).getByText(queueItem.participantId)).toBeInTheDocument();
    expect(within(confirmation).getByText("evidence_verified")).toBeInTheDocument();
    expect(within(confirmation).getByText(SHA_A)).toBeInTheDocument();
    expect(bridge.submitDecision).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole("button", { name: "Confirm and submit" }));

    await waitFor(() => expect(bridge.submitDecision).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(bridge.listReviews).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(bridge.getReviewDetail).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "Generate artifact" }));
    await waitFor(() => expect(bridge.generateArtifact).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(bridge.listArtifacts).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(bridge.listWinners).toHaveBeenCalledTimes(2));

    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-01/ }));
    await waitFor(() => expect(bridge.getArtifactDetail).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/2F4AdminOperatorA \(review_operator\)/)).toBeInTheDocument();
    expect(screen.getByText(artifact.createdAt)).toBeInTheDocument();
    expect(screen.getAllByText(SHA_C).length).toBeGreaterThan(0);
    expect(within(screen.getByRole("button", { name: /artifact-admin-01/ }))
      .getByText("Current artifact")).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Artifact detail" }).parentElement!)
      .getByText("Current artifact")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Download artifact" }));

    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(click).toHaveBeenCalledTimes(1);
    await waitFor(
      () => expect(revokeObjectURL).toHaveBeenCalledWith("blob:admin-artifact"),
      { timeout: 2_000 },
    );

    const decisionContext = vi.mocked(bridge.submitDecision).mock.calls[0]?.[3] as
      AdminDurableReviewRequestContext;
    expect(decisionContext.session?.sessionId).toBe("sess-admin-A");
    expect(decisionContext.signal).toBeInstanceOf(AbortSignal);
  });

  it("derives localized current and stale Artifact status only from exact source fingerprints", async () => {
    const staleArtifact: AdminArtifactMetadata = {
      ...artifact,
      artifactId: "artifact-admin-02",
      contentHash: "d".repeat(64),
      fileName: "campaign-admin-01-stale.json",
      format: "json",
      mimeType: "application/json;charset=utf-8",
      sourceFingerprint: SHA_A,
    };
    const bridge = createBridge();
    bridge.listArtifacts = vi.fn(async () => success({
      artifacts: [artifact, staleArtifact],
      campaignId: campaign.campaignId,
    }));
    bridge.getArtifactDetail = vi.fn(async (_campaignId, artifactId) => success({
      artifact: artifactId === staleArtifact.artifactId ? staleArtifact : artifact,
      sourceManifest: { rows: [], version: "artifact-source-v1" },
    }));

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="zh-CN" session={session()} />);
    const campaignSelect = await screen.findByLabelText("活动") as HTMLSelectElement;
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    changeSelectByKeyboard(campaignSelect, campaign.campaignId, "Enter");

    const currentRow = await screen.findByRole("button", { name: /artifact-admin-01/ });
    const staleRow = await screen.findByRole("button", { name: /artifact-admin-02/ });
    expect(within(currentRow).getByText("当前 Artifact")).toBeInTheDocument();
    expect(within(staleRow).getByText("已过期 Artifact")).toBeInTheDocument();

    activateByKeyboard(staleRow, " ");
    await waitFor(() => expect(bridge.getArtifactDetail).toHaveBeenLastCalledWith(
      campaign.campaignId,
      staleArtifact.artifactId,
      expect.any(Object),
    ));
    const artifactPanel = screen.getByRole("heading", { name: "Artifact 详情" }).parentElement;
    expect(artifactPanel).not.toBeNull();
    expect(within(artifactPanel!).getByText("已过期 Artifact")).toBeInTheDocument();
  });

  it("retries only the failed download with the selected Artifact validated expected hash", async () => {
    const bridge = createBridge();
    const retryableFailure: AdminDurableReviewResult<AdminArtifactDownloadData> = {
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      traceId: "trace-download-retry",
    };
    bridge.downloadArtifact = vi.fn<AdminDurableReviewApiBridge["downloadArtifact"]>()
      .mockResolvedValueOnce(retryableFailure)
      .mockResolvedValueOnce(success({
        bytes: new TextEncoder().encode("campaignId,participantId\n"),
        contentBytes: 25,
        contentHash: artifact.contentHash,
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
      }));
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:retried-admin-artifact"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign") as HTMLSelectElement;
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-01/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Download artifact" }));

    expect(await screen.findByText("trace-download-retry")).toBeInTheDocument();
    expect(screen.getByText("BRIDGE_REQUEST_TIMEOUT")).toBeInTheDocument();
    activateByKeyboard(screen.getByRole("button", { name: "Retry download" }), "Enter");
    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(2));

    expect(vi.mocked(bridge.downloadArtifact).mock.calls[0]?.[3]).toEqual({
      expectedContentHash: artifact.contentHash,
    });
    expect(vi.mocked(bridge.downloadArtifact).mock.calls[1]?.[3]).toEqual({
      expectedContentHash: artifact.contentHash,
    });
    expect(bridge.submitDecision).not.toHaveBeenCalled();
    expect(bridge.generateArtifact).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("trace-download-retry")).not.toBeInTheDocument());
  });

  it("routes simultaneous read and download retry controls to their own failed operations", async () => {
    const bridge = createBridge();
    const readFailure: AdminDurableReviewResult<AdminWinnerListData> = {
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      traceId: "trace-winners-retry",
    };
    const downloadFailure: AdminDurableReviewResult<AdminArtifactDownloadData> = {
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      traceId: "trace-download-retry",
    };
    bridge.listWinners = vi.fn<AdminDurableReviewApiBridge["listWinners"]>()
      .mockResolvedValueOnce(success({
        campaignId: campaign.campaignId,
        rows: [],
        sourceFingerprint: SHA_C,
        sourceVersion: "artifact-source-v1",
      }))
      .mockResolvedValueOnce(readFailure)
      .mockResolvedValueOnce(success({
        campaignId: campaign.campaignId,
        rows: [],
        sourceFingerprint: SHA_C,
        sourceVersion: "artifact-source-v1",
      }));
    bridge.downloadArtifact = vi.fn<AdminDurableReviewApiBridge["downloadArtifact"]>()
      .mockResolvedValueOnce(downloadFailure)
      .mockResolvedValueOnce(success({
        bytes: new TextEncoder().encode("campaignId,participantId\n"),
        contentBytes: 25,
        contentHash: artifact.contentHash,
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
      }));
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:simultaneous-retry"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-01/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Download artifact" }));
    expect(await screen.findByText("trace-download-retry")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh review workspace" }));
    expect(await screen.findByText("trace-winners-retry")).toBeInTheDocument();
    expect(screen.getByText("trace-download-retry")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry request" }));
    await waitFor(() => expect(bridge.listWinners).toHaveBeenCalledTimes(3));
    expect(bridge.downloadArtifact).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry download" }));
    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(2));
  });

  it("isolates a late download response from a newly selected Artifact", async () => {
    const artifactB: AdminArtifactMetadata = {
      ...artifact,
      artifactId: "artifact-admin-02",
      contentHash: "d".repeat(64),
      fileName: "campaign-admin-01-current-02.csv",
    };
    let resolveArtifactA!: (
      value: AdminDurableReviewResult<AdminArtifactDownloadData>,
    ) => void;
    const bridge = createBridge();
    bridge.listArtifacts = vi.fn(async () => success({
      artifacts: [artifact, artifactB],
      campaignId: campaign.campaignId,
    }));
    bridge.getArtifactDetail = vi.fn(async (_campaignId, artifactId) => success({
      artifact: artifactId === artifactB.artifactId ? artifactB : artifact,
      sourceManifest: { rows: [], version: "artifact-source-v1" },
    }));
    bridge.downloadArtifact = vi.fn<AdminDurableReviewApiBridge["downloadArtifact"]>(
      (_campaignId, artifactId) => artifactId === artifact.artifactId
        ? new Promise((resolve) => {
            resolveArtifactA = resolve;
          })
        : Promise.resolve(success({
            bytes: new TextEncoder().encode("campaignId,participantId\n"),
            contentBytes: 25,
            contentHash: artifactB.contentHash,
            fileName: artifactB.fileName,
            mimeType: artifactB.mimeType,
          })),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:artifact-b"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-01/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Download artifact" }));
    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(1));
    const artifactASignal = vi.mocked(bridge.downloadArtifact).mock.calls[0]?.[2].signal;

    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-02/ }));
    expect(artifactASignal?.aborted).toBe(true);
    await act(async () => {
      resolveArtifactA({
        bridgeCode: "BRIDGE_REQUEST_FAILED",
        code: "BRIDGE_REQUEST_TIMEOUT",
        ok: false,
        phase: "request",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-late-artifact-a",
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("trace-late-artifact-a")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry download" })).not.toBeInTheDocument();
    const downloadB = await screen.findByRole("button", { name: "Download artifact" });
    await waitFor(() => expect(downloadB).toBeEnabled());
    fireEvent.click(downloadB);
    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(2));
    expect(vi.mocked(bridge.downloadArtifact).mock.calls[1]?.[3]).toEqual({
      expectedContentHash: artifactB.contentHash,
    });
  });

  it("rotates the decision idempotency key after a successful identical command", async () => {
    const bridge = createBridge();
    const submitDecision = vi.fn<AdminDurableReviewApiBridge["submitDecision"]>()
      .mockResolvedValueOnce(success({
        campaignId: campaign.campaignId,
        created: true,
        decisionId: "decision-admin-first",
        participantId: queueItem.participantId,
        snapshotFingerprint: SHA_A,
        version: 1,
      }, 201))
      .mockResolvedValueOnce(success({
        campaignId: campaign.campaignId,
        created: true,
        decisionId: "decision-admin-second",
        participantId: queueItem.participantId,
        snapshotFingerprint: SHA_A,
        version: 2,
      }, 201));
    bridge.submitDecision = submitDecision;

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /participant-admin-01/ }));
    const submit = await screen.findByRole("button", { name: "Submit decision" });
    await waitFor(() => expect(submit).toBeEnabled());

    for (const expectedCalls of [1, 2]) {
      fireEvent.click(submit);
      fireEvent.click(screen.getByRole("button", { name: "Confirm and submit" }));
      await waitFor(() => expect(submitDecision).toHaveBeenCalledTimes(expectedCalls));
      await waitFor(() => expect(submit).toBeEnabled());
    }

    expect(submitDecision.mock.calls[1]?.[2].idempotencyKey)
      .not.toBe(submitDecision.mock.calls[0]?.[2].idempotencyKey);
  });

  it("supports keyboard workflow activation, modal containment, Escape, and focus restoration", async () => {
    const bridge = createBridge();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:keyboard-admin-artifact"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign") as HTMLSelectElement;
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    changeSelectByKeyboard(campaignSelect, campaign.campaignId, "Enter");

    const queueFilter = screen.getByLabelText("Queue state") as HTMLSelectElement;
    changeSelectByKeyboard(queueFilter, "pending_review", " ");
    await waitFor(() => expect(bridge.listReviews).toHaveBeenCalledTimes(2));
    activateByKeyboard(await screen.findByRole("button", { name: /participant-admin-01/ }), "Enter");
    await screen.findByText(SHA_A);

    const reject = screen.getByRole("button", { name: "Reject" });
    activateByKeyboard(reject, " ");
    expect(reject).toHaveAttribute("aria-pressed", "true");

    const submit = screen.getByRole("button", { name: "Submit decision" });
    activateByKeyboard(submit, "Enter");
    const firstDialog = screen.getByRole("dialog", { name: "Confirm decision" });
    const firstCancel = within(firstDialog).getByRole("button", { name: "Cancel" });
    const firstConfirm = within(firstDialog).getByRole("button", { name: "Confirm and submit" });
    await waitFor(() => expect(firstCancel).toHaveFocus());

    fireEvent.keyDown(firstDialog, { key: "Tab", shiftKey: true });
    expect(firstConfirm).toHaveFocus();
    fireEvent.keyDown(firstDialog, { key: "Tab" });
    expect(firstCancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(submit).toHaveFocus();

    activateByKeyboard(submit, " ");
    const cancel = await screen.findByRole("button", { name: "Cancel" });
    activateByKeyboard(cancel, "Enter");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(submit).toHaveFocus();

    activateByKeyboard(submit, "Enter");
    const confirm = await screen.findByRole("button", { name: "Confirm and submit" });
    activateByKeyboard(confirm, " ");
    await waitFor(() => expect(bridge.submitDecision).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submit).toBeEnabled());
    await waitFor(() => expect(submit).toHaveFocus());

    const jsonFormat = screen.getByRole("button", { name: "JSON" });
    activateByKeyboard(jsonFormat, "Enter");
    expect(jsonFormat).toHaveAttribute("aria-pressed", "true");
    activateByKeyboard(screen.getByRole("button", { name: "Generate artifact" }), " ");
    await waitFor(() => expect(bridge.generateArtifact).toHaveBeenCalledTimes(1));

    activateByKeyboard(await screen.findByRole("button", { name: /artifact-admin-01/ }), "Enter");
    const download = await screen.findByRole("button", { name: "Download artifact" });
    await waitFor(() => expect(download).toBeEnabled());
    activateByKeyboard(download, " ");
    await waitFor(() => expect(bridge.downloadArtifact).toHaveBeenCalledTimes(1));
  });

  it("exposes command pending state and keeps duplicate decision submission disabled", async () => {
    let resolveDecision!: (value: AdminDurableReviewResult<AdminDecisionReceiptData>) => void;
    const bridge = createBridge();
    bridge.submitDecision = vi.fn<AdminDurableReviewApiBridge["submitDecision"]>(() =>
      new Promise<AdminDurableReviewResult<AdminDecisionReceiptData>>((resolve) => {
        resolveDecision = resolve;
      }));

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /participant-admin-01/ }));
    const submit = await screen.findByRole("button", { name: "Submit decision" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and submit" }));
    fireEvent.click(submit);

    await waitFor(() => expect(bridge.submitDecision).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Pending", { selector: ".admin-durable-status" })).toBeInTheDocument();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(bridge.submitDecision).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDecision(success({
        campaignId: campaign.campaignId,
        created: true,
        decisionId: "decision-admin-pending",
        participantId: queueItem.participantId,
        snapshotFingerprint: SHA_A,
        version: 1,
      }, 201));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.queryByText(
      "Pending",
      { selector: ".admin-durable-status" },
    )).not.toBeInTheDocument());
  });

  it("reuses the same decision idempotency key after an ambiguous request failure", async () => {
    const bridge = createBridge();
    const failure: AdminDurableReviewResult<AdminDecisionReceiptData> = {
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_FAILED",
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      traceId: "trace-admin-decision-ambiguous",
    };
    const submitDecision = vi.fn<AdminDurableReviewApiBridge["submitDecision"]>();
    submitDecision
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(success({
        campaignId: campaign.campaignId,
        created: false,
        decisionId: "decision-admin-replayed",
        participantId: queueItem.participantId,
        snapshotFingerprint: SHA_A,
        version: 1,
      }));
    bridge.submitDecision = submitDecision;

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /participant-admin-01/ }));
    const submit = await screen.findByRole("button", { name: "Submit decision" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and submit" }));

    expect(await screen.findByText("Read-only degraded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh review workspace" }));
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and submit" }));
    await waitFor(() => expect(submitDecision).toHaveBeenCalledTimes(2));

    expect(submitDecision.mock.calls[1]?.[2].idempotencyKey)
      .toBe(submitDecision.mock.calls[0]?.[2].idempotencyKey);
  });

  it("clears a hidden Participant detail when the queue filter changes", async () => {
    const bridge = createBridge();
    bridge.listReviews = vi.fn(async (campaignId, _context, input) => success({
      campaignId,
      items: input?.state ? [] : [queueItem],
      summary: {
        approvedCurrent: 0,
        needsReviewCurrent: 0,
        pendingReview: input?.state ? 0 : 1,
        rejectedCurrent: 0,
        stale: 0,
        total: input?.state ? 0 : 1,
      },
    }));

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /participant-admin-01/ }));
    expect(await screen.findByText(SHA_A)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Queue state"), {
      target: { value: "rejected_current" },
    });

    await waitFor(() => expect(bridge.listReviews).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(SHA_A)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit decision" })).not.toBeInTheDocument();
  });

  it("aborts the old identity and ignores its late Campaign response", async () => {
    let resolveA!: (value: AdminDurableReviewResult<AdminCampaignListData>) => void;
    const signalA: AbortSignal[] = [];
    const bridge = createBridge();
    bridge.listCampaigns = vi.fn<AdminDurableReviewApiBridge["listCampaigns"]>((requestContext) => {
      if (requestContext.session?.sessionId === "sess-admin-A") {
        signalA.push(requestContext.signal);
        return new Promise<AdminDurableReviewResult<AdminCampaignListData>>((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve(success({
        campaigns: [{ ...campaign, campaignId: "campaign-session-b" }],
        repository,
      }));
    });
    const { rerender } = render(
      <AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session("A")} />,
    );

    await waitFor(() => expect(bridge.listCampaigns).toHaveBeenCalledTimes(1));
    rerender(
      <AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session("B")} />,
    );
    await screen.findByRole("option", { name: /campaign-session-b/ });
    expect(signalA[0]?.aborted).toBe(true);

    await act(async () => {
      resolveA(success({
        campaigns: [{ ...campaign, campaignId: "campaign-late-a" }],
        repository,
      }));
      await Promise.resolve();
    });

    expect(screen.queryByRole("option", { name: /campaign-late-a/ })).not.toBeInTheDocument();
  });

  it("aborts an old Campaign request and ignores its late queue response", async () => {
    const campaignB = { ...campaign, campaignId: "campaign-admin-02" };
    let resolveCampaignA!: (value: AdminDurableReviewResult<AdminReviewQueueData>) => void;
    const campaignASignals: AbortSignal[] = [];
    const bridge = createBridge();
    bridge.listCampaigns = vi.fn(async () => success({
      campaigns: [campaign, campaignB],
      repository,
    }));
    bridge.listReviews = vi.fn<AdminDurableReviewApiBridge["listReviews"]>(
      (campaignId, requestContext) => {
        if (campaignId === campaign.campaignId) {
          campaignASignals.push(requestContext.signal);
          return new Promise<AdminDurableReviewResult<AdminReviewQueueData>>((resolve) => {
            resolveCampaignA = resolve;
          });
        }
        return Promise.resolve(success({
          campaignId,
          items: [],
          summary: {
            approvedCurrent: 0,
            needsReviewCurrent: 0,
            pendingReview: 0,
            rejectedCurrent: 0,
            stale: 0,
            total: 0,
          },
        }));
      },
    );

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-02/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    await waitFor(() => expect(bridge.listReviews).toHaveBeenCalledTimes(1));
    fireEvent.change(campaignSelect, { target: { value: campaignB.campaignId } });

    expect(campaignASignals[0]?.aborted).toBe(true);
    await waitFor(() => expect(bridge.listReviews).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolveCampaignA(success({
        campaignId: campaign.campaignId,
        items: [queueItem],
        summary: {
          approvedCurrent: 0,
          needsReviewCurrent: 0,
          pendingReview: 1,
          rejectedCurrent: 0,
          stale: 0,
          total: 1,
        },
      }));
      await Promise.resolve();
    });

    expect(screen.queryByRole("button", { name: /participant-admin-01/ })).not.toBeInTheDocument();
  });

  it("aborts and restarts pending Campaign reads when Participant identity changes", async () => {
    let resolveFirstWinners!: (value: AdminDurableReviewResult<AdminWinnerListData>) => void;
    const winnerSignals: AbortSignal[] = [];
    const bridge = createBridge();
    bridge.listWinners = vi.fn<AdminDurableReviewApiBridge["listWinners"]>(
      (_campaignId, requestContext) => {
        winnerSignals.push(requestContext.signal);
        if (winnerSignals.length === 1) {
          return new Promise<AdminDurableReviewResult<AdminWinnerListData>>((resolve) => {
            resolveFirstWinners = resolve;
          });
        }
        return Promise.resolve(success({
          campaignId: campaign.campaignId,
          rows: [],
          sourceFingerprint: SHA_C,
          sourceVersion: "artifact-source-v1" as const,
        }));
      },
    );

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    const participant = await screen.findByRole("button", { name: /participant-admin-01/ });
    await waitFor(() => expect(bridge.listWinners).toHaveBeenCalledTimes(1));
    fireEvent.click(participant);

    expect(winnerSignals[0]?.aborted).toBe(true);
    await waitFor(() => expect(bridge.listWinners).toHaveBeenCalledTimes(2));
    await act(async () => {
      resolveFirstWinners(success({
        campaignId: campaign.campaignId,
        rows: [],
        sourceFingerprint: SHA_C,
        sourceVersion: "artifact-source-v1" as const,
      }));
      await Promise.resolve();
    });
    expect(await screen.findByText(SHA_A)).toBeInTheDocument();
  });

  it("aborts pending work on unmount and ignores late completion", async () => {
    let resolveCampaigns!: (value: AdminDurableReviewResult<AdminCampaignListData>) => void;
    const signals: AbortSignal[] = [];
    const bridge = createBridge();
    bridge.listCampaigns = vi.fn<AdminDurableReviewApiBridge["listCampaigns"]>((requestContext) => {
      signals.push(requestContext.signal);
      return new Promise<AdminDurableReviewResult<AdminCampaignListData>>((resolve) => {
        resolveCampaigns = resolve;
      });
    });
    const { unmount } = render(
      <AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />,
    );

    await waitFor(() => expect(bridge.listCampaigns).toHaveBeenCalledTimes(1));
    unmount();
    expect(signals[0]?.aborted).toBe(true);

    await act(async () => {
      resolveCampaigns(success({ campaigns: [campaign], repository }));
      await Promise.resolve();
    });
  });

  it("keeps same-session requests alive when the session object is refreshed", async () => {
    let resolveCampaigns!: (value: AdminDurableReviewResult<AdminCampaignListData>) => void;
    const signals: AbortSignal[] = [];
    const bridge = createBridge();
    bridge.listCampaigns = vi.fn<AdminDurableReviewApiBridge["listCampaigns"]>((requestContext) => {
      signals.push(requestContext.signal);
      return new Promise<AdminDurableReviewResult<AdminCampaignListData>>((resolve) => {
        resolveCampaigns = resolve;
      });
    });
    const activeSession = session();
    const { rerender } = render(
      <AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={activeSession} />,
    );

    await waitFor(() => expect(bridge.listCampaigns).toHaveBeenCalledTimes(1));
    rerender(
      <AdminDurableReviewWorkspace
        bridge={bridge}
        locale="en-US"
        session={{ ...activeSession, lastSeenAt: "2026-07-15T00:00:10.000Z" }}
      />,
    );

    expect(signals[0]?.aborted).toBe(false);
    expect(bridge.listCampaigns).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveCampaigns(success({ campaigns: [campaign], repository }));
      await Promise.resolve();
    });
    expect(await screen.findByRole("option", { name: /campaign-admin-01/ })).toBeInTheDocument();
  });

  it("replaces refresh with an explicit reconnect action after an auth failure", async () => {
    const bridge = createBridge();
    const onReconnect = vi.fn();
    const failure: AdminDurableReviewResult<AdminCampaignListData> = {
      code: "AUTH_SESSION_INVALID",
      httpStatus: 401,
      ok: false,
      phase: "response",
      reconnectRequired: true,
      retryable: false,
      traceId: "trace-admin-reconnect",
    };
    bridge.listCampaigns = vi.fn(async () => failure);

    render(
      <AdminDurableReviewWorkspace
        bridge={bridge}
        locale="en-US"
        onReconnect={onReconnect}
        session={session()}
      />,
    );

    expect(await screen.findByText("Reconnect required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh review workspace" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect issued wallet" }));
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("cleans up browser download resources and exits pending state when click fails", async () => {
    const bridge = createBridge();
    const createObjectURL = vi.fn(() => "blob:failed-admin-artifact");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("browser download unavailable");
    });

    render(<AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />);
    const campaignSelect = await screen.findByLabelText("Campaign");
    await screen.findByRole("option", { name: /campaign-admin-01/ });
    fireEvent.change(campaignSelect, { target: { value: campaign.campaignId } });
    fireEvent.click(await screen.findByRole("button", { name: /artifact-admin-01/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Download artifact" }));

    expect(await screen.findByText("BRIDGE_DOWNLOAD_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.queryByText("Pending", { selector: ".admin-durable-status" })).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:failed-admin-artifact");
    expect(document.querySelector(`a[download="${artifact.fileName}"]`)).toBeNull();
  });

  it("shows retryable API failure as read-only degraded without seeded fallback", async () => {
    const bridge = createBridge();
    const failure: AdminDurableReviewResult<AdminCampaignListData> = {
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_FAILED",
      ok: false,
      phase: "request",
      reconnectRequired: false,
      retryable: true,
      traceId: "trace-admin-failed",
    };
    bridge.listCampaigns = vi.fn(async () => failure);

    render(
      <AdminDurableReviewWorkspace bridge={bridge} locale="en-US" session={session()} />,
    );

    expect(await screen.findByText("Read-only degraded")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByText("trace-admin-failed")).toBeInTheDocument();
    expect(screen.queryByText(/seeded/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit decision" })).not.toBeInTheDocument();
  });
});
