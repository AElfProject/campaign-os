import { describe, expect, it, vi } from "vitest";
import {
  createRepositoryCampaignWorkflowErrorFallbackState,
  createRepositoryCampaignWorkflowLoadingState,
  loadRepositoryCampaignWorkflowBridgeState,
  sanitizeRepositoryCampaignWorkflowApiText,
  type RepositoryCampaignWorkflowApiFetch,
} from "./repositoryCampaignWorkflowApiBridge";

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 34,
  version: "0.2.0-local",
};

const campaignId = "campaign-db-draft-0001";
const requiredTaskId = "campaign-db-task-draft-0001";
const optionalTaskId = "campaign-db-task-draft-0002";
const walletAddress = "2F4RepositoryWorkflowWallet";
const artifactId = "export-artifact-local-review-001";

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const envelope = (data: unknown, traceId: string) => ({
  data,
  ok: true,
  runtime,
  safety: { localOnly: true },
  traceId,
});

const healthEnvelope = () => envelope({ status: "ready" }, "trace-health");

const createEnvelope = () => envelope({
  campaignDb: {
    createdViaRepository: true,
    draftId: campaignId,
    repositoryId: "campaign-db-repository-runtime",
    storeId: "campaign-db",
  },
  payload: {
    contractMode: "OFF_CHAIN_MVP",
    defaultLocale: "en-US",
    id: campaignId,
    ownerAddress: "ELF_local_review_project_owner",
    projectId: "repo-workflow-review",
    status: "draft",
    supportedLocales: ["en-US", "zh-CN", "zh-TW"],
    walletPolicy: "ANY",
  },
  persistence: {
    kind: "campaign_draft",
    recordId: "campaign-db-record-0001",
  },
}, "trace-create");

const listEnvelope = (containsCreatedDraft = true) => envelope({
  payload: {
    campaignDb: { draftCount: containsCreatedDraft ? 1 : 0 },
    items: containsCreatedDraft
      ? [{ id: campaignId, projectId: "repo-workflow-review", status: "draft" }]
      : [{ id: "other-campaign", status: "draft" }],
    summary: { totalCampaigns: 1 },
  },
}, "trace-list");

const taskEnvelope = ({
  required,
  taskId,
  traceId,
}: {
  required: boolean;
  taskId: string;
  traceId: string;
}) => envelope({
  campaignDbTask: {
    createdViaRepository: true,
    storeId: "campaign-db",
    taskId,
  },
  payload: {
    evidenceRule: required ? { minAmount: 1, source: "AELFSCAN" } : { action: "share" },
    points: required ? 120 : 50,
    required,
    taskId,
    templateCode: required ? "bridge_ebridge" : "share_campaign",
    verificationType: required ? "ON_CHAIN" : "SOCIAL",
    walletCompatibility: "ANY",
  },
  persistence: {
    kind: "task_draft",
    recordId: `${taskId}-record`,
  },
}, traceId);

const eligibilityEnvelope = ({
  eligible,
  missingTasks,
  score,
  traceId,
}: {
  eligible: boolean;
  missingTasks: string[];
  score: number;
  traceId: string;
}) => envelope({
  payload: {
    accountType: "EOA",
    campaignId,
    campaignDbEvidence: eligible
      ? [
        { evidenceHash: `evidence-hash:${requiredTaskId}`, taskId: requiredTaskId },
        { evidenceHash: `evidence-hash:${optionalTaskId}`, taskId: optionalTaskId },
      ]
      : [],
    eligible,
    localePreference: "en-US",
    missingTasks,
    riskFlags: eligible ? [] : ["required_task_missing"],
    score,
    status: eligible ? "eligible" : "not_eligible",
    walletAddress,
    walletSource: "PORTKEY_EOA_EXTENSION",
    walletTypeVerified: true,
  },
}, traceId);

const verificationEnvelope = ({
  points,
  taskId,
  traceId,
  verificationType,
}: {
  points: number;
  taskId: string;
  traceId: string;
  verificationType: "ON_CHAIN" | "SOCIAL";
}) => envelope({
  campaignDbCompletion: {
    completionId: taskId === requiredTaskId
      ? "campaign-db-task-completion-0002"
      : "campaign-db-task-completion-0001",
    evidenceId: taskId === requiredTaskId
      ? "campaign-db-task-evidence-0002"
      : "campaign-db-task-evidence-0001",
    storeId: "campaign-db",
  },
  campaignDbEvidence: {
    evidenceHash: `evidence-hash:${taskId}`,
    liveContractExecuted: false,
    liveProviderExecuted: false,
    liveRewardExecuted: false,
    liveStorageExecuted: false,
    storeId: "campaign-db",
    taskId,
  },
  payload: {
    accountType: "EOA",
    campaignId,
    evidenceHash: `evidence-hash:${taskId}`,
    evidenceId: taskId === requiredTaskId
      ? "campaign-db-task-evidence-0002"
      : "campaign-db-task-evidence-0001",
    evidenceSource: verificationType === "ON_CHAIN" ? "AELFSCAN" : "SOCIAL_API",
    liveContractExecuted: false,
    liveProviderExecuted: false,
    liveRewardExecuted: false,
    liveStorageExecuted: false,
    pointsAwarded: points,
    pointsAvailable: points,
    status: "completed",
    taskId,
    walletAddress,
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
  persistence: { kind: "verification_attempt" },
}, traceId);

const exportEnvelope = ({
  blocked,
  traceId,
}: {
  blocked: boolean;
  traceId: string;
}) => envelope({
  campaignDb: {
    createdViaRepository: true,
    storeId: "campaign-db",
  },
  payload: {
    artifact: blocked
      ? undefined
      : {
        checksum: "local-export-checksum-ready",
        format: "json",
        generatedMode: "local_review_only",
        localPreviewMode: true,
        safety: {
          noContractRoot: true,
          noDownloadUrl: true,
          noRewardDistribution: true,
          noStorageWrite: true,
        },
      },
    artifactRegistry: blocked
      ? undefined
      : {
        artifactId,
        auditEvents: [
          { routeId: "campaigns.export.preview", traceId, type: "registered_local_artifact" },
          { routeId: "campaigns.export.preview", traceId, type: "storage_disabled" },
        ],
        checksum: "local-export-checksum-ready",
        routeId: "campaigns.export.preview",
        safety: {
          contractRootWriteEnabled: false,
          downloadUrlEnabled: false,
          localReviewOnly: true,
          objectKeyEnabled: false,
          providerCallEnabled: false,
          rewardCustodyEnabled: false,
          rewardDistributionEnabled: false,
          signedUrlEnabled: false,
          storageWriteEnabled: false,
          walletSigningEnabled: false,
        },
        traceId,
      },
    blockedRows: blocked ? 1 : 0,
    campaignId,
    contractRootMode: "none",
    exportBatchId: `campaign-db-export-${campaignId}`,
    format: "json",
    readyRows: blocked ? 0 : 1,
    reviewRequiredRows: 0,
    rows: [
      blocked
        ? {
          missingTasks: ["bridge_ebridge"],
          rowStatus: "blocked",
          totalPoints: 50,
          walletAddress,
        }
        : {
          accountType: "EOA",
          evidenceHashes: [`evidence-hash:${requiredTaskId}`, `evidence-hash:${optionalTaskId}`],
          localePreference: "en-US",
          missingTasks: [],
          rowStatus: "ready",
          taskRecords: [
            {
              evidenceHash: `evidence-hash:${requiredTaskId}`,
              liveContractExecuted: false,
              liveProviderExecuted: false,
              liveRewardExecuted: false,
              liveStorageExecuted: false,
              pointsAwarded: 120,
              taskId: requiredTaskId,
            },
            {
              evidenceHash: `evidence-hash:${optionalTaskId}`,
              liveContractExecuted: false,
              liveProviderExecuted: false,
              liveRewardExecuted: false,
              liveStorageExecuted: false,
              pointsAwarded: 50,
              taskId: optionalTaskId,
            },
          ],
          totalPoints: 170,
          walletAddress,
          walletSource: "PORTKEY_EOA_EXTENSION",
        },
    ],
  },
  persistence: blocked ? undefined : { kind: "export_preview" },
}, traceId);

const readinessEnvelope = () => envelope({
  campaignDb: {
    createdViaRepository: true,
    storeId: "campaign-db",
  },
  payload: {
    batchId: `campaign-db-export-${campaignId}`,
    campaignId,
    contractRootReadiness: [
      { mode: "none", readiness: "ready", safeDefault: true },
      { mode: "contract_claim", readiness: "blocked", safeDefault: false },
    ],
    previewModes: [
      { downloadAvailable: false, generatesFile: false, mode: "json", readiness: "ready" },
      { downloadAvailable: false, generatesFile: false, mode: "csv", readiness: "ready" },
    ],
    summary: {
      blockedRows: 0,
      previewModeCount: 2,
      readyRows: 1,
      reviewRequiredRows: 0,
      totalRows: 1,
    },
  },
}, "trace-readiness");

const auditListEnvelope = () => envelope({
  payload: {
    campaignId,
    records: [
      {
        artifactId,
        batchId: `campaign-db-export-${campaignId}`,
        campaignId,
        routeId: "campaigns.export.preview",
        traceId: "trace-ready-export",
      },
    ],
    safety: {
      downloadUrlEnabled: false,
      localReviewOnly: true,
      storageWriteEnabled: false,
    },
    summary: { totalRecords: 1 },
  },
}, "trace-audit-list");

const auditDetailEnvelope = () => envelope({
  payload: {
    artifactId,
    campaignId,
    record: {
      artifactId,
      batchId: `campaign-db-export-${campaignId}`,
      routeId: "campaigns.export.preview",
      traceId: "trace-ready-export",
    },
  },
}, "trace-audit-detail");

const workflowResponses = (containsCreatedDraft = true) => [
  healthEnvelope(),
  createEnvelope(),
  listEnvelope(containsCreatedDraft),
  taskEnvelope({ required: true, taskId: requiredTaskId, traceId: "trace-required-task" }),
  taskEnvelope({ required: false, taskId: optionalTaskId, traceId: "trace-optional-task" }),
  eligibilityEnvelope({
    eligible: false,
    missingTasks: ["bridge_ebridge"],
    score: 0,
    traceId: "trace-before-eligibility",
  }),
  verificationEnvelope({
    points: 50,
    taskId: optionalTaskId,
    traceId: "trace-optional-verify",
    verificationType: "SOCIAL",
  }),
  eligibilityEnvelope({
    eligible: false,
    missingTasks: ["bridge_ebridge"],
    score: 50,
    traceId: "trace-optional-eligibility",
  }),
  exportEnvelope({ blocked: true, traceId: "trace-blocked-export" }),
  verificationEnvelope({
    points: 120,
    taskId: requiredTaskId,
    traceId: "trace-required-verify",
    verificationType: "ON_CHAIN",
  }),
  eligibilityEnvelope({
    eligible: true,
    missingTasks: [],
    score: 170,
    traceId: "trace-after-eligibility",
  }),
  exportEnvelope({ blocked: false, traceId: "trace-ready-export" }),
  readinessEnvelope(),
  auditListEnvelope(),
  auditDetailEnvelope(),
];

const fetchFromBodies = (bodies: unknown[]): RepositoryCampaignWorkflowApiFetch =>
  vi.fn(async () => {
    const body = bodies.shift();

    if (body === undefined) {
      throw new Error("No mocked response remains");
    }

    return response(body, { traceId: typeof body === "object" && body && "traceId" in body ? String(body.traceId) : undefined });
  }) as unknown as RepositoryCampaignWorkflowApiFetch;

const noLiveFlagKeys = [
  "liveContractExecuted",
  "liveProviderExecuted",
  "liveRewardExecuted",
  "liveStorageExecuted",
] as const;

type NoLiveFlagKey = typeof noLiveFlagKeys[number];

const mutateVerificationPayload = (
  bodies: unknown[],
  verification: "optional" | "required",
  mutate: (payload: Record<string, unknown>) => void,
) => {
  const body = bodies[verification === "optional" ? 6 : 9];
  const data = typeof body === "object" && body && "data" in body
    ? (body as { data?: { payload?: Record<string, unknown> } }).data
    : undefined;

  if (!data?.payload) {
    throw new Error(`Missing ${verification} verification payload fixture`);
  }

  mutate(data.payload);
};

describe("repository campaign workflow API bridge", () => {
  it("creates loading and explicit error fallback states without network calls", () => {
    expect(createRepositoryCampaignWorkflowLoadingState()).toMatchObject({
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });

    const fallback = createRepositoryCampaignWorkflowErrorFallbackState({
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      traceId: "trace-error",
    });

    expect(fallback).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      loading: false,
      source: "error_fallback",
      status: "error",
      traceId: "trace-error",
    });
  });

  it("treats missing API base URL as seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as RepositoryCampaignWorkflowApiFetch;

    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "   " },
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      source: "seeded_fallback",
      status: "fallback",
    });
  });

  it("redacts invalid URL details and secret-like fragments", async () => {
    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as RepositoryCampaignWorkflowApiFetch,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "seeded_fallback",
      status: "fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("loads a full repository campaign workflow through existing API routes", async () => {
    const fetchImpl = fetchFromBodies(workflowResponses());

    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184", tracePrefix: "repo-workflow-test" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      campaign: {
        createdDraftId: campaignId,
        listContainsCreatedDraft: true,
        ownerAddress: "ELF_local_review_project_owner",
        projectId: "repo-workflow-review",
        repository: {
          createdViaRepository: true,
          repositoryId: "campaign-db-repository-runtime",
          storeId: "campaign-db",
        },
      },
      eligibility: {
        afterRequired: {
          eligible: true,
          missingTasks: [],
          score: 170,
          walletTypeVerified: true,
        },
        afterOptional: {
          eligible: false,
          missingTasks: ["bridge_ebridge"],
          score: 50,
        },
        beforeRequired: {
          eligible: false,
          missingTasks: ["bridge_ebridge"],
          score: 0,
        },
      },
      exportReview: {
        audit: {
          detailFound: true,
          recordCount: 1,
        },
        blockedPreview: {
          blockedRows: 1,
          readyRows: 0,
        },
        readiness: {
          readyRows: 1,
          totalRows: 1,
        },
        readyPreview: {
          artifactId,
          readyRows: 1,
        },
      },
      health: {
        routeCount: 34,
        status: "ready",
      },
      source: "api_runtime",
      status: "ready",
      tasks: {
        optional: {
          points: 50,
          required: false,
          taskId: optionalTaskId,
          verificationType: "SOCIAL",
        },
        required: {
          points: 120,
          required: true,
          taskId: requiredTaskId,
          verificationType: "ON_CHAIN",
        },
      },
      verification: {
        optional: {
          pointsAwarded: 50,
          taskId: optionalTaskId,
        },
        required: {
          pointsAwarded: 120,
          taskId: requiredTaskId,
        },
      },
      workflowStepCount: 15,
    });
    expect(state.diagnostics).toEqual([]);
    expect(state.traceIds).toEqual(expect.arrayContaining([
      "trace-create",
      "trace-required-task",
      "trace-optional-verify",
      "trace-ready-export",
      "trace-audit-detail",
    ]));
    expect(state.liveSideEffects).toEqual({
      contractWriteExecuted: false,
      objectKeyCreated: false,
      providerCallExecuted: false,
      rawProviderPayloadExposed: false,
      rewardCustodyExecuted: false,
      rewardDistributionExecuted: false,
      signedUrlCreated: false,
      storageWriteExecuted: false,
      walletSignatureExecuted: false,
    });

    const calls = vi.mocked(fetchImpl).mock.calls;
    expect(calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      "/api/health",
      "/api/campaigns",
      "/api/campaigns",
      `/api/campaigns/${campaignId}/tasks`,
      `/api/campaigns/${campaignId}/tasks`,
      `/api/campaigns/${campaignId}/eligibility`,
      `/api/tasks/${optionalTaskId}/verify`,
      `/api/campaigns/${campaignId}/eligibility`,
      `/api/campaigns/${campaignId}/export`,
      `/api/tasks/${requiredTaskId}/verify`,
      `/api/campaigns/${campaignId}/eligibility`,
      `/api/campaigns/${campaignId}/export`,
      `/api/campaigns/${campaignId}/export-readiness`,
      `/api/campaigns/${campaignId}/export-artifacts`,
      `/api/campaigns/${campaignId}/export-artifacts/${artifactId}`,
    ]);
    expect(JSON.parse(String(calls[3][1]?.body))).toMatchObject({
      required: true,
      templateCode: "bridge_ebridge",
      verificationType: "ON_CHAIN",
    });
    expect(calls[1][1]?.headers).toMatchObject({
      "x-campaign-os-account-type": "AA",
      "x-campaign-os-credential-boundary": "ordinary_user_wallet",
      "x-campaign-os-proof-status": "verified",
      "x-campaign-os-roles": "project_owner",
      "x-campaign-os-session-id": "sess-ELF_local_review_project_owner",
      "x-campaign-os-wallet-address": "ELF_local_review_project_owner",
      "x-campaign-os-wallet-source": "PORTKEY_AA",
    });
    expect(JSON.parse(String(calls[6][1]?.body))).toMatchObject({
      accountType: "EOA",
      campaignId,
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
  });

  it.each(noLiveFlagKeys)("fails closed when required verification %s is true", async (flag) => {
    const bodies = workflowResponses();
    mutateVerificationPayload(bodies, "required", (payload) => {
      payload[flag] = true;
    });

    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: fetchFromBodies(bodies),
    });
    const serialized = JSON.stringify(state).toLowerCase();

    expect(state.source).toBe("error_fallback");
    expect(state.status).not.toBe("ready");
    expect(state.verification?.required).toBeUndefined();
    expect(state.verification?.optional).toMatchObject({ taskId: optionalTaskId });
    expect(state.diagnostics).toEqual([
      expect.objectContaining({
        code: "API_RESPONSE_INVALID",
        safeDetails: expect.objectContaining({
          invalidNoLiveFields: flag,
          reason: "unsafe_no_live_verification_flag",
        }),
        severity: "error",
      }),
    ]);
    expect(serialized).not.toContain("\"livecontractexecuted\":true");
    expect(serialized).not.toContain("\"liveproviderexecuted\":true");
    expect(serialized).not.toContain("\"liverewardexecuted\":true");
    expect(serialized).not.toContain("\"livestorageexecuted\":true");
  });

  it("fails closed and sanitizes malformed or missing no-live verification flags", async () => {
    const bodies = workflowResponses();
    mutateVerificationPayload(bodies, "optional", (payload) => {
      payload.liveContractExecuted = "true";
      payload.liveProviderExecuted = 1;
      payload.liveRewardExecuted = null;
      payload.liveStorageExecuted = {
        providerPayload: "rawSignature=abc signedUrl=https://storage.example/file?token=abc",
      };
    });

    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: fetchFromBodies(bodies),
    });
    const serialized = JSON.stringify(state).toLowerCase();

    expect(state.source).toBe("error_fallback");
    expect(state.status).not.toBe("ready");
    expect(state.verification).toBeUndefined();
    expect(state.diagnostics).toEqual([
      expect.objectContaining({
        code: "API_RESPONSE_INVALID",
        safeDetails: expect.objectContaining({
          invalidNoLiveFields: noLiveFlagKeys.join(","),
          reason: "unsafe_no_live_verification_flag",
        }),
        severity: "error",
      }),
    ]);
    for (const unsafe of [
      "rawsignature=abc",
      "signedurl=https://storage.example",
      "token=abc",
      "\"livecontractexecuted\":\"true\"",
      "\"liveproviderexecuted\":1",
      "\"liverewardexecuted\":null",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }

    const missingBodies = workflowResponses();
    mutateVerificationPayload(missingBodies, "optional", (payload) => {
      delete payload.liveStorageExecuted;
    });

    const missingState = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: fetchFromBodies(missingBodies),
    });

    expect(missingState.source).toBe("error_fallback");
    expect(missingState.status).not.toBe("ready");
    expect(missingState.diagnostics).toEqual([
      expect.objectContaining({
        code: "API_RESPONSE_INVALID",
        safeDetails: expect.objectContaining({
          invalidNoLiveFields: "liveStorageExecuted",
          reason: "unsafe_no_live_verification_flag",
        }),
        severity: "error",
      }),
    ]);
  });

  it("keeps list refresh miss as a warning and does not mark the workflow ready", async () => {
    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: fetchFromBodies(workflowResponses(false)),
    });

    expect(state.source).toBe("api_runtime");
    expect(state.status).toBe("partial");
    expect(state.campaign?.listContainsCreatedDraft).toBe(false);
    expect(state.diagnostics).toEqual([
      expect.objectContaining({ code: "API_LIST_FAILED", severity: "warning" }),
    ]);
  });

  it("returns an error fallback when health fails before workflow writes", async () => {
    const fetchImpl = vi.fn(async () => response({
      error: { code: "HEALTH_DOWN" },
      ok: false,
      traceId: "trace-health-down",
    }, { ok: false, status: 503, traceId: "trace-health-down" })) as unknown as RepositoryCampaignWorkflowApiFetch;

    const state = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(state).toMatchObject({
      diagnostics: [{ code: "API_HEALTH_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-health-down",
    });
  });

  it("handles invalid response and request timeout without unsafe diagnostics", async () => {
    const invalidState = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: fetchFromBodies([
        healthEnvelope(),
        { ok: true, data: { payload: { status: "draft" } }, traceId: "trace-invalid-create" },
      ]),
    });

    expect(invalidState).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-invalid-create",
    });

    const timeoutFetch = vi.fn(async () => {
      throw new DOMException("AbortError stack trace /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/private-key", "AbortError");
    }) as unknown as RepositoryCampaignWorkflowApiFetch;
    const timeoutState = await loadRepositoryCampaignWorkflowBridgeState({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: timeoutFetch,
    });
    const serialized = JSON.stringify(timeoutState).toLowerCase();

    expect(timeoutState).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT", severity: "error" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["campaign-os-kitty", "private-key", "stack trace"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("sanitizes private paths, secrets, signatures, signed URLs, object keys, payloads, and stacks", () => {
    const sanitized = sanitizeRepositoryCampaignWorkflowApiText(
      "rawSignature=abc privateKey=def seed phrase bearer token Bearer xyz api_key=123 signedUrl=https://storage.example/file?token=abc objectKey=exports/raw providerPayload databasePayload stack trace /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/docs/current/spec.md",
    ).toLowerCase();

    for (const unsafe of [
      "rawsignature=abc",
      "privatekey=def",
      "seed phrase",
      "bearer xyz",
      "api_key=123",
      "token=abc",
      "objectkey=exports",
      "providerpayload",
      "databasepayload",
      "stack trace",
      "campaign-os-kitty",
      "docs/current",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
  });
});
