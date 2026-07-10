import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadBackendRuntimeReadinessApiBridgeState,
  seededBackendRuntimePersistencePosture,
  seededBackendRuntimeReadinessSummary,
  type BackendRuntimeReadinessApiBridgeState,
} from "../../../api/backendRuntimeReadinessApiBridge";
import {
  submitExportArtifactDeliveryApiReview,
  type ExportArtifactDeliveryApiBridgeState,
} from "../../../api/exportArtifactDeliveryApiBridge";
import {
  createPublishDeliveryReviewApiSeededFallbackState,
  loadPublishDeliveryReviewApiBridgeState,
  type PublishDeliveryReviewApiBridgeState,
} from "../../../api/publishDeliveryReviewApiBridge";
import {
  createPointsRankingLedgerRuntimeApiSeededFallbackState,
  loadPointsRankingLedgerRuntimeApiBridgeState,
  type PointsRankingLedgerRuntimeApiBridgeState,
} from "../../../api/pointsRankingLedgerRuntimeApiBridge";
import {
  createObjectStorageExportRuntimeApiSeededFallbackState,
  loadObjectStorageExportRuntimeApiBridgeState,
  type ObjectStorageExportRuntimeApiBridgeState,
} from "../../../api/objectStorageExportRuntimeApiBridge";
import {
  createAnalyticsIngestionRuntimeApiSeededFallbackState,
  loadAnalyticsIngestionRuntimeApiBridgeState,
  type AnalyticsIngestionRuntimeApiBridgeState,
} from "../../../api/analyticsIngestionRuntimeApiBridge";
import {
  createContractWriterRuntimeApiSeededFallbackState,
  loadContractWriterRuntimeApiBridgeState,
  type ContractWriterRuntimeApiBridgeState,
} from "../../../api/contractWriterRuntimeApiBridge";
import { App } from "../../../app/App";
import { campaignDetail, EXPORT_CSV_COLUMNS } from "../../../domain";
import { projectConsoleCopy } from "./copy";
import { ProjectConsole } from "./ProjectConsole";

vi.mock("../../../api/exportArtifactDeliveryApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/exportArtifactDeliveryApiBridge")>();

  return {
    ...actual,
    submitExportArtifactDeliveryApiReview: vi.fn(actual.submitExportArtifactDeliveryApiReview),
  };
});

vi.mock("../../../api/backendRuntimeReadinessApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/backendRuntimeReadinessApiBridge")>();

  return {
    ...actual,
    loadBackendRuntimeReadinessApiBridgeState: vi.fn(actual.loadBackendRuntimeReadinessApiBridgeState),
  };
});

vi.mock("../../../api/publishDeliveryReviewApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/publishDeliveryReviewApiBridge")>();

  return {
    ...actual,
    loadPublishDeliveryReviewApiBridgeState: vi.fn(actual.loadPublishDeliveryReviewApiBridgeState),
  };
});

vi.mock("../../../api/pointsRankingLedgerRuntimeApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/pointsRankingLedgerRuntimeApiBridge")>();

  return {
    ...actual,
    loadPointsRankingLedgerRuntimeApiBridgeState: vi.fn(actual.loadPointsRankingLedgerRuntimeApiBridgeState),
  };
});

vi.mock("../../../api/objectStorageExportRuntimeApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/objectStorageExportRuntimeApiBridge")>();

  return {
    ...actual,
    loadObjectStorageExportRuntimeApiBridgeState: vi.fn(actual.loadObjectStorageExportRuntimeApiBridgeState),
  };
});

vi.mock("../../../api/analyticsIngestionRuntimeApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/analyticsIngestionRuntimeApiBridge")>();

  return {
    ...actual,
    loadAnalyticsIngestionRuntimeApiBridgeState: vi.fn(actual.loadAnalyticsIngestionRuntimeApiBridgeState),
  };
});

vi.mock("../../../api/contractWriterRuntimeApiBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/contractWriterRuntimeApiBridge")>();

  return {
    ...actual,
    loadContractWriterRuntimeApiBridgeState: vi.fn(actual.loadContractWriterRuntimeApiBridgeState),
  };
});

const getProjectWorkspaceNav = () =>
  screen.getByRole("navigation", { name: "Project Console workspace navigation" });
const getHeader = () => screen.getByRole("banner");
const getHeaderConnectWalletButton = () =>
  within(getHeader()).getByRole("button", { name: "Connect Wallet" });
const getUserAppConnectWalletButton = () => {
  const header = getHeader();
  const buttons = screen.getAllByRole("button", { name: "Connect Wallet" });
  const userAppButton = buttons.find((button) => !header.contains(button));

  expect(userAppButton).toBeDefined();

  return userAppButton as HTMLElement;
};

const clickWorkspace = (name: string) => {
  fireEvent.click(within(getProjectWorkspaceNav()).getByRole("button", { name }));
};

const exportDeliveryEligibilityRootPacket: NonNullable<ExportArtifactDeliveryApiBridgeState["eligibilityRootPacket"]> = {
  boundary: {
    "en-US":
      "Local eligibility root packet review only. No contract write, wallet signature, storage write, signed URL, provider call, reward custody, reward distribution, or claim execution is performed.",
    "zh-CN": "Local eligibility root packet review only.",
    "zh-TW": "Local eligibility root packet review only.",
  },
  contractWriteEnabled: false,
  eligibleWalletCount: 1,
  evidenceHashes: ["demo-task-bridge-2F4", "demo-task-connect-wallet-2F4"],
  exportBatchId: "export-awaken-sprint-preview",
  generatedMode: "local_review_only",
  mode: "eligibility_root" as const,
  nextAction: {
    "en-US": "Review this deterministic packet before any future P1 contract publication workflow.",
    "zh-CN": "Review this deterministic packet before any future P1 contract publication workflow.",
    "zh-TW": "Review this deterministic packet before any future P1 contract publication workflow.",
  },
  publicationStatus: "not_published",
  rootHash: "local-root-ab568e06",
  rootId: "camp-awaken-sprint-export-awaken-sprint-preview-eligibility-root-v1",
  rootVersion: 1,
  rows: [
    {
      accountType: "AA" as const,
      eligible: true,
      evidenceHashes: ["demo-task-bridge-2F4", "demo-task-connect-wallet-2F4"],
      localePreference: "en-US" as const,
      missingTasks: [],
      rank: 12,
      riskFlags: [],
      totalPoints: 270,
      walletAddress: "2F4...9aB",
      walletSource: "PORTKEY_AA" as const,
    },
  ],
  safety: {
    claimExecutionEnabled: false,
    contractWriteExecuted: false,
    providerCallExecuted: false,
    rewardCustodyEnabled: false,
    rewardDistributionEnabled: false,
    signedUrlGenerated: false,
    storageWriteExecuted: false,
    walletSignatureRequested: false,
  },
  totalRows: 1,
};

const apiDeliveredState = (): ExportArtifactDeliveryApiBridgeState => ({
  artifactId: "export-artifact-local-camp-awaken-sprint",
  auditDetail: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    boundary: {
      "en-US": "Local export artifact registry only.",
      "zh-CN": "Local export artifact registry only.",
      "zh-TW": "Local export artifact registry only.",
    },
    campaignId: campaignDetail.id,
    record: {
      artifactId: "export-artifact-local-camp-awaken-sprint",
      auditEvents: [
        {
          id: "audit-event-registered",
          routeId: "campaigns.export.preview",
          traceId: "trace-export-api-visible",
          type: "registered_local_artifact",
        },
        {
          id: "audit-event-storage-disabled",
          routeId: "campaigns.export.preview",
          traceId: "trace-export-api-visible",
          type: "storage_disabled",
        },
      ],
      batchId: "export-awaken-sprint-preview",
      campaignId: campaignDetail.id,
      checksum: "sha256-api-artifact",
      checksumAlgorithm: "sha256",
      expiresAt: "2026-07-10T00:00:00.000Z",
      retention: {
        mode: "local_review_ttl",
        productionStorageBacked: false,
        purgeRequired: true,
        ttlHours: 24,
      },
      routeId: "campaigns.export.preview",
      traceId: "trace-export-api-visible",
    },
    safety: {
      localReviewOnly: true,
      noDownloadUrl: true,
      noStorageWrite: true,
    },
  },
  auditList: {
    boundary: {
      "en-US": "Local export artifact registry only.",
      "zh-CN": "Local export artifact registry only.",
      "zh-TW": "Local export artifact registry only.",
    },
    campaignId: campaignDetail.id,
    records: [{
      artifactId: "export-artifact-local-camp-awaken-sprint",
      auditEvents: [
        {
          id: "audit-event-registered",
          routeId: "campaigns.export.preview",
          traceId: "trace-export-api-visible",
          type: "registered_local_artifact",
        },
      ],
      batchId: "export-awaken-sprint-preview",
      campaignId: campaignDetail.id,
      checksum: "sha256-api-artifact",
      checksumAlgorithm: "sha256",
      expiresAt: "2026-07-10T00:00:00.000Z",
      retention: {
        mode: "local_review_ttl",
        productionStorageBacked: false,
        purgeRequired: true,
        ttlHours: 24,
      },
      routeId: "campaigns.export.preview",
      traceId: "trace-export-api-visible",
    }],
    summary: {
      activeRecords: 1,
      blockedRows: 0,
      expiredRecords: 0,
      readyRows: 1,
      reviewRequiredRows: 3,
      totalRecords: 1,
      totalRows: 4,
    },
  },
  boundary: {
    "en-US":
      "Local export artifact delivery API review only. No download URL, storage write, signed URL, provider call, contract root write, wallet signing, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
    "zh-CN": "Local export artifact delivery API review only.",
    "zh-TW": "Local export artifact delivery API review only.",
  },
  configured: true,
  contractRootReview: {
    publicationStatus: "not_published",
    requestedMode: "eligibility_root",
    supported: true,
  },
  diagnostics: [],
  eligibilityRootPacket: exportDeliveryEligibilityRootPacket,
  fileHandoff: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    auditDetail: {
      batchId: "export-awaken-sprint-preview",
      checksum: "sha256-file-handoff",
      checksumAlgorithm: "sha256",
      fileName: "camp-awaken-sprint-export-awaken-sprint-preview-api-runtime.csv",
      payloadBytes: 912,
      previewRouteId: "campaigns.export.preview",
      previewTraceId: "trace-export-api-visible",
      retentionState: "active",
      source: "local_api_runtime",
    },
    campaignId: campaignDetail.id,
    handoff: {
      artifactId: "export-artifact-local-camp-awaken-sprint",
      batchId: "export-awaken-sprint-preview",
      boundary: {
        "en-US":
          "Local API payload handoff only. Production object storage is disabled and no signed URL, object key, storage key, provider call, wallet signing, contract write, queue execution, scheduler execution, reward custody, or reward distribution is produced.",
        "zh-CN": "Local API payload handoff only.",
        "zh-TW": "Local API payload handoff only.",
      },
      campaignId: campaignDetail.id,
      checksum: "sha256-file-handoff",
      checksumAlgorithm: "sha256",
      columns: ["wallet_address", "wallet_type", "locale_preference", "points"],
      fileName: "camp-awaken-sprint-export-awaken-sprint-preview-api-runtime.csv",
      format: "csv",
      handoffId: "local-file-handoff-camp-awaken-sprint-csv",
      mimeType: "text/csv",
      payloadBytes: 912,
      payloadText: "wallet_address,wallet_type,locale_preference,points\n2F4...9aB,AA,en-US,270\n",
      retention: {
        expiresAt: "2026-07-10T00:00:00.000Z",
        mode: "local_review_ttl",
        productionStorageBacked: false,
        purgeRequired: true,
        state: "active",
        ttlHours: 24,
      },
      rowCounts: {
        blockedRows: 0,
        readyRows: 1,
        reviewRequiredRows: 3,
        totalRows: 4,
      },
      safety: {
        contractRootWriteEnabled: false,
        downloadUrlEnabled: false,
        forbiddenFieldsAbsent: true,
        localOnly: true,
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
      },
      traceId: "trace-file-handoff-visible",
    },
    safety: {
      contractRootWriteEnabled: false,
      downloadUrlEnabled: false,
      forbiddenFieldsAbsent: true,
      localOnly: true,
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
    },
  },
  loading: false,
  preview: {
    artifact: {
      batchId: "export-awaken-sprint-preview",
      campaignId: campaignDetail.id,
      fileName: "camp-awaken-sprint-export-awaken-sprint-preview-api-review.csv",
      format: "csv",
      metadata: {
        blockedRows: 0,
        checksum: "sha256-api-artifact",
        checksumAlgorithm: "sha256",
        columns: ["wallet_address", "wallet_type", "locale_preference"],
        payloadBytes: 768,
        readyRows: 1,
        reviewRequiredRows: 3,
        totalRows: 4,
      },
      mimeType: "text/csv",
      safety: {
        localOnly: true,
        noContractRoot: true,
        noDownloadUrl: true,
        noRewardDistribution: true,
        noStorageWrite: true,
      },
    },
    artifactRegistry: {
      artifactId: "export-artifact-local-camp-awaken-sprint",
      auditEvents: [
        {
          id: "audit-event-registered",
          routeId: "campaigns.export.preview",
          traceId: "trace-export-api-visible",
          type: "registered_local_artifact",
        },
      ],
      batchId: "export-awaken-sprint-preview",
      campaignId: campaignDetail.id,
      checksum: "sha256-api-artifact",
      checksumAlgorithm: "sha256",
      expiresAt: "2026-07-10T00:00:00.000Z",
      retention: {
        mode: "local_review_ttl",
        productionStorageBacked: false,
        purgeRequired: true,
        ttlHours: 24,
      },
      routeId: "campaigns.export.preview",
      traceId: "trace-export-api-visible",
    },
    blockedRows: 0,
    campaignId: campaignDetail.id,
    columns: ["wallet_address", "wallet_type", "locale_preference"],
    contractRootMode: "eligibility_root",
    eligibilityRootPacket: exportDeliveryEligibilityRootPacket,
    exportBatchId: "export-awaken-sprint-preview",
    format: "csv",
    readyRows: 1,
    reviewRequiredRows: 3,
  },
  registry: {
    artifactId: "export-artifact-local-camp-awaken-sprint",
    auditEvents: [
      {
        id: "audit-event-registered",
        routeId: "campaigns.export.preview",
        traceId: "trace-export-api-visible",
        type: "registered_local_artifact",
      },
    ],
    batchId: "export-awaken-sprint-preview",
    campaignId: campaignDetail.id,
    checksum: "sha256-api-artifact",
    checksumAlgorithm: "sha256",
    expiresAt: "2026-07-10T00:00:00.000Z",
    retention: {
      mode: "local_review_ttl",
      productionStorageBacked: false,
      purgeRequired: true,
      ttlHours: 24,
    },
    routeId: "campaigns.export.preview",
    traceId: "trace-export-api-visible",
  },
  request: {
    campaignId: campaignDetail.id,
    contractRootMode: "eligibility_root",
    format: "csv",
    includeLocalePreference: true,
    includeRiskFlags: true,
    includeWalletType: true,
  },
  source: "api_runtime",
  status: "delivered",
  traceId: "trace-export-api-visible",
});

const backendReadinessApiState = (): BackendRuntimeReadinessApiBridgeState => ({
  boundary: {
    "en-US": "Local Campaign OS backend runtime readiness review only. No live provider call.",
    "zh-CN": "Local Campaign OS backend runtime readiness review only.",
    "zh-TW": "Local Campaign OS backend runtime readiness review only.",
  },
  configured: true,
  diagnostics: [],
  loading: false,
  persistencePosture: {
    ...seededBackendRuntimePersistencePosture,
    adapterLabel: "local_json:campaign-os-review-state",
    latestRecords: [
      {
        kind: "export_preview",
        routeId: "campaigns.export.preview",
        traceId: "trace-safe-export-preview",
      },
      {
        kind: "wallet_session",
        routeId: "wallet.session.create",
        traceId: "trace-safe-wallet-session",
      },
    ],
    mode: "local_json",
    recordCount: 3,
    safety: {
      durable: true,
      localOnly: true,
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
    },
    status: "durable_local",
    statusLabel: {
      "en-US": "Durable local review persistence",
      "zh-CN": "Durable local review persistence",
      "zh-TW": "Durable local review persistence",
    },
  },
  source: "api_runtime",
  status: "ready",
  summary: {
    ...seededBackendRuntimeReadinessSummary,
    profile: {
      ...seededBackendRuntimeReadinessSummary.profile,
      id: "staging-scaffold",
      label: "Staging scaffold backend profile",
      status: "scaffold",
      supportMode: "api_runtime",
    },
    routeCoverage: {
      ...seededBackendRuntimeReadinessSummary.routeCoverage,
      coveredApiSkillCount: 17,
      missingApiSkillIds: ["runtime.production.database"],
      requiredApiSkillCount: 18,
    },
  },
  traceId: "trace-backend-api-visible",
});

const publishDeliveryReviewApiState = (): PublishDeliveryReviewApiBridgeState => {
  const state = createPublishDeliveryReviewApiSeededFallbackState(campaignDetail.id, "trace-publish-api-visible");

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 32,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-publish-api-visible",
    review: {
      ...state.review,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-publish-api-visible",
    },
  };
};

const pointsRankingLedgerRuntimeApiState = (): PointsRankingLedgerRuntimeApiBridgeState => {
  const state = createPointsRankingLedgerRuntimeApiSeededFallbackState(campaignDetail.id, "trace-ledger-api-visible");

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 33,
    source: "api_runtime",
    status: "review_required",
    traceId: "trace-ledger-api-visible",
    runtime: {
      ...state.runtime,
      source: "api_runtime",
      status: "review_required",
      traceId: "trace-ledger-api-visible",
    },
    review: {
      ...state.review,
      source: "api_runtime",
      status: "review_required",
      traceId: "trace-ledger-api-visible",
    },
  };
};

const objectStorageExportRuntimeApiState = (): ObjectStorageExportRuntimeApiBridgeState => {
  const state = createObjectStorageExportRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-storage-api-visible",
  );

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 34,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-storage-api-visible",
    readiness: {
      ...state.readiness,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-storage-api-visible",
    },
  };
};

const analyticsIngestionRuntimeApiState = (): AnalyticsIngestionRuntimeApiBridgeState => {
  const state = createAnalyticsIngestionRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-analytics-api-visible",
  );

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 35,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-analytics-api-visible",
    readiness: {
      ...state.readiness,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-analytics-api-visible",
    },
  };
};

const contractWriterRuntimeApiState = (): ContractWriterRuntimeApiBridgeState => {
  const state = createContractWriterRuntimeApiSeededFallbackState(
    campaignDetail.id,
    "trace-contract-writer-api-visible",
  );

  return {
    ...state,
    configured: true,
    diagnostics: [],
    routeCount: 36,
    source: "api_runtime",
    status: "blocked",
    traceId: "trace-contract-writer-api-visible",
    readiness: {
      ...state.readiness,
      source: "server_runtime",
      status: "blocked",
      traceId: "trace-contract-writer-api-visible",
    },
  };
};

describe("Project Console shell", () => {
  const originalApiBaseUrl = import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL;
  const mockedSubmitExportArtifactDeliveryApiReview = vi.mocked(submitExportArtifactDeliveryApiReview);
  const mockedLoadBackendRuntimeReadinessApiBridgeState = vi.mocked(loadBackendRuntimeReadinessApiBridgeState);
  const mockedLoadPublishDeliveryReviewApiBridgeState = vi.mocked(loadPublishDeliveryReviewApiBridgeState);
  const mockedLoadPointsRankingLedgerRuntimeApiBridgeState = vi.mocked(loadPointsRankingLedgerRuntimeApiBridgeState);
  const mockedLoadObjectStorageExportRuntimeApiBridgeState = vi.mocked(loadObjectStorageExportRuntimeApiBridgeState);
  const mockedLoadAnalyticsIngestionRuntimeApiBridgeState = vi.mocked(loadAnalyticsIngestionRuntimeApiBridgeState);
  const mockedLoadContractWriterRuntimeApiBridgeState = vi.mocked(loadContractWriterRuntimeApiBridgeState);

  beforeEach(() => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "";
    mockedSubmitExportArtifactDeliveryApiReview.mockReset();
    mockedLoadBackendRuntimeReadinessApiBridgeState.mockReset();
    mockedLoadPublishDeliveryReviewApiBridgeState.mockReset();
    mockedLoadPointsRankingLedgerRuntimeApiBridgeState.mockReset();
    mockedLoadObjectStorageExportRuntimeApiBridgeState.mockReset();
    mockedLoadAnalyticsIngestionRuntimeApiBridgeState.mockReset();
    mockedLoadContractWriterRuntimeApiBridgeState.mockReset();
    mockedLoadBackendRuntimeReadinessApiBridgeState.mockResolvedValue(backendReadinessApiState());
    mockedLoadPublishDeliveryReviewApiBridgeState.mockResolvedValue(publishDeliveryReviewApiState());
    mockedLoadPointsRankingLedgerRuntimeApiBridgeState.mockResolvedValue(pointsRankingLedgerRuntimeApiState());
    mockedLoadObjectStorageExportRuntimeApiBridgeState.mockResolvedValue(objectStorageExportRuntimeApiState());
    mockedLoadAnalyticsIngestionRuntimeApiBridgeState.mockResolvedValue(analyticsIngestionRuntimeApiState());
    mockedLoadContractWriterRuntimeApiBridgeState.mockResolvedValue(contractWriterRuntimeApiState());
  });

  afterEach(() => {
    window.localStorage.clear();
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = originalApiBaseUrl;
  });

  it("renders Campaigns as the default workspace with seeded operational data", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Project Console" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const nav = getProjectWorkspaceNav();
    for (const workspace of ["Campaigns", "States", "Create", "Templates", "Participants", "AI Content", "Analytics", "Export", "Verification Rules", "Closeout", "Settings"]) {
      expect(within(nav).getByRole("button", { name: workspace })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("button", { name: "Campaigns" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(screen.getByText("Connected wallets")).toBeInTheDocument();
    expect(getHeaderConnectWalletButton()).toBeInTheDocument();
    expect(within(getHeader()).queryByText("AA · Portkey")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campaign Command Center" })).toBeInTheDocument();
    expect(screen.getByText("4 campaigns")).toBeInTheDocument();
    expect(screen.getByText("Review live analytics")).toBeInTheDocument();
    expect(screen.getByText("Review launch readiness")).toBeInTheDocument();
    expect(screen.getByText("Approve export preview")).toBeInTheDocument();
    expect(screen.getByText("Archive final report")).toBeInTheDocument();
    expect(screen.getByText("Forest NFT Quest")).toBeInTheDocument();
    expect(screen.getByText("TMRWDAO Governance Streak")).toBeInTheDocument();
    expect(screen.getByText("eBridge Onboarding Wave")).toBeInTheDocument();
    const lifecycleOperations = screen.getByLabelText("Lifecycle operations");
    expect(
      within(lifecycleOperations).getByRole("heading", { name: "Lifecycle operations" }),
    ).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Current status")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Live")).toBeInTheDocument();
    expect(within(lifecycleOperations).getAllByText(/launch blockers/).length).toBeGreaterThan(0);
    expect(within(lifecycleOperations).getAllByText("Owner action").length).toBeGreaterThan(0);
    expect(within(lifecycleOperations).getByText("Publish campaign")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Mark export readiness")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText("Archive campaign")).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText(/Lifecycle local-only boundary/)).toBeInTheDocument();
    expect(within(lifecycleOperations).getByText(/No live backend, scheduler, wallet signing/)).toBeInTheDocument();
    const launchBundles = screen.getByLabelText("Launch Console campaign bundles");
    expect(
      within(launchBundles).getByRole("heading", { name: "Launch Console campaign bundles" }),
    ).toBeInTheDocument();
    expect(within(launchBundles).getByText("Pre-launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Post-launch bundle")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Wallet connect readiness")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Verified ecosystem action")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Winner export preview")).toBeInTheDocument();
    expect(within(launchBundles).getByText("Create campaign draft")).toBeInTheDocument();
    expect(within(launchBundles).getAllByText("verify_task").length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText("Local only").length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/No live Launch Console/).length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/no automatic campaign creation or publish/).length).toBeGreaterThan(0);
    expect(within(launchBundles).getAllByText(/no external API/i).length).toBeGreaterThan(0);
    expect(within(launchBundles).queryByText(/automatically creates campaigns/i)).not.toBeInTheDocument();
    expect(within(launchBundles).queryByText(/publishes through a live Launch Console/i)).not.toBeInTheDocument();
    const portfolioReadiness = screen.getByLabelText("Project portfolio readiness");
    expect(
      within(portfolioReadiness).getByRole("heading", { name: "Project portfolio readiness" }),
    ).toBeInTheDocument();
    for (const metric of [
      "Campaigns created",
      "Active projects",
      "Campaign setup time",
      "Reward budget committed",
      "Winner exports",
      "Repeat project usage",
    ]) {
      expect(within(portfolioReadiness).getByText(metric)).toBeInTheDocument();
    }
    expect(within(portfolioReadiness).getAllByText("Commercial readiness").length).toBeGreaterThan(0);
    expect(within(portfolioReadiness).getByText("Partner campaign fee")).toBeInTheDocument();
    expect(within(portfolioReadiness).getByText("Premium analytics")).toBeInTheDocument();
    expect(within(portfolioReadiness).getByText(/No live billing, payment, invoice, CRM, reward custody/)).toBeInTheDocument();
    expect(within(portfolioReadiness).getAllByText(/Reward budget is project or partner committed only/).length).toBeGreaterThan(0);
    expect(within(portfolioReadiness).queryByText(/invoice id/i)).not.toBeInTheDocument();
    expect(within(portfolioReadiness).queryByText(/payment id/i)).not.toBeInTheDocument();
    const apiUsageReadiness = screen.getByLabelText("API usage commercialization readiness");
    expect(
      within(apiUsageReadiness).getByRole("heading", {
        name: "API usage commercialization readiness",
      }),
    ).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText("verify_task")).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText("export_winners")).toBeInTheDocument();
    expect(within(apiUsageReadiness).getAllByText("Auth / key: Blocked").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getAllByText("Rate-limit: Blocked").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getAllByText("Billing handoff: Blocked").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getByText(/does not custody rewards/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/aelf-funded reward subsidies/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/No live API gateway/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/API key/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getAllByText(/billing/).length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getByText(/export file/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/contract call\/write/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/reward distribution/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).queryByText("Production ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Analytics & Export Decision" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Task template library" })).not.toBeInTheDocument();
  });

  it("renders API usage commercialization readiness in Chinese", () => {
    render(<ProjectConsole campaign={campaignDetail} locale="zh-CN" />);

    const apiUsageReadiness = screen.getByLabelText("API usage 商业化 readiness");

    expect(
      within(apiUsageReadiness).getByRole("heading", {
        name: "API usage 商业化 readiness",
      }),
    ).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText("API usage 候选项")).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText("verify_task")).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText("export_winners")).toBeInTheDocument();
    expect(within(apiUsageReadiness).getAllByText("认证 / key: 阻断").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getAllByText("限流: 阻断").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getAllByText("Billing handoff: 阻断").length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getByText(/不托管奖励/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/实时 API gateway/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/API key/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getAllByText(/billing/).length).toBeGreaterThan(0);
    expect(within(apiUsageReadiness).getByText(/导出文件/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getByText(/合约调用\/写入/)).toBeInTheDocument();
    expect(within(apiUsageReadiness).getAllByText(/发奖/).length).toBeGreaterThan(0);
  });

  it("renders AI draft and human review lifecycle states with review-safe owner actions", () => {
    const aiDraftCampaign = {
      ...campaignDetail,
      status: "ai_draft",
    } satisfies typeof campaignDetail;

    const { rerender } = render(
      <ProjectConsole campaign={aiDraftCampaign} locale="en-US" />,
    );

    const aiDraftCommandCenter = screen.getByLabelText("Campaign Command Center");
    const aiDraftLifecycle = screen.getByLabelText("Lifecycle operations");

    expect(within(aiDraftCommandCenter).getByText("AI Draft")).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getByText("AI Draft")).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getByText(/AI Draft\s*->\s*Human Review/)).toBeInTheDocument();
    expect(within(aiDraftLifecycle).getAllByText("Submit for human review").length).toBeGreaterThan(0);
    expect(
      within(aiDraftLifecycle).getAllByText(/Confirm reward, eligibility, risk, i18n, and contract review/).length,
    ).toBeGreaterThan(0);

    rerender(
      <ProjectConsole
        campaign={{ ...campaignDetail, status: "human_review" }}
        locale="en-US"
      />,
    );

    const humanReviewCommandCenter = screen.getByLabelText("Campaign Command Center");
    const humanReviewLifecycle = screen.getByLabelText("Lifecycle operations");

    expect(within(humanReviewCommandCenter).getByText("Human Review")).toBeInTheDocument();
    expect(within(humanReviewLifecycle).getByText("Human Review")).toBeInTheDocument();
    expect(within(humanReviewLifecycle).getAllByText("Schedule campaign").length).toBeGreaterThan(0);
    expect(within(humanReviewLifecycle).getAllByText("Publish campaign").length).toBeGreaterThan(0);
    expect(
      within(humanReviewLifecycle).getAllByText(/Complete human review and launch gates before scheduling/).length,
    ).toBeGreaterThan(0);
    expect(
      within(humanReviewLifecycle).getAllByText(/Complete launch-blocking checks before go-live/).length,
    ).toBeGreaterThan(0);
  });

  it("switches to States workspace and renders state component delivery coverage", () => {
    render(<App />);

    clickWorkspace("States");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "States" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const gallery = screen.getByLabelText("State Components Delivery Gallery");
    expect(
      within(gallery).getByRole("heading", { name: "State Components Delivery Gallery" }),
    ).toBeInTheDocument();
    expect(within(gallery).getByText("State families")).toBeInTheDocument();
    expect(within(gallery).getByText("Covered states")).toBeInTheDocument();
    expect(within(gallery).getByText("Review-required states")).toBeInTheDocument();
    expect(within(gallery).getByText("Blocked states")).toBeInTheDocument();

    for (const family of [
      "Campaign",
      "Task Verification",
      "Eligibility",
      "i18n Content",
      "Wallet/QA",
      "Export/Modal",
      "Toast/Notification",
      "Blocked Publish",
    ]) {
      expect(within(gallery).getByRole("heading", { name: family })).toBeInTheDocument();
    }

    for (const stateLabel of ["Loading", "Empty", "Error", "Missing", "AI Draft", "Reviewed", "Published", "Fallback"]) {
      expect(within(gallery).getByText(stateLabel)).toBeInTheDocument();
    }

    expect(within(gallery).getByText(/No live sync is running/)).toBeInTheDocument();
    expect(within(gallery).getByText(/Clear filters, add seeded participants/)).toBeInTheDocument();
    expect(within(gallery).getByText(/Retry the local preview, check seeded data/)).toBeInTheDocument();
    expect(within(gallery).getByText("Failed")).toBeInTheDocument();
    expect(within(gallery).getByText(/Retry verification, go to bridge, complete swap/)).toBeInTheDocument();
    expect(within(gallery).getAllByText(/Export winners does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(gallery).getAllByText(/Final rewards are handled by the campaign project/).length).toBeGreaterThan(0);
    expect(within(gallery).getByText(/Contract claim mode requires admin approval/)).toBeInTheDocument();
    expect(within(gallery).getByText(/v0.1 full UI design screen 15 state delivery/)).toBeInTheDocument();
    expect(within(gallery).getByText(/v0.2 interaction design i18n state requirements/)).toBeInTheDocument();
    expect(within(gallery).getByText(/No live backend or API call/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no wallet signing/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no export file generation/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no contract write/)).toBeInTheDocument();
    expect(within(gallery).getByText(/no reward custody/)).toBeInTheDocument();
    expect(
      within(gallery).queryByRole("button", {
        name: /publish|export|contract|reward|crawl|sync|sign/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Participants workspace and renders seeded operations boundaries", () => {
    render(<App />);

    clickWorkspace("Participants");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Participants" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const participants = screen.getByLabelText("Participant operations");
    expect(
      within(participants).getByRole("heading", { name: "Participant operations" }),
    ).toBeInTheDocument();
    expect(within(participants).getByLabelText("Participant summary")).toBeInTheDocument();
    expect(within(participants).getByText("Wallet mix")).toBeInTheDocument();
    expect(within(participants).getByText("Locale mix")).toBeInTheDocument();
    expect(within(participants).getByText("2F4...9aB")).toBeInTheDocument();
    expect(within(participants).getByText("3E9...7cD")).toBeInTheDocument();
    expect(within(participants).getByText("5N1...4fA")).toBeInTheDocument();
    expect(within(participants).getByText("7P8...2bE")).toBeInTheDocument();
    expect(within(participants).getAllByText("Export ready").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(participants).getAllByText("Pending").length).toBeGreaterThan(0);
    expect(within(participants).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(participants).getByText("referral_velocity_review")).toBeInTheDocument();
    expect(within(participants).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(participants).queryByRole("button", { name: /distribute|reward/i })).not.toBeInTheDocument();

    const serviceReadiness = screen.getByLabelText("Points / Ranking / Referral Service Readiness");
    expect(
      within(serviceReadiness).getByRole("heading", {
        name: "Points / Ranking / Referral Service Readiness",
      }),
    ).toBeInTheDocument();
    for (const lane of [
      "Points ledger",
      "Ranking",
      "Referral",
      "Pixiepoints/backend handoff",
    ]) {
      expect(within(serviceReadiness).getByRole("heading", { name: lane })).toBeInTheDocument();
    }
    expect(within(serviceReadiness).getByText("Raw invites")).toBeInTheDocument();
    expect(within(serviceReadiness).getByText("Qualified invitees")).toBeInTheDocument();
    expect(within(serviceReadiness).getAllByText(/qualified invitees/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getByText(/Raw invites: 22/)).toBeInTheDocument();
    expect(within(serviceReadiness).getByText(/Only qualified invitees/)).toBeInTheDocument();
    expect(within(serviceReadiness).getAllByText(/no live points ledger/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/no live Referral backend/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(within(serviceReadiness).getAllByText(/review input/).length).toBeGreaterThan(0);
    expect(
      within(serviceReadiness).queryByRole("button", { name: /write|settle|claim|reward|contract/i }),
    ).not.toBeInTheDocument();
  });

  it("switches to Settings workspace and keeps readiness read-only", () => {
    render(<App />);

    clickWorkspace("Settings");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Settings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const settings = screen.getByLabelText("Settings readiness");
    expect(
      within(settings).getByRole("heading", { name: "Settings readiness" }),
    ).toBeInTheDocument();
    expect(within(settings).getByLabelText("Settings summary")).toBeInTheDocument();
    for (const group of [
      "Wallet policy",
      "Contract mode",
      "Reward responsibility",
      "i18n fallback",
      "Verification and risk posture",
      "Export policy",
      "Publish prerequisites",
    ]) {
      expect(within(settings).getByText(group)).toBeInTheDocument();
    }
    expect(within(settings).getAllByText("Ready").length).toBeGreaterThan(0);
    expect(within(settings).getAllByText("Review required").length).toBeGreaterThan(0);
    expect(within(settings).getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(within(settings).getByText(/Read-only seeded\/local campaign settings readiness/)).toBeInTheDocument();
    expect(within(settings).getByText(/No live settings save/)).toBeInTheDocument();
    expect(within(settings).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    expect(within(settings).queryByRole("button", { name: /save|update|publish/i })).not.toBeInTheDocument();
  });

  it("switches to Closeout workspace and keeps retrospective review local-only", () => {
    render(<App />);

    clickWorkspace("Closeout");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Closeout" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const closeout = screen.getByLabelText("Post-campaign retrospective");
    expect(
      within(closeout).getByRole("heading", { name: "Post-campaign retrospective" }),
    ).toBeInTheDocument();
    expect(within(closeout).getByLabelText("Closeout summary")).toBeInTheDocument();
    expect(within(closeout).getByLabelText("Closeout gates")).toBeInTheDocument();
    for (const gate of [
      "Analytics summary",
      "AI winner report review",
      "Export readiness",
      "Risk review",
      "Reward responsibility acknowledgement",
      "Final report archive",
      "Next-campaign recommendation",
    ]) {
      expect(within(closeout).getByText(gate)).toBeInTheDocument();
    }
    expect(within(closeout).getByLabelText("AI retrospective")).toBeInTheDocument();
    expect(within(closeout).getByText("Winner report")).toBeInTheDocument();
    expect(within(closeout).getByText("Human review required")).toBeInTheDocument();
    expect(within(closeout).getAllByText(/Reward responsibility/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/No live analytics/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/no reward custody or distribution/).length).toBeGreaterThan(0);
    expect(within(closeout).getAllByText(/does not distribute rewards/).length).toBeGreaterThan(0);
    expect(
      within(closeout).queryByRole("button", {
        name: /distribute|claim|archive|export file|contract/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Create workspace and preserves the builder flow", () => {
    render(<App />);

    clickWorkspace("Create");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Create" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const step of ["Goal", "Tasks", "Rewards & Eligibility", "i18n", "Contract", "Publish readiness"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Campaign Builder").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AI Campaign Planner").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Draft overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Rewards and eligibility setup" })).toBeInTheDocument();
    expect(screen.getByText("Campaign project")).toBeInTheDocument();
    expect(screen.getByText("Task points")).toBeInTheDocument();
    expect(screen.getByText("Top N")).toBeInTheDocument();
    expect(
      screen.getAllByText("High-reward social-heavy campaigns need risk review.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "i18n, contract, and review gates" })).toBeInTheDocument();
    expect(screen.getByLabelText("Translation Manager")).toBeInTheDocument();
    expect(screen.getAllByText("English source content").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinese AI draft").length).toBeGreaterThan(0);
    const rewardReviewGate = screen.getByLabelText("Reward disclaimer review");
    expect(within(rewardReviewGate).getByText("Review every localized reward disclaimer before publish.")).toBeInTheDocument();
    expect(within(rewardReviewGate).getAllByText("Blocks publish").length).toBeGreaterThan(0);
    expect(
      within(rewardReviewGate).getAllByText("Localized reward disclaimer is missing and blocks publish.").length,
    ).toBeGreaterThan(0);
    expect(within(rewardReviewGate).getAllByText("Rewards are provided by the campaign project. Export winners does not distribute rewards.").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("AI generated translation cannot auto-publish before human review.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Chinese draft falls back to English until a project owner completes human review."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Compare with English")).toBeInTheDocument();
    expect(screen.getByText("Source and draft comparison")).toBeInTheDocument();
    expect(screen.getAllByText("Translation draft · zh-CN").length).toBeGreaterThan(0);
    for (const action of ["Generate with AI", "Compare with English", "Mark reviewed", "Publish revision", "Use English fallback"]) {
      expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Contract Impact Review")).toBeInTheDocument();
    expect(screen.getByText("Safe default for MVP; no contract migration is required.")).toBeInTheDocument();
    expect(screen.getByText("Future / planned")).toBeInTheDocument();
    expect(screen.getByText("High-impact manual review blocker")).toBeInTheDocument();
    expect(
      screen.getByText("This review workbench does not distribute rewards, take reward custody, or execute contract transactions."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publish readiness" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Contract claim mode requires high-impact manual review.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Switch to Off-chain MVP or complete contract reviewer approval.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Publish Gate Decision Center" })).toBeInTheDocument();
    expect(screen.getAllByText("Launch gate").length).toBeGreaterThan(0);
    expect(screen.getByText("Approval routing")).toBeInTheDocument();
    expect(screen.getByText("Any wallet allows AA and EOA users to participate.")).toBeInTheDocument();
    expect(screen.getByText(/No real publish/i)).toBeInTheDocument();
    expect(screen.getAllByText("Task Builder Preview").length).toBeGreaterThan(0);
    expect(screen.getByText("i18n Translation Review")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Task template library" })).not.toBeInTheDocument();
  });

  it("edits the Create workspace draft locally and routes it into builder readiness", () => {
    render(<App />);

    clickWorkspace("Create");

    const composer = screen.getByLabelText("Local campaign draft composer");
    fireEvent.click(within(composer).getByRole("button", { name: "Form mode" }));
    fireEvent.change(within(composer).getByLabelText("Campaign name"), {
      target: { value: "DAO Builder Sprint" },
    });
    fireEvent.change(within(composer).getByLabelText("Project name"), {
      target: { value: "TMRWDAO" },
    });
    fireEvent.change(within(composer).getByLabelText("Objective"), {
      target: { value: "dao" },
    });

    const builder = screen.getByLabelText("Campaign Builder");
    expect(within(builder).getByText("DAO Builder Sprint")).toBeInTheDocument();
    expect(within(builder).getByText("TMRWDAO")).toBeInTheDocument();
    expect(within(builder).getByText("dao")).toBeInTheDocument();

    fireEvent.click(within(composer).getByLabelText("Bridge with eBridge"));
    fireEvent.click(within(composer).getByLabelText("Swap on Awaken"));
    expect(
      screen.getAllByText("Task mix needs at least one on-chain or dApp API verification anchor.")
        .length,
    ).toBeGreaterThan(0);

    fireEvent.change(within(composer).getByLabelText("Wallet policy"), {
      target: { value: "AA_ONLY" },
    });
    expect(screen.getAllByText("Campaign is restricted to AA wallets.").length).toBeGreaterThan(0);

    fireEvent.click(within(composer).getByLabelText("zh-CN"));
    const activeLocales = within(composer).getByLabelText("Active draft locales");
    expect(within(activeLocales).getByText("en-US")).toBeInTheDocument();
    expect(within(activeLocales).queryByText("zh-CN")).not.toBeInTheDocument();

    fireEvent.change(within(composer).getByLabelText("AI prompt"), {
      target: {
        value: "Create a two week DAO governance campaign for voters with proposal tasks",
      },
    });
    fireEvent.click(within(composer).getByRole("button", { name: "Generate local outline" }));

    expect(within(composer).getByText("Campaign title: DAO Governance Sprint.")).toBeInTheDocument();
    expect(within(composer).getByText("Human review required")).toBeInTheDocument();
    expect(screen.getAllByText("Vote in DAO proposal").length).toBeGreaterThan(0);

    fireEvent.click(within(composer).getByLabelText("Human review acknowledged"));
    expect(within(composer).getByText("Human reviewed")).toBeInTheDocument();

    fireEvent.click(within(composer).getByRole("button", { name: "Reset to Awaken baseline" }));
    expect(within(composer).getByLabelText("Campaign name")).toHaveValue("Awaken Summer Sprint");
    expect(screen.getAllByText("Awaken Summer Sprint").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Any wallet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps Create workspace composer copy complete across supported business locales", () => {
    expect(projectConsoleCopy["en-US"].createDraftComposer).toBe(
      "Local campaign draft composer",
    );
    expect(projectConsoleCopy["zh-CN"].createDraftComposer).toBe("本地活动草稿编辑器");
    expect(projectConsoleCopy["zh-TW"].createDraftComposer).toBe("本地活動草稿編輯器");

    for (const locale of ["en-US", "zh-CN", "zh-TW"] as const) {
      expect(projectConsoleCopy[locale].createDraftLocalBoundary).toBeTruthy();
      expect(projectConsoleCopy[locale].createDraftGenerateOutline).toBeTruthy();
      expect(projectConsoleCopy[locale].createDraftReset).toBeTruthy();
    }
  });

  it("switches to Verification Rules workspace and renders rule review boundaries", () => {
    render(<App />);

    clickWorkspace("Verification Rules");

    const nav = getProjectWorkspaceNav();
    expect(within(nav).getByRole("button", { name: "Verification Rules" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const workspace = screen.getByLabelText("Verification Rules workspace");
    expect(within(workspace).getByRole("heading", { name: "Verification Rules" })).toBeInTheDocument();
    expect(within(workspace).getAllByText("7").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Total paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Seeded/local coverage").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Missing live evidence").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Blocked paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Manual review paths").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Provider launch blockers").length).toBeGreaterThan(0);

    expect(within(workspace).getAllByText("AeFinder on-chain verification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Social API verification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Manual review").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("Referral qualification").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText("needs verified invitee").length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/qualified invitees/).length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/Fallback/).length).toBeGreaterThan(0);
    expect(within(workspace).getAllByText(/Feature gate/).length).toBeGreaterThan(0);
    expect(within(workspace).getByText(/No live provider API call/)).toBeInTheDocument();
    expect(within(workspace).getByText(/wallet signing/)).toBeInTheDocument();
    expect(within(workspace).getByText(/contract root write/)).toBeInTheDocument();
    expect(within(workspace).getByText(/export file generation/)).toBeInTheDocument();
    expect(within(workspace).getByText(/reward distribution/)).toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", {
        name: /sign|contract|export|reward|distribute|claim|write/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches to Templates workspace and keeps template compatibility signals", () => {
    render(<App />);

    clickWorkspace("Templates");

    expect(screen.getByRole("heading", { name: "Campaign Template Pack" })).toBeInTheDocument();
    for (const presetName of [
      "aelf Onboarding Campaign",
      "Awaken Liquidity Challenge",
      "NFT Holder Quest",
      "DAO Governance Campaign",
      "AI Agent Coin Launch Campaign",
    ]) {
      expect(screen.getByText(presetName)).toBeInTheDocument();
    }
    expect(screen.getByText(/no live provider verification/i)).toBeInTheDocument();
    expect(screen.getByText(/automatic campaign creation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/reward custody/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Campaign OS provides preset guidance/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Task template library" })).toBeInTheDocument();
    const forestReadiness = screen.getByLabelText("Forest NFT task readiness");
    expect(
      within(forestReadiness).getByRole("heading", { name: "Forest NFT task readiness" }),
    ).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT mint readiness")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT holder evidence")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT trade/listing review")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest holder leaderboard review")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(forestReadiness).getAllByText("DAPP_API · holder_snapshot").length,
    ).toBeGreaterThan(0);
    expect(
      within(forestReadiness).getAllByText("DAPP_API · forest_marketplace_event").length,
    ).toBeGreaterThan(0);
    expect(
      within(forestReadiness).getAllByText("DAPP_API · forest_nft_contract_event").length,
    ).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/No live Forest service\/API/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/NFT marketplace\/indexer/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/NFT mint execution/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/NFT trade\/listing execution/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    const ebridgeReadiness = screen.getByLabelText("eBridge task readiness");
    expect(
      within(ebridgeReadiness).getByRole("heading", { name: "eBridge task readiness" }),
    ).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge intent readiness")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge amount threshold review")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge on-chain evidence")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Awaken unlock dependency")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge eligibility impact")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("ON_CHAIN · seeded_local")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · ebridge_api")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("ON_CHAIN · aefinder_on_chain")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · awaken_unlock_rule")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · eligibility_engine")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getAllByText(/No live eBridge service\/API/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/bridge transaction/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/asset transfer/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/export generation/).length).toBeGreaterThan(0);
    const awakenReadiness = screen.getByLabelText("Awaken swap / liquidity task readiness");
    expect(
      within(awakenReadiness).getByRole("heading", { name: "Awaken swap / liquidity task readiness" }),
    ).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken swap readiness")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken liquidity add review")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken LP hold evidence")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Bridge unlock dependency")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken ranking eligibility impact")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("ON_CHAIN · awaken_swap_event")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · lp_position_snapshot")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · bridge_unlock_rule")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · ranking_engine")).toBeInTheDocument();
    expect(within(awakenReadiness).getAllByText(/No live Awaken API/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/DEX\/indexer\/provider/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/swap transaction/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/LP add\/remove/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/asset transfer/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/export generation/).length).toBeGreaterThan(0);
    const schrodingerReadiness = screen.getByLabelText("Schrödinger NFT task readiness");
    expect(
      within(schrodingerReadiness).getByRole("heading", { name: "Schrödinger NFT task readiness" }),
    ).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT adopt readiness")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT holder evidence")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT trade/listing review")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger holder leaderboard review")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(schrodingerReadiness).getAllByText("DAPP_API · project_api").length,
    ).toBeGreaterThan(0);
    expect(
      within(schrodingerReadiness).getAllByText("DAPP_API · schrodinger_trade_listing_event").length,
    ).toBeGreaterThan(0);
    expect(
      within(schrodingerReadiness).getAllByText("DAPP_API · holder_leaderboard").length,
    ).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/No live Schrödinger service\/API/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/project API/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/NFT marketplace\/indexer/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/NFT adopt execution/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/NFT trade\/listing execution/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    const daippReadiness = screen.getByLabelText("daipp Agent Coin task readiness");
    expect(
      within(daippReadiness).getByRole("heading", { name: "daipp Agent Coin task readiness" }),
    ).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent page visit readiness")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent interaction evidence")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent coin buy/hold review")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("AI intro share review")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Launch leaderboard review")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(daippReadiness).getAllByText("DAPP_API · agent_interaction_log").length,
    ).toBeGreaterThan(0);
    expect(
      within(daippReadiness).getAllByText("DAPP_API · daipp_contract_event").length,
    ).toBeGreaterThan(0);
    expect(
      within(daippReadiness).getAllByText("DAPP_API · ai_intro_share_review").length,
    ).toBeGreaterThan(0);
    expect(
      within(daippReadiness).getAllByText("DAPP_API · launch_leaderboard").length,
    ).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/No live daipp service\/API/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/agent execution/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/AI generation/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/token launch/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/token buy\/hold\/transfer/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    const forecastReadiness = screen.getByLabelText("Forecast campaign task readiness");
    expect(
      within(forecastReadiness).getByRole("heading", { name: "Forecast campaign task readiness" }),
    ).toBeInTheDocument();
    expect(within(forecastReadiness).getByText("Prediction participation")).toBeInTheDocument();
    expect(within(forecastReadiness).getByText("Win streak")).toBeInTheDocument();
    expect(within(forecastReadiness).getByText("Forecast leaderboard")).toBeInTheDocument();
    expect(within(forecastReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(forecastReadiness).getAllByText("DAPP_API · forecast_app_data").length,
    ).toBeGreaterThan(0);
    expect(within(forecastReadiness).getAllByText(/No live Forecast API/).length).toBeGreaterThan(0);
    expect(within(forecastReadiness).getAllByText(/prediction transaction/).length).toBeGreaterThan(0);
    expect(within(forecastReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    const payReadiness = screen.getByLabelText("Pay campaign task readiness");
    expect(
      within(payReadiness).getByRole("heading", { name: "Pay campaign task readiness" }),
    ).toBeInTheDocument();
    expect(within(payReadiness).getByText("Invoice completion")).toBeInTheDocument();
    expect(within(payReadiness).getByText("Payment link completion")).toBeInTheDocument();
    expect(within(payReadiness).getByText("Pay follow-up handoff")).toBeInTheDocument();
    expect(within(payReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(payReadiness).getAllByText("DAPP_API · aelf_pay_status").length,
    ).toBeGreaterThan(0);
    expect(within(payReadiness).getAllByText(/No live Pay service/).length).toBeGreaterThan(0);
    expect(within(payReadiness).getAllByText(/payment transaction/).length).toBeGreaterThan(0);
    expect(within(payReadiness).getAllByText(/payment link creation/).length).toBeGreaterThan(0);
    expect(within(payReadiness).getAllByText(/invoice generation/).length).toBeGreaterThan(0);
    expect(within(payReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    const tmrwdaoReadiness = screen.getByLabelText("TMRWDAO governance task readiness");
    expect(
      within(tmrwdaoReadiness).getByRole("heading", { name: "TMRWDAO governance task readiness" }),
    ).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("DAO join readiness")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("Proposal summary review")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("Proposal vote evidence")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("Governance result review")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(
      within(tmrwdaoReadiness).getAllByText("DAPP_API · proposal_metadata").length,
    ).toBeGreaterThan(0);
    expect(
      within(tmrwdaoReadiness).getAllByText("DAPP_API · dao_contract_event").length,
    ).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/No live TMRWDAO service\/API/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/proposal creation/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/DAO vote transaction/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/wallet signing/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/contract read\/send\/write/).length).toBeGreaterThan(0);
    for (const category of [
      "wallet",
      "bridge",
      "swap",
      "liquidity",
      "nft",
      "schrodinger",
      "dao",
      "daipp",
      "pay",
      "forecast",
      "social",
      "invite",
    ]) {
      expect(screen.getByText(category)).toBeInTheDocument();
    }
    expect(screen.getAllByText("AA + EOA").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/zh-TW/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Task Builder Preview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Publish Gate Decision Center" })).not.toBeInTheDocument();
  });

  it("renders localized Forest NFT task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const forestReadiness = screen.getByLabelText("Forest NFT 任务 readiness");
    expect(
      within(forestReadiness).getByRole("heading", { name: "Forest NFT 任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT mint readiness")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT holder 证据")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest NFT trade/listing 审核")).toBeInTheDocument();
    expect(within(forestReadiness).getByText("Forest holder 排行榜审核")).toBeInTheDocument();
    expect(within(forestReadiness).getAllByText(/不会调用实时 Forest service\/API/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/不会连接 NFT marketplace\/indexer/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/不会执行 NFT mint/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/NFT trade\/listing/).length).toBeGreaterThan(0);
    expect(within(forestReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
  });

  it("renders localized Schrödinger NFT task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const schrodingerReadiness = screen.getByLabelText("Schrödinger NFT 任务 readiness");
    expect(
      within(schrodingerReadiness).getByRole("heading", { name: "Schrödinger NFT 任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT adopt readiness")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT holder 证据")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger NFT trade/listing 审核")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getByText("Schrödinger holder 排行榜审核")).toBeInTheDocument();
    expect(within(schrodingerReadiness).getAllByText(/不会调用实时 Schrödinger service\/API/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/project API/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/不会连接 NFT marketplace\/indexer/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/不会执行 NFT adopt/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/NFT trade\/listing/).length).toBeGreaterThan(0);
    expect(within(schrodingerReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
  });

  it("renders localized eBridge task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const ebridgeReadiness = screen.getByLabelText("eBridge 任务 readiness");
    expect(
      within(ebridgeReadiness).getByRole("heading", { name: "eBridge 任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge 意图 readiness")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge 金额门槛审核")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge 链上证据")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Awaken 解锁依赖")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("Bridge 资格影响")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("ON_CHAIN · seeded_local")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · ebridge_api")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("ON_CHAIN · aefinder_on_chain")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · awaken_unlock_rule")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getByText("DAPP_API · eligibility_engine")).toBeInTheDocument();
    expect(within(ebridgeReadiness).getAllByText(/不会调用真实 eBridge service\/API/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/不会执行 bridge 交易/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/资产转移/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/钱包签名/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
    expect(within(ebridgeReadiness).getAllByText(/导出生成/).length).toBeGreaterThan(0);
  });

  it("renders localized Awaken swap and liquidity task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const awakenReadiness = screen.getByLabelText("Awaken swap / liquidity 任务 readiness");
    expect(
      within(awakenReadiness).getByRole("heading", { name: "Awaken swap / liquidity 任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken swap readiness")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken 添加流动性审核")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken LP 持有证据")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Bridge 解锁依赖")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("Awaken 排名资格影响")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · seeded_local")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("ON_CHAIN · awaken_swap_event")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · lp_position_snapshot")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · bridge_unlock_rule")).toBeInTheDocument();
    expect(within(awakenReadiness).getByText("DAPP_API · ranking_engine")).toBeInTheDocument();
    expect(within(awakenReadiness).getAllByText(/不会调用真实 Awaken API/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/DEX\/indexer\/provider/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/不会执行 swap 交易/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/LP 添加\/移除/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/资产转移/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/钱包签名/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
    expect(within(awakenReadiness).getAllByText(/导出生成/).length).toBeGreaterThan(0);
  });

  it("renders localized daipp Agent Coin task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const daippReadiness = screen.getByLabelText("daipp Agent Coin 任务 readiness");
    expect(
      within(daippReadiness).getByRole("heading", { name: "daipp Agent Coin 任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent 页面访问 readiness")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent 互动证据")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Agent coin buy/hold 审核")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("AI intro 分享审核")).toBeInTheDocument();
    expect(within(daippReadiness).getByText("Launch 排行榜审核")).toBeInTheDocument();
    expect(within(daippReadiness).getAllByText(/不会调用真实 daipp service\/API/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/不会执行 agent/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/token launch/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/token buy\/hold\/transfer/).length).toBeGreaterThan(0);
    expect(within(daippReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
  });

  it("renders localized TMRWDAO governance task readiness in zh-CN", () => {
    render(
      <ProjectConsole
        activeWorkspace="templates"
        campaign={campaignDetail}
        locale="zh-CN"
      />,
    );

    const tmrwdaoReadiness = screen.getByLabelText("TMRWDAO 治理任务 readiness");
    expect(
      within(tmrwdaoReadiness).getByRole("heading", { name: "TMRWDAO 治理任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("DAO 加入 readiness")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("提案摘要审核")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("提案投票证据")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getByText("治理结果审核")).toBeInTheDocument();
    expect(within(tmrwdaoReadiness).getAllByText(/不会调用实时 TMRWDAO service\/API/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/不会创建提案/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/执行 DAO 投票交易/).length).toBeGreaterThan(0);
    expect(within(tmrwdaoReadiness).getAllByText(/合约读取\/发送\/写入/).length).toBeGreaterThan(0);
  });

  it("switches to AI Content workspace and preserves review-only AI boundaries", () => {
    render(<App />);

    clickWorkspace("AI Content");

    const aiOptimizationSummary = screen.getByLabelText("AI Optimization summary");
    expect(
      within(aiOptimizationSummary).getByRole("heading", { name: "AI Optimization summary" }),
    ).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText("Recommended action")).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText("Owner-safe next action")).toBeInTheDocument();
    expect(
      within(aiOptimizationSummary).getAllByText("Review input / no auto-execution").length,
    ).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getByText("Clarify bridge confirmation steps")).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText(/Operator can review this recommendation/)).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getByText(/No live AI provider/)).toBeInTheDocument();
    expect(within(aiOptimizationSummary).getAllByText(/automatic risk scoring/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/export/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/reward distribution/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/wallet action/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).getAllByText(/contract execution/).length).toBeGreaterThan(0);
    expect(within(aiOptimizationSummary).queryByText(/shared funding/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/\bban\b/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/anti-sybil/i)).not.toBeInTheDocument();
    expect(within(aiOptimizationSummary).queryByText(/Risk signal/i)).not.toBeInTheDocument();

    const aiOpsKpiConsole = screen.getByLabelText("AI Ops KPI Adoption Console");
    expect(
      within(aiOpsKpiConsole).getByRole("heading", { name: "AI Ops KPI Adoption Console" }),
    ).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Total KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Ready KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Review KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Blocked KPIs")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Strongest signal")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("Top next action")).toBeInTheDocument();
    for (const metric of [
      "AI-generated campaign drafts",
      "AI content accepted rate",
      "Manual edit time saved",
      "AI reports generated",
      "Optimization suggestions adopted",
    ]) {
      expect(within(aiOpsKpiConsole).getByRole("heading", { name: metric })).toBeInTheDocument();
    }
    expect(within(aiOpsKpiConsole).getAllByText(/Value:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Owner:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Source:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Evidence:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getAllByText(/Next action:/).length).toBeGreaterThan(0);
    expect(within(aiOpsKpiConsole).getByText(/Human acceptance before publish/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/Adoption requires human review/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/no automatic campaign rule changes/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText("KPI boundary")).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/No live AI provider/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/analytics SDK write/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/wallet action/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/contract transaction/)).toBeInTheDocument();
    expect(within(aiOpsKpiConsole).getByText(/reward distribution/)).toBeInTheDocument();
    expect(
      within(aiOpsKpiConsole).queryByRole("button", {
        name: /generate|accept|publish|export|wallet|contract|reward/i,
      }),
    ).not.toBeInTheDocument();

    const aiContentPack = screen.getByLabelText("AI Content Pack");
    expect(within(aiContentPack).getByRole("heading", { name: "AI Content Pack" })).toBeInTheDocument();
    expect(
      within(aiContentPack).getByText("Project-owner review of generated campaign copy, release intent, and quality gates."),
    ).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Total artifacts")).toBeInTheDocument();
    expect(within(aiContentPack).getAllByText("Human approved").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("AI drafts").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Copy ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByText("Quality blockers")).toBeInTheDocument();
    expect(within(aiContentPack).getByText(/Seeded\/local content pack only/)).toBeInTheDocument();
    for (const artifact of [
      "X / Twitter thread",
      "Telegram announcement",
      "Discord message",
      "FAQ",
      "Tutorial",
      "Daily report",
      "Winner report",
    ]) {
      expect(within(aiContentPack).getByText(artifact)).toBeInTheDocument();
    }
    expect(within(aiContentPack).getAllByText("Human review required").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Schedule ready").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("Publish blocked").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText("en-US published").length).toBeGreaterThan(0);
    expect(within(aiContentPack).getAllByText(/zh-CN/).length).toBeGreaterThan(0);
    expect(within(aiContentPack).getByRole("heading", { name: "Quality gates" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Reward responsibility")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("Winner rules")).toBeInTheDocument();
  });

  it("switches to Analytics workspace without rendering export controls", () => {
    render(<App />);

    clickWorkspace("Analytics");

    expect(screen.getByRole("heading", { name: "Analytics & Export Decision" })).toBeInTheDocument();
    const advancedAnalytics = screen.getByLabelText("Advanced Analytics readiness");
    expect(
      within(advancedAnalytics).getByRole("heading", { name: "Advanced Analytics readiness" }),
    ).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Cohorts")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Day 7 retention")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Day 30 retention")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Real user quality")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Cost per verified action")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Product conversion")).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText("Premium analytics readiness")).toBeInTheDocument();
    for (const cohort of [
      "New AA users",
      "EOA power users",
      "Referral-driven users",
      "Risk review cohort",
    ]) {
      expect(within(advancedAnalytics).getByText(cohort)).toBeInTheDocument();
    }
    for (const product of ["eBridge", "Awaken", "Forest", "TMRWDAO", "daipp", "Pay", "Forecast", "Portfolio"]) {
      expect(within(advancedAnalytics).getByText(product)).toBeInTheDocument();
    }
    for (const report of [
      "Cohort report",
      "Retention report",
      "Real user quality",
      "Conversion report",
      "Risk report",
    ]) {
      expect(within(advancedAnalytics).getAllByText(report).length).toBeGreaterThan(0);
    }
    expect(within(advancedAnalytics).getByText(/No live analytics SDK/)).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText(/event warehouse/)).toBeInTheDocument();
    expect(within(advancedAnalytics).getByText(/billing/)).toBeInTheDocument();
    expect(screen.getByText("Largest drop-off")).toBeInTheDocument();
    expect(screen.getAllByText("Wallet connect conversion").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Task completion").length).toBeGreaterThan(0);
    expect(screen.getByText("AA / EOA split")).toBeInTheDocument();
    expect(screen.getByText("Locale coverage")).toBeInTheDocument();

    const localeAnalytics = screen.getByLabelText("Locale analytics readiness");
    expect(
      within(localeAnalytics).getByRole("heading", { name: "Locale analytics readiness" }),
    ).toBeInTheDocument();
    for (const locale of ["en-US", "zh-CN", "zh-TW"]) {
      expect(within(localeAnalytics).getByRole("heading", { name: locale })).toBeInTheDocument();
    }
    for (const metric of [
      "Campaign views",
      "Wallet connect conversion",
      "Task completion",
      "Referral conversion",
      "Translation fallback rate",
      "AI draft accepted rate",
      "Manual edit time",
    ]) {
      expect(within(localeAnalytics).getAllByText(metric).length).toBeGreaterThan(0);
    }
    expect(within(localeAnalytics).getByText(/No live analytics SDK/)).toBeInTheDocument();
    expect(screen.queryByText("Ready rows")).not.toBeInTheDocument();
    expect(screen.queryByText(EXPORT_CSV_COLUMNS.join(","))).not.toBeInTheDocument();
  });

  it("switches to Export workspace and keeps CSV, service, and API boundaries", () => {
    render(<App />);

    clickWorkspace("Export");

    expect(screen.getByRole("heading", { name: "Export Decision" })).toBeInTheDocument();
    expect(screen.getAllByText("Ready rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Review-required rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blocked rows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 / 3 / 0").length).toBeGreaterThan(0);
    expect(screen.getByText("CSV columns")).toBeInTheDocument();
    expect(screen.getAllByText(EXPORT_CSV_COLUMNS.join(",")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Campaign OS exports verified records only/)).toBeInTheDocument();
    expect(screen.getByText(/Local export artifact only/)).toBeInTheDocument();
    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");
    expect(mockedSubmitExportArtifactDeliveryApiReview).not.toHaveBeenCalled();
    expect(within(exportDeliveryApi).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).getByText("No local API base URL configured; seeded export review remains visible and no fetch is sent.")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" })).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("API_BASE_URL_MISSING: No local export delivery API base URL is configured, so seeded export review remains visible.")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText(/No download URL, storage write, signed URL/)).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("No wallet signing")).toBeInTheDocument();
    const localArtifact = screen.getByLabelText("Local export artifact");
    expect(within(localArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(localArtifact).getByText("CSV")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact batch: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Checksum")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/^local-[0-9a-f]{8}$/)).toBeInTheDocument();
    expect(within(localArtifact).getByText("Payload bytes")).toBeInTheDocument();
    expect(within(localArtifact).getByText(/Artifact rows: 1 \/ 3 \/ 0/)).toBeInTheDocument();
    expect(within(localArtifact).getAllByText("No download URL").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No storage write").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No contract root").length).toBeGreaterThan(0);
    expect(within(localArtifact).getAllByText("No reward distribution").length).toBeGreaterThan(0);
    expect(within(localArtifact).getByText(/no download URL, storage write, contract root/)).toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Download ready/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Stored/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Contract root generated/i)).not.toBeInTheDocument();
    expect(within(localArtifact).queryByText(/Rewards distributed/i)).not.toBeInTheDocument();

    const storageProviderSummary = screen.getByLabelText("Storage provider approval summary");
    expect(
      within(storageProviderSummary).getByRole("heading", {
        name: "Storage provider approval summary",
      }),
    ).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Production storage approval blocked")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Top storage blocker")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Provider ownership")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText(/Safe next action:/)).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Storage write enabled = false")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Download URL enabled = false")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Contract root/write enabled = false")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Reward custody enabled = false")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText("Reward distribution enabled = false")).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText(/Local CSV\/JSON handoff remains available/)).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText(/Production storage boundary:/)).toBeInTheDocument();
    expect(within(storageProviderSummary).getByText(/Production storage export stays fail-closed/)).toBeInTheDocument();
    expect(
      within(storageProviderSummary).queryByRole("button", {
        name: /upload|download|signed URL|storage write|write storage|contract root|contract|custody|distribute|reward/i,
      }),
    ).not.toBeInTheDocument();

    const fulfillmentReadiness = screen.getByLabelText("Export fulfillment readiness");
    expect(
      within(fulfillmentReadiness).getByRole("heading", { name: "Export fulfillment readiness" }),
    ).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("Handoff status")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("Owner approved")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("1 / 3 / 0")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("camp-awaken-sprint-export-awaken-sprint-preview-csv-local-fulfillment")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("camp-awaken-sprint-export-awaken-sprint-preview-json-local-fulfillment")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getAllByText(/^local-[0-9a-f]{8}$/).length).toBeGreaterThan(1);
    expect(within(fulfillmentReadiness).getAllByText("No download URL").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No storage write").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No contract root").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText("No reward distribution").length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText(/storage-backed export/).length).toBeGreaterThan(0);
    expect(within(fulfillmentReadiness).getAllByText(/Local export fulfillment handoff only/).length).toBeGreaterThan(0);
    expect(
      within(fulfillmentReadiness).queryByRole("button", {
        name: /download|storage|claim|reward|contract/i,
      }),
    ).not.toBeInTheDocument();

    const exportReadiness = screen.getByLabelText("Export confirmation readiness");
    expect(
      within(exportReadiness).getByRole("heading", { name: "Export confirmation readiness" }),
    ).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("CSV preview").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("JSON preview").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("Required export fields")).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("wallet_address").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("locale_preference").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("Row reason coverage").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("Eligible verified row")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Risk review required")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Project acknowledgements")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Project owns final reward distribution")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("No real export file")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Contract root readiness")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("No contract root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Eligibility root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Winners root")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("Contract claim")).toBeInTheDocument();
    expect(within(exportReadiness).getByText(/No real CSV or JSON file/)).toBeInTheDocument();

    const serviceFacade = screen.getByLabelText("Local API Service Facade");
    expect(
      within(serviceFacade).getByRole("heading", { name: "Local API Service Facade" }),
    ).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Service coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Total services")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("Ready").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("11 Local only")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Review required")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Blocked")).toBeInTheDocument();
    for (const coverage of ["wallet coverage", "task verification", "eligibility", "i18n", "analytics", "export", "content", "summary"]) {
      expect(within(serviceFacade).getAllByText(coverage).length).toBeGreaterThan(0);
    }
    expect(within(serviceFacade).getByText("generateI18nDraft")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("addTask")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("exportWinners")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("requestAgentWalletAction")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Verification coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("Provider readiness").length).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText("Evidence categories")).toBeInTheDocument();
    expect(within(serviceFacade).getAllByText("MANUAL_REVIEW").length).toBeGreaterThan(0);
    expect(
      within(serviceFacade).getByRole("heading", { name: "Verification pipeline readiness" }),
    ).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Seeded/local coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Live evidence")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Task outcome coverage")).toBeInTheDocument();
    expect(within(serviceFacade).getByText("Eligibility impact")).toBeInTheDocument();
    for (const path of [
      "AeFinder on-chain verification",
      "AelfScan on-chain verification",
      "dApp API verification",
      "Social API verification",
      "Wallet session verification",
      "Manual review",
      "Referral qualification",
    ]) {
      expect(within(serviceFacade).getAllByText(path).length).toBeGreaterThan(0);
    }
    expect(
      within(serviceFacade).getByText("Eligibility depends on required task verification, qualified invitees, risk review, and manual-review outcomes."),
    ).toBeInTheDocument();
    expect(
      within(serviceFacade).getAllByText(/No live backend\/API, wallet signature, secret storage, real export file, reward distribution, or contract root write/).length,
    ).toBeGreaterThan(0);
    expect(within(serviceFacade).getByText(/No live API, wallet SDK, provider, secret storage/)).toBeInTheDocument();
    expect(
      within(serviceFacade).getAllByText(/No live AeFinder, AelfScan, dApp API, social API, wallet SDK, reward distribution, export file, secret storage, or contract write/).length,
    ).toBeGreaterThan(0);

    const backendReadiness = screen.getByLabelText("Backend Runtime Readiness review");
    expect(mockedLoadBackendRuntimeReadinessApiBridgeState).not.toHaveBeenCalled();
    expect(within(backendReadiness).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(backendReadiness).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("npm run server:start")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("npm run server:smoke")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("/api/health")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("/api/contracts")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("API_BASE_URL_MISSING: No local backend readiness API base URL is configured, so seeded readiness is shown.")).toBeInTheDocument();
    expect(within(backendReadiness).getByText(/No live provider call/)).toBeInTheDocument();

    const publishDeliveryReview = screen.getByLabelText("Publish Delivery Review Bridge");
    expect(mockedLoadPublishDeliveryReviewApiBridgeState).not.toHaveBeenCalled();
    expect(within(publishDeliveryReview).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(publishDeliveryReview).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText(/API_BASE_URL_MISSING/)).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText("No production publish")).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText("No reward distribution")).toBeInTheDocument();

    const pointsRankingLedgerRuntime = screen.getByLabelText("Points Ranking Ledger Runtime review");
    expect(mockedLoadPointsRankingLedgerRuntimeApiBridgeState).not.toHaveBeenCalled();
    expect(within(pointsRankingLedgerRuntime).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText("Ledger events")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getAllByText("Ranking snapshot").length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getAllByText("Eligibility root preview").length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getByText("No Pixiepoints ledger write")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText("No reward distribution")).toBeInTheDocument();

    const contractWriterRuntime = screen.getByLabelText("Contract Writer Runtime review");
    expect(mockedLoadContractWriterRuntimeApiBridgeState).not.toHaveBeenCalled();
    expect(within(contractWriterRuntime).getAllByText("Seeded fallback").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getByText("No API trace yet")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText(/No local API base URL configured/)).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getAllByText("CampaignRegistryV2").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getByText("No signer execution")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No contract write")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No reward distribution")).toBeInTheDocument();

    const walletAdapterReadiness = screen.getByLabelText("aelf-web-login adapter readiness");
    expect(
      within(walletAdapterReadiness).getByRole("heading", {
        name: "aelf-web-login adapter readiness",
      }),
    ).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Configured adapters")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/Enabled preview/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Missing live evidence")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Release blockers")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Portkey AA")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Portkey EOA App / Discover")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText("Future EOA adapter")).toBeInTheDocument();
    expect(within(walletAdapterReadiness).queryByText("Agent Skill wallet")).not.toBeInTheDocument();
    expect(within(walletAdapterReadiness).getAllByText(/Feature gate: enabled preview/).length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness).getAllByText(/Live evidence: missing/).length).toBeGreaterThan(0);
    expect(within(walletAdapterReadiness).getByText(/Future EOA adapter is maintenance-only/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/Show Future EOA adapter as maintenance/)).toBeInTheDocument();
    expect(within(walletAdapterReadiness).getByText(/no live wallet SDK connection/)).toBeInTheDocument();

    const liveConnectorBoundary = screen.getByLabelText("Live wallet connector boundary");
    expect(
      within(liveConnectorBoundary).getByRole("heading", {
        name: "Live wallet connector boundary",
      }),
    ).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getByText("Connector candidates")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getAllByText("Missing live evidence").length).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText("Portkey AA live connector")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getByText("Portkey Discover EOA live connector")).toBeInTheDocument();
    expect(
      within(liveConnectorBoundary).getAllByText(/@aelf-web-login\/wallet-adapter-portkey-aa/).length,
    ).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText(/Configuration gate required/)).toBeInTheDocument();
    expect(
      within(liveConnectorBoundary).getByText(/Live wallet connector execution is disabled by default/),
    ).toBeInTheDocument();
    expect(within(liveConnectorBoundary).queryByText(/production wallet connection is available/i)).not.toBeInTheDocument();

    const providerRegistry = screen.getByLabelText("Provider evidence registry");
    expect(
      within(providerRegistry).getByRole("heading", { name: "Provider evidence registry" }),
    ).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Registry entries")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Missing live evidence")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Local-only paths")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Review-required paths")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Unavailable paths")).toBeInTheDocument();
    expect(within(providerRegistry).getAllByText("Launch blockers").length).toBeGreaterThan(0);
    expect(within(providerRegistry).getByText("AeFinder on-chain verification")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("Social API verification")).toBeInTheDocument();
    expect(within(providerRegistry).getAllByText(/Feature gate/).length).toBeGreaterThan(0);
    expect(within(providerRegistry).getAllByText(/Fallback/).length).toBeGreaterThan(0);
    expect(within(providerRegistry).getByText(/No live API, wallet SDK, provider credential/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "API / Skill Contracts" })).toBeInTheDocument();
    expect(screen.getByText("Read-only contract registry for future agents and APIs.")).toBeInTheDocument();
    expect(screen.getByText("Total contracts")).toBeInTheDocument();
    expect(screen.getByText("create_campaign")).toBeInTheDocument();
    expect(screen.getByText("agent_wallet_action")).toBeInTheDocument();
    expect(screen.getByText("verify_task")).toBeInTheDocument();
    expect(screen.getByText("export_winners")).toBeInTheDocument();
    expect(screen.getByText("add_campaign_task")).toBeInTheDocument();
    expect(screen.getByText("generate_i18n_draft")).toBeInTheDocument();
    expect(screen.getByText("Agent Skill wallet action readiness")).toBeInTheDocument();
    expect(screen.getByText("agentId")).toBeInTheDocument();
    expect(screen.getByText("actionIntent")).toBeInTheDocument();
    expect(screen.getByText("humanApprovalState")).toBeInTheDocument();
    expect(screen.getByText("noPrivateKeyBoundary")).toBeInTheDocument();
    expect(screen.getByText("noSignatureExecution")).toBeInTheDocument();
    expect(screen.getByText("noTransactionExecution")).toBeInTheDocument();
    expect(screen.getByText("ownerAddress")).toBeInTheDocument();
    expect(screen.getByText("metadataUri")).toBeInTheDocument();
    expect(screen.getByText("rewardDisclaimerHash")).toBeInTheDocument();
    expect(screen.getAllByText("templateCode").length).toBeGreaterThan(0);
    expect(screen.getAllByText("evidenceRule").length).toBeGreaterThan(0);
    expect(screen.getAllByText("walletAddress").length).toBeGreaterThan(0);
    expect(screen.getAllByText("accountType").length).toBeGreaterThan(0);
    expect(screen.getByText("txId")).toBeInTheDocument();
    expect(screen.getByText("completedAt")).toBeInTheDocument();
    expect(screen.getAllByText("contentKeys").length).toBeGreaterThan(0);
    expect(screen.getByText("contractRootMode")).toBeInTheDocument();
    expect(
      screen.getAllByText("LOCAL_SEEDED, AEFINDER, AELFSCAN, DAPP_API, SOCIAL_API, WALLET_SESSION, MANUAL").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/does not call live APIs/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Locale analytics readiness")).not.toBeInTheDocument();
  });

  it("clicks Export Delivery API review action and renders preview registry plus audit detail", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitExportArtifactDeliveryApiReview.mockResolvedValueOnce(apiDeliveredState());

    render(<App />);

    clickWorkspace("Export");

    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");

    fireEvent.click(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" }));

    await waitFor(() => expect(mockedSubmitExportArtifactDeliveryApiReview).toHaveBeenCalledWith({
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-export-delivery-review",
      },
      request: {
        campaignId: campaignDetail.id,
        contractRootMode: "eligibility_root",
        format: "csv",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      },
    }));

    await waitFor(() => expect(within(exportDeliveryApi).getByText("API runtime")).toBeInTheDocument());
    expect(within(exportDeliveryApi).getByText("Delivered")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getAllByText("trace-export-api-visible").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).getAllByText("export-artifact-local-camp-awaken-sprint").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).getByText("camp-awaken-sprint-export-awaken-sprint-preview-api-review.csv")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("sha256-api-artifact")).toBeInTheDocument();
    const fileHandoff = within(exportDeliveryApi).getByLabelText("Local file handoff package");
    expect(within(fileHandoff).getByText("local-file-handoff-camp-awaken-sprint-csv")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("camp-awaken-sprint-export-awaken-sprint-preview-api-runtime.csv")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("CSV / text/csv")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("sha256-file-handoff")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Payload bytes: 912")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Columns: 4")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Rows ready / review / blocked: 1 / 3 / 0")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Retention: active")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Expires: 2026-07-10T00:00:00.000Z")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("Trace ID: trace-file-handoff-visible")).toBeInTheDocument();
    expect(within(fileHandoff).getAllByText(/Local API payload handoff only/).length).toBeGreaterThan(0);
    expect(within(fileHandoff).getByText("No signed URL")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("No object key")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("No provider call")).toBeInTheDocument();
    expect(within(fileHandoff).getByText("No queue or scheduler")).toBeInTheDocument();
    expect(
      within(fileHandoff).queryByRole("button", {
        name: /download|signed URL|store|provider|contract|wallet|custody|distribute|reward/i,
      }),
    ).not.toBeInTheDocument();
    expect(within(exportDeliveryApi).getByLabelText("Eligibility root review packet")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("local-root-ab568e06")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("camp-awaken-sprint-export-awaken-sprint-preview-eligibility-root-v1")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("Root not published on-chain")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("No contract write")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("No wallet signature")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("No claim execution")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("Audit list: API audit ready")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("campaigns.export.preview")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("registered local artifact")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("storage disabled")).toBeInTheDocument();
  });

  it("loads Backend Runtime Readiness automatically and renders API-backed persistence metadata", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadBackendRuntimeReadinessApiBridgeState.mockResolvedValueOnce(backendReadinessApiState());

    render(<App />);

    clickWorkspace("Export");

    const backendReadiness = screen.getByLabelText("Backend Runtime Readiness review");

    await waitFor(() => expect(mockedLoadBackendRuntimeReadinessApiBridgeState).toHaveBeenCalledWith({
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-backend-readiness-review",
      },
    }));

    await waitFor(() => expect(within(backendReadiness).getByText("API runtime")).toBeInTheDocument());
    expect(within(backendReadiness).getByText("trace-backend-api-visible")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("staging-scaffold")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("17 / 18 API skills")).toBeInTheDocument();
    expect(within(backendReadiness).getByText("runtime.production.database")).toBeInTheDocument();

    const persistence = screen.getByLabelText("Backend Runtime Persistence review");

    expect(within(persistence).getAllByText("Durable local review persistence")[0]).toBeInTheDocument();
    expect(within(persistence).getByText("local_json")).toBeInTheDocument();
    expect(within(persistence).getByText("3")).toBeInTheDocument();
    expect(within(persistence).getByText("local_json:campaign-os-review-state")).toBeInTheDocument();
    expect(within(persistence).getByText("export_preview / campaigns.export.preview / trace-safe-export-preview"))
      .toBeInTheDocument();
    expect(within(persistence).getByText("No production database")).toBeInTheDocument();
    expect(within(persistence).getByText("No migration runner")).toBeInTheDocument();
    expect(within(persistence).getByText("No queues or schedulers")).toBeInTheDocument();
    expect(within(persistence).getByText("No reward distribution")).toBeInTheDocument();
  });

  it("renders blocked durable persistence setup without unsafe values", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadBackendRuntimeReadinessApiBridgeState.mockResolvedValueOnce({
      ...backendReadinessApiState(),
      persistencePosture: {
        ...seededBackendRuntimePersistencePosture,
        adapterLabel: "redacted local path",
        diagnosticCodes: ["MISSING_LOCAL_PERSISTENCE_DIR"],
        latestRecords: [{
          kind: "wallet_session",
          routeId: "redacted provider data",
          traceId: "redacted signature",
        }],
        mode: "local_json",
        nextAction: {
          "en-US": "Set CAMPAIGN_OS_PERSISTENCE_DIR for local_json review or switch back to memory review.",
          "zh-CN": "Set CAMPAIGN_OS_PERSISTENCE_DIR for local_json review or switch back to memory review.",
          "zh-TW": "Set CAMPAIGN_OS_PERSISTENCE_DIR for local_json review or switch back to memory review.",
        },
        recordCount: 0,
        safety: {
          durable: true,
          localOnly: true,
          noMigrationRunner: true,
          noProductionDatabase: true,
          noSecretHandling: true,
        },
        status: "unavailable",
        statusLabel: {
          "en-US": "Durable local persistence unavailable",
          "zh-CN": "Durable local persistence unavailable",
          "zh-TW": "Durable local persistence unavailable",
        },
      },
    });

    render(<App />);

    clickWorkspace("Export");

    const persistence = await screen.findByLabelText("Backend Runtime Persistence review");

    expect(within(persistence).getAllByText("Durable local persistence unavailable")[0]).toBeInTheDocument();
    expect(within(persistence).getByText(/MISSING_LOCAL_PERSISTENCE_DIR/)).toBeInTheDocument();
    expect(within(persistence).getByText("redacted local path")).toBeInTheDocument();
    expect(within(persistence).getByText("wallet_session / redacted provider data / redacted signature"))
      .toBeInTheDocument();
    expect(screen.queryByText(/campaign-os-kitty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/docs\/current/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw-signature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/token=sample/i)).not.toBeInTheDocument();
  });

  it("loads Publish Delivery Review Bridge automatically and renders API-backed joint MVP state", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadPublishDeliveryReviewApiBridgeState.mockResolvedValueOnce(publishDeliveryReviewApiState());

    render(<ProjectConsole activeWorkspace="export" campaign={campaignDetail} locale="en-US" />);

    const publishDeliveryReview = screen.getByLabelText("Publish Delivery Review Bridge");

    await waitFor(() => expect(mockedLoadPublishDeliveryReviewApiBridgeState).toHaveBeenCalledWith({
      campaignId: campaignDetail.id,
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-publish-delivery-review",
      },
    }));

    await waitFor(() => expect(within(publishDeliveryReview).getByText("API runtime")).toBeInTheDocument());
    expect(within(publishDeliveryReview).getByText("trace-publish-api-visible")).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByRole("button", { name: "Review local bridge" })).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText("productionReady=false")).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText("Delivery checklist")).toBeInTheDocument();
    expect(within(publishDeliveryReview).getByText("Repository evidence")).toBeInTheDocument();
    expect(
      within(publishDeliveryReview).queryByRole("button", {
        name: /publish|contract|reward|distribute|custody|provider/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("loads Points Ranking Ledger Runtime automatically and preserves existing review sections", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadPointsRankingLedgerRuntimeApiBridgeState.mockResolvedValueOnce(pointsRankingLedgerRuntimeApiState());

    render(<ProjectConsole activeWorkspace="export" campaign={campaignDetail} locale="en-US" />);

    const pointsRankingLedgerRuntime = screen.getByLabelText("Points Ranking Ledger Runtime review");

    await waitFor(() => expect(mockedLoadPointsRankingLedgerRuntimeApiBridgeState).toHaveBeenCalledWith({
      campaignId: campaignDetail.id,
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-points-ranking-ledger-runtime",
      },
    }));

    await waitFor(() => expect(within(pointsRankingLedgerRuntime).getByText("API runtime")).toBeInTheDocument());
    expect(within(pointsRankingLedgerRuntime).getByText("trace-ledger-api-visible")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByRole("button", { name: "Review ledger runtime" })).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText("Ledger events")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getAllByText("Ranking snapshot").length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getAllByText("Eligibility root preview").length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getAllByText(/local-root-/).length).toBeGreaterThan(0);
    expect(within(pointsRankingLedgerRuntime).getByText("No backend ledger write")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText("No reward custody")).toBeInTheDocument();
    expect(within(pointsRankingLedgerRuntime).getByText("No reward distribution")).toBeInTheDocument();
    expect(screen.getByLabelText("Publish Delivery Review Bridge")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics Ingestion Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Backend Runtime Readiness review")).toBeInTheDocument();
    expect(screen.getByLabelText("Export Delivery API review")).toBeInTheDocument();
    expect(
      within(pointsRankingLedgerRuntime).queryByRole("button", {
        name: /write|contract|reward|distribute|custody|provider|signature/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("loads Contract Writer Runtime automatically and keeps live contract controls absent", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadContractWriterRuntimeApiBridgeState.mockResolvedValueOnce(contractWriterRuntimeApiState());

    render(<ProjectConsole activeWorkspace="export" campaign={campaignDetail} locale="en-US" />);

    const contractWriterRuntime = screen.getByLabelText("Contract Writer Runtime review");

    await waitFor(() => expect(mockedLoadContractWriterRuntimeApiBridgeState).toHaveBeenCalledWith({
      campaignId: campaignDetail.id,
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-contract-writer-runtime",
      },
    }));

    await waitFor(() => expect(within(contractWriterRuntime).getByText("API runtime")).toBeInTheDocument());
    expect(within(contractWriterRuntime).getByText("trace-contract-writer-api-visible")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByRole("button", { name: "Refresh readiness" }))
      .toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT_REF"))
      .toBeInTheDocument();
    expect(within(contractWriterRuntime).getAllByText("CampaignRegistryV2").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getAllByText("CampaignPointsLedgerV2").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getAllByText("ReferralRegistryV2").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getAllByText("EligibilityRootRegistryV2").length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getByText("CreateCampaign")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("CommitPointsBatch")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("BindReferral")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("SetEligibilityRoot")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getAllByText(/CONTRACT_WRITER_CONFIG_MISSING/).length).toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getAllByText(/CONTRACT_WRITER_LIVE_EXECUTION_DISABLED/).length)
      .toBeGreaterThan(0);
    expect(within(contractWriterRuntime).getByText("No signer execution")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No wallet signature")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No contract write")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No queue publishing")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No reward custody")).toBeInTheDocument();
    expect(within(contractWriterRuntime).getByText("No reward distribution")).toBeInTheDocument();
    expect(screen.getByLabelText("Publish Delivery Review Bridge")).toBeInTheDocument();
    expect(screen.getByLabelText("Points Ranking Ledger Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics Ingestion Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Backend Runtime Readiness review")).toBeInTheDocument();
    for (const name of [/sign/i, /write/i, /publish/i, /claim/i, /distribute/i, /reward/i, /custody/i, /contract/i]) {
      expect(within(contractWriterRuntime).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(contractWriterRuntime).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("loads Object Storage Export Runtime automatically without live storage controls", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadObjectStorageExportRuntimeApiBridgeState.mockResolvedValueOnce(objectStorageExportRuntimeApiState());

    render(<ProjectConsole activeWorkspace="export" campaign={campaignDetail} locale="en-US" />);

    const objectStorageExportRuntime = screen.getByLabelText("Object Storage Export Runtime review");

    await waitFor(() => expect(mockedLoadObjectStorageExportRuntimeApiBridgeState).toHaveBeenCalledWith({
      campaignId: campaignDetail.id,
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-object-storage-export-runtime",
      },
    }));

    await waitFor(() => expect(within(objectStorageExportRuntime).getByText("API runtime")).toBeInTheDocument());
    expect(within(objectStorageExportRuntime).getByText("trace-storage-api-visible")).toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByRole("button", { name: "Review storage readiness" }))
      .toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("export-awaken-sprint-preview")).toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF"))
      .toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("No upload")).toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("No download")).toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("No signed URL")).toBeInTheDocument();
    expect(within(objectStorageExportRuntime).getByText("No provider call")).toBeInTheDocument();
    expect(screen.getByLabelText("Publish Delivery Review Bridge")).toBeInTheDocument();
    expect(screen.getByLabelText("Points Ranking Ledger Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Analytics Ingestion Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Backend Runtime Readiness review")).toBeInTheDocument();
    expect(screen.getByLabelText("Export Delivery API review")).toBeInTheDocument();
    for (const name of [/upload/i, /download/i, /signed URL/i, /provider execution/i, /contract write/i]) {
      expect(within(objectStorageExportRuntime).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(objectStorageExportRuntime).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("loads Analytics Ingestion Runtime automatically and keeps live telemetry controls absent", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedLoadAnalyticsIngestionRuntimeApiBridgeState.mockResolvedValueOnce(analyticsIngestionRuntimeApiState());

    render(<ProjectConsole activeWorkspace="export" campaign={campaignDetail} locale="en-US" />);

    const analyticsIngestionRuntime = screen.getByLabelText("Analytics Ingestion Runtime review");

    await waitFor(() => expect(mockedLoadAnalyticsIngestionRuntimeApiBridgeState).toHaveBeenCalledWith({
      campaignId: campaignDetail.id,
      config: {
        baseUrl: "http://127.0.0.1:5184",
        tracePrefix: "project-console-analytics-ingestion-runtime",
      },
    }));

    await waitFor(() => expect(within(analyticsIngestionRuntime).getByText("API runtime")).toBeInTheDocument());
    expect(within(analyticsIngestionRuntime).getByText("trace-analytics-api-visible")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByRole("button", { name: "Review analytics ingestion" }))
      .toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("Campaign lifecycle: 1")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("Participants: participants")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF"))
      .toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("No live analytics SDK")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("No warehouse write")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("No browser tracking")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("No reward custody")).toBeInTheDocument();
    expect(within(analyticsIngestionRuntime).getByText("No reward distribution")).toBeInTheDocument();
    expect(screen.getByLabelText("Publish Delivery Review Bridge")).toBeInTheDocument();
    expect(screen.getByLabelText("Points Ranking Ledger Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Object Storage Export Runtime review")).toBeInTheDocument();
    expect(screen.getByLabelText("Backend Runtime Readiness review")).toBeInTheDocument();
    for (const name of [/send/i, /track/i, /warehouse write/i, /profile/i, /fingerprint/i, /reward custody/i, /reward distribution/i]) {
      expect(within(analyticsIngestionRuntime).queryByRole("button", { name })).not.toBeInTheDocument();
      expect(within(analyticsIngestionRuntime).queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("shows partial Export Delivery API state while preserving seeded export panels", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const partialState = apiDeliveredState();
    mockedSubmitExportArtifactDeliveryApiReview.mockResolvedValueOnce({
      ...partialState,
      auditDetail: undefined,
      diagnostics: [{
        code: "API_AUDIT_DETAIL_FAILED",
        message: {
          "en-US": "The local export artifact audit detail route did not return a usable record.",
          "zh-CN": "The local export artifact audit detail route did not return a usable record.",
          "zh-TW": "The local export artifact audit detail route did not return a usable record.",
        },
        safeDetails: { endpoint: "/api/campaigns/camp-awaken-sprint/export-artifacts/export-artifact-local-camp-awaken-sprint", status: 404 },
        severity: "error",
      }],
      status: "partial",
      traceId: "trace-export-audit-detail-failed",
    });

    render(<App />);

    clickWorkspace("Export");

    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");

    fireEvent.click(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" }));

    await waitFor(() => expect(within(exportDeliveryApi).getByText("Partial API result")).toBeInTheDocument());
    expect(within(exportDeliveryApi).getAllByText("trace-export-audit-detail-failed").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).getByText(/API_AUDIT_DETAIL_FAILED/)).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("camp-awaken-sprint-export-awaken-sprint-preview-api-review.csv")).toBeInTheDocument();
    expect(screen.getByLabelText("Local export artifact")).toBeInTheDocument();
    expect(screen.getByLabelText("Storage provider approval summary")).toBeInTheDocument();
    expect(screen.getByLabelText("Export fulfillment readiness")).toBeInTheDocument();
    expect(screen.getByLabelText("Export confirmation readiness")).toBeInTheDocument();
  });

  it("shows expired Export Delivery API file handoff diagnostics without payload controls", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const expiredState = apiDeliveredState();
    mockedSubmitExportArtifactDeliveryApiReview.mockResolvedValueOnce({
      ...expiredState,
      diagnostics: [{
        code: "API_FILE_HANDOFF_EXPIRED",
        message: {
          "en-US": "The local export file handoff has expired, but preview and audit context remain available.",
          "zh-CN": "The local export file handoff has expired, but preview and audit context remain available.",
          "zh-TW": "The local export file handoff has expired, but preview and audit context remain available.",
        },
        safeDetails: {
          endpoint: "/api/campaigns/camp-awaken-sprint/export-artifacts/export-artifact-local-camp-awaken-sprint/file",
          status: 410,
        },
        severity: "error",
      }],
      fileHandoff: undefined,
      status: "expired",
      traceId: "trace-file-handoff-expired",
    });

    render(<App />);

    clickWorkspace("Export");

    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");

    fireEvent.click(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" }));

    await waitFor(() => expect(within(exportDeliveryApi).getByText("Expired file handoff")).toBeInTheDocument());
    expect(within(exportDeliveryApi).getByText(/API_FILE_HANDOFF_EXPIRED/)).toBeInTheDocument();
    expect(within(exportDeliveryApi).getAllByText("trace-file-handoff-expired").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).queryByLabelText("Local file handoff package")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Local export artifact")).toBeInTheDocument();
    expect(screen.getByLabelText("Storage provider approval summary")).toBeInTheDocument();
    expect(
      within(exportDeliveryApi).queryByRole("button", {
        name: /download|signed URL|store|provider|contract|wallet|custody|distribute|reward/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows blocked Export Delivery API file handoff diagnostics and keeps seeded export sections", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    const blockedState = apiDeliveredState();
    mockedSubmitExportArtifactDeliveryApiReview.mockResolvedValueOnce({
      ...blockedState,
      diagnostics: [{
        code: "API_FILE_HANDOFF_BLOCKED",
        message: {
          "en-US": "The local export file handoff route rejected an unsupported or unsafe request.",
          "zh-CN": "The local export file handoff route rejected an unsupported or unsafe request.",
          "zh-TW": "The local export file handoff route rejected an unsupported or unsafe request.",
        },
        safeDetails: {
          endpoint: "/api/campaigns/camp-awaken-sprint/export-artifacts/export-artifact-local-camp-awaken-sprint/file",
          status: 400,
        },
        severity: "error",
      }],
      fileHandoff: undefined,
      status: "blocked",
      traceId: "trace-file-handoff-blocked",
    });

    render(<App />);

    clickWorkspace("Export");

    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");

    fireEvent.click(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" }));

    await waitFor(() => expect(within(exportDeliveryApi).getByText("Blocked file handoff")).toBeInTheDocument());
    expect(within(exportDeliveryApi).getByText(/API_FILE_HANDOFF_BLOCKED/)).toBeInTheDocument();
    expect(within(exportDeliveryApi).getAllByText("trace-file-handoff-blocked").length).toBeGreaterThan(0);
    expect(within(exportDeliveryApi).queryByLabelText("Local file handoff package")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Local export artifact")).toBeInTheDocument();
    expect(screen.getByLabelText("Export fulfillment readiness")).toBeInTheDocument();
    expect(screen.getByLabelText("Export confirmation readiness")).toBeInTheDocument();
    expect(
      within(exportDeliveryApi).queryByRole("button", {
        name: /download|signed URL|store|provider|contract|wallet|custody|distribute|reward/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("sanitizes unsafe Export Delivery API diagnostics and avoids live side-effect controls", async () => {
    import.meta.env.VITE_CAMPAIGN_OS_API_BASE_URL = "http://127.0.0.1:5184";
    mockedSubmitExportArtifactDeliveryApiReview.mockResolvedValueOnce({
      boundary: {
        "en-US":
          "Local export artifact delivery API review only. No download URL, storage write, signed URL, provider call, contract root write, wallet signing, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
        "zh-CN": "Local export artifact delivery API review only.",
        "zh-TW": "Local export artifact delivery API review only.",
      },
      configured: true,
      diagnostics: [{
        code: "API_REQUEST_FAILED",
        message: {
          "en-US": "Request failed with private key, seed phrase, bearer token, signed URL, object key, storage key, raw signature, provider payload, stack trace, and /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/raw?token=secret.",
          "zh-CN": "Request failed with private key.",
          "zh-TW": "Request failed with private key.",
        },
        severity: "error",
      }],
      loading: false,
      request: {
        campaignId: campaignDetail.id,
        contractRootMode: "none",
        format: "csv",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      },
      source: "error_fallback",
      status: "error",
      traceId: "trace-export-error-visible",
    });

    render(<App />);

    clickWorkspace("Export");

    const exportDeliveryApi = screen.getByLabelText("Export Delivery API review");

    fireEvent.click(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" }));

    await waitFor(() => expect(within(exportDeliveryApi).getAllByText("Error fallback").length).toBeGreaterThan(0));
    expect(within(exportDeliveryApi).getByText(/API_REQUEST_FAILED/)).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByText("trace-export-error-visible")).toBeInTheDocument();
    expect(within(exportDeliveryApi).getByRole("button", { name: "Review local API delivery" })).toBeInTheDocument();

    const diagnostics = within(exportDeliveryApi).getByLabelText("Sanitized diagnostics");
    const diagnosticsText = diagnostics.textContent?.toLowerCase() ?? "";
    for (const unsafe of [
      "private key",
      "seed phrase",
      "bearer token",
      "signed url",
      "object key",
      "storage key",
      "raw signature",
      "provider payload",
      "stack trace",
      "campaign-os-kitty",
      "token=secret",
    ]) {
      expect(diagnosticsText).not.toContain(unsafe);
    }
    expect(
      within(exportDeliveryApi).queryByRole("button", {
        name: /download|upload|store|signed URL|contract root|wallet signing|custody|distribute|reward/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("switches major Project Console copy manually to zh-CN", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "zh-CN" } });

    expect(screen.getByRole("heading", { name: "活动运营工作台" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "项目控制台" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const nav = screen.getByRole("navigation", { name: "项目控制台工作区导航" });
    for (const workspace of ["活动", "创建", "模板", "参与者", "AI 内容", "分析", "导出", "复盘", "设置"]) {
      expect(within(nav).getByRole("button", { name: workspace })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("button", { name: "活动" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Awaken 冲刺活动" })).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "活动指挥中心" })).toBeInTheDocument();
    expect(screen.getByText("4 个活动")).toBeInTheDocument();
    expect(screen.getByText("查看实时活动数据")).toBeInTheDocument();
    expect(screen.getByText("审核发布准备度")).toBeInTheDocument();
    expect(screen.getByText("批准导出预览")).toBeInTheDocument();
    expect(screen.getByText("归档最终报告")).toBeInTheDocument();
    const zhLifecycleOperations = screen.getByLabelText("Lifecycle 操作");
    expect(
      within(zhLifecycleOperations).getByRole("heading", { name: "Lifecycle 操作" }),
    ).toBeInTheDocument();
    expect(within(zhLifecycleOperations).getByText("当前状态")).toBeInTheDocument();
    expect(within(zhLifecycleOperations).getAllByText("项目方动作").length).toBeGreaterThan(0);
    expect(within(zhLifecycleOperations).getByText(/不会执行实时后端/)).toBeInTheDocument();
    const zhLaunchBundles = screen.getByLabelText("Launch Console 活动包");
    expect(
      within(zhLaunchBundles).getByRole("heading", { name: "Launch Console 活动包" }),
    ).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("预热活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("上线活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getByText("上线后活动包")).toBeInTheDocument();
    expect(within(zhLaunchBundles).getAllByText("本地预览").length).toBeGreaterThan(0);
    expect(within(zhLaunchBundles).getByText(/不会连接真实 Launch Console/)).toBeInTheDocument();
    const zhPortfolioReadiness = screen.getByLabelText("项目组合 readiness");
    expect(
      within(zhPortfolioReadiness).getByRole("heading", { name: "项目组合 readiness" }),
    ).toBeInTheDocument();
    for (const metric of [
      "已创建活动",
      "活跃项目",
      "活动配置耗时",
      "已承诺奖励预算",
      "Winners 导出",
      "项目重复使用",
    ]) {
      expect(within(zhPortfolioReadiness).getByText(metric)).toBeInTheDocument();
    }
    expect(within(zhPortfolioReadiness).getAllByText("商业化 readiness").length).toBeGreaterThan(0);
    expect(within(zhPortfolioReadiness).getByText("合作伙伴活动服务费")).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getByText("Premium analytics")).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getByText(/不会执行实时 billing、支付、发票、CRM、奖励托管/)).toBeInTheDocument();
    expect(within(zhPortfolioReadiness).getAllByText(/Campaign OS 不托管奖励、不发奖/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "参与者" }));
    const zhParticipants = screen.getByLabelText("参与者运营");
    expect(
      within(zhParticipants).getByRole("heading", { name: "参与者运营" }),
    ).toBeInTheDocument();
    expect(within(zhParticipants).getByLabelText("参与者摘要")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("钱包分布")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("语言分布")).toBeInTheDocument();
    expect(within(zhParticipants).getByText("manual_review_queue")).toBeInTheDocument();
    expect(within(zhParticipants).getAllByText(/不执行发奖/).length).toBeGreaterThan(0);
    const zhServiceReadiness = screen.getByLabelText("Points / Ranking / Referral Service readiness");
    expect(
      within(zhServiceReadiness).getByRole("heading", {
        name: "Points / Ranking / Referral Service readiness",
      }),
    ).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "积分账本" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Ranking" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Referral" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByRole("heading", { name: "Pixiepoints/backend 交接" })).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText("Raw invites")).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText("合格邀请")).toBeInTheDocument();
    expect(within(zhServiceReadiness).getByText(/Raw invites: 22/)).toBeInTheDocument();
    expect(within(zhServiceReadiness).getAllByText(/不接入实时积分账本/).length).toBeGreaterThan(0);
    expect(within(zhServiceReadiness).getAllByText(/不接入实时 Referral backend/).length).toBeGreaterThan(0);
    expect(within(zhServiceReadiness).getAllByText(/不发放奖励/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "模板" }));
    const zhForecastReadiness = screen.getByLabelText("Forecast 活动任务 readiness");
    expect(
      within(zhForecastReadiness).getByRole("heading", { name: "Forecast 活动任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhForecastReadiness).getByText("预测参与")).toBeInTheDocument();
    expect(within(zhForecastReadiness).getByText("连胜任务")).toBeInTheDocument();
    expect(within(zhForecastReadiness).getByText("Forecast 排行榜")).toBeInTheDocument();
    expect(within(zhForecastReadiness).getAllByText(/负责人/).length).toBeGreaterThan(0);
    expect(within(zhForecastReadiness).getAllByText(/不会调用真实 Forecast API/).length).toBeGreaterThan(0);
    const zhPayReadiness = screen.getByLabelText("Pay 活动任务 readiness");
    expect(
      within(zhPayReadiness).getByRole("heading", { name: "Pay 活动任务 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhPayReadiness).getByText("发票完成")).toBeInTheDocument();
    expect(within(zhPayReadiness).getByText("支付链接完成")).toBeInTheDocument();
    expect(within(zhPayReadiness).getByText("Pay 后续移交")).toBeInTheDocument();
    expect(within(zhPayReadiness).getAllByText(/负责人/).length).toBeGreaterThan(0);
    expect(within(zhPayReadiness).getAllByText(/不会调用真实 Pay 服务/).length).toBeGreaterThan(0);
    expect(within(zhPayReadiness).getAllByText(/支付链接创建/).length).toBeGreaterThan(0);
    expect(within(zhPayReadiness).getAllByText(/发票生成/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "创建" }));
    for (const step of ["目标", "任务", "奖励与资格", "i18n", "合约", "发布准备度"]) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("活动构建器").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "草稿概览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "任意钱包" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "奖励与资格设置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "多语言、合约与审核门禁" })).toBeInTheDocument();
    expect(screen.getByLabelText("翻译管理")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "发布门禁决策中心" })).toBeInTheDocument();
    expect(screen.getByText(/不执行真实发布/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "模板" }));
    expect(screen.getByRole("heading", { name: "活动模板包" })).toBeInTheDocument();
    expect(screen.getByText("aelf 新手引导活动")).toBeInTheDocument();
    expect(screen.getByText("Awaken 流动性挑战")).toBeInTheDocument();
    expect(screen.getByText(/不会执行实时 provider 验证/)).toBeInTheDocument();
    expect(screen.getAllByText(/Campaign OS 只提供模板指引/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "任务模板库" })).toBeInTheDocument();
    expect(screen.getAllByText("连接钱包").length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "分析" }));
    expect(screen.getByRole("heading", { name: "分析与导出决策" })).toBeInTheDocument();
    const zhAdvancedAnalytics = screen.getByLabelText("高级分析 readiness");
    expect(
      within(zhAdvancedAnalytics).getByRole("heading", { name: "高级分析 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Day 7 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Day 30 留存")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("产品转化")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText("Premium analytics readiness")).toBeInTheDocument();
    expect(within(zhAdvancedAnalytics).getByText(/事件仓库/)).toBeInTheDocument();
    expect(screen.getByText("最大流失点")).toBeInTheDocument();
    const localeAnalytics = screen.getByLabelText("语言 analytics 就绪状态");
    expect(within(localeAnalytics).getAllByText("活动浏览").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("钱包连接转化").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("任务完成").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("邀请转化").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getAllByText("翻译回退率").length).toBeGreaterThan(0);
    expect(within(localeAnalytics).getByText(/未接入实时 analytics SDK/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "导出" }));
    expect(screen.getByRole("heading", { name: "导出决策" })).toBeInTheDocument();
    expect(screen.getAllByText("就绪行").length).toBeGreaterThan(0);
    expect(screen.getAllByText("需复核行").length).toBeGreaterThan(0);
    expect(screen.getAllByText("阻断行").length).toBeGreaterThan(0);
    expect(screen.getAllByText(EXPORT_CSV_COLUMNS.join(",")).length).toBeGreaterThan(0);
    expect(screen.getByText(/只导出已验证记录/)).toBeInTheDocument();
    const exportArtifact = screen.getByLabelText("本地导出 artifact");
    expect(within(exportArtifact).getByText("camp-awaken-sprint-export-awaken-sprint-preview-local-review.csv")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/Artifact 批次: export-awaken-sprint-preview/)).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成下载链接")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不写入存储")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不生成合约 root")).toBeInTheDocument();
    expect(within(exportArtifact).getByText("不发奖")).toBeInTheDocument();
    expect(within(exportArtifact).getByText(/仅本地导出 artifact/)).toBeInTheDocument();
    const fulfillmentReadiness = screen.getByLabelText("导出履约 readiness");
    expect(
      within(fulfillmentReadiness).getByRole("heading", { name: "导出履约 readiness" }),
    ).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("项目方已批准")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("本地 package readiness")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不生成下载链接")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不写入存储")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不生成合约 root")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText("不发奖")).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getByText(/storage-backed 导出/)).toBeInTheDocument();
    expect(within(fulfillmentReadiness).getAllByText(/本地导出履约交接/).length).toBeGreaterThan(0);
    const exportReadiness = screen.getByLabelText("导出确认 readiness");
    expect(
      within(exportReadiness).getByRole("heading", { name: "导出确认 readiness" }),
    ).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("CSV 预览").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getAllByText("JSON 预览").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText("必需导出字段")).toBeInTheDocument();
    expect(within(exportReadiness).getByText("项目方确认项")).toBeInTheDocument();
    expect(within(exportReadiness).getAllByText("Root 与 claim 执行阻断").length).toBeGreaterThan(0);
    expect(within(exportReadiness).getByText(/不会生成真实 CSV 或 JSON 文件/)).toBeInTheDocument();
    const serviceFacade = screen.getByLabelText("本地 API Service Facade");
    expect(
      within(serviceFacade).getByRole("heading", { name: "本地 API Service Facade" }),
    ).toBeInTheDocument();
    const providerRegistry = screen.getByLabelText("Provider 证据登记表");
    expect(
      within(providerRegistry).getByRole("heading", { name: "Provider 证据登记表" }),
    ).toBeInTheDocument();
    expect(within(providerRegistry).getByText("登记条目")).toBeInTheDocument();
    expect(within(providerRegistry).getByText("缺失真实 evidence")).toBeInTheDocument();
    expect(within(providerRegistry).getByText(/不会调用实时 API/)).toBeInTheDocument();
    const liveConnectorBoundary = screen.getByLabelText("Live wallet connector boundary");
    expect(within(liveConnectorBoundary).getByText("Connector 候选")).toBeInTheDocument();
    expect(within(liveConnectorBoundary).getAllByText("已关闭 / 需审核").length).toBeGreaterThan(0);
    expect(within(liveConnectorBoundary).getByText(/Live wallet connector 默认关闭/)).toBeInTheDocument();
    expect(screen.getByText("面向未来 agent 与 API 的只读 contract registry。")).toBeInTheDocument();
    expect(screen.getByText("创建活动草稿")).toBeInTheDocument();
    expect(screen.getByText("验证任务")).toBeInTheDocument();
    expect(screen.getByText("导出 winners")).toBeInTheDocument();
    expect(screen.getAllByText(/不会调用实时 API/).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "复盘" }));
    const zhCloseout = screen.getByLabelText("活动后复盘");
    expect(
      within(zhCloseout).getByRole("heading", { name: "活动后复盘" }),
    ).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("Closeout 摘要")).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("Closeout 门禁")).toBeInTheDocument();
    expect(within(zhCloseout).getByLabelText("AI 复盘")).toBeInTheDocument();
    expect(within(zhCloseout).getAllByText(/Winner 报告/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/奖励责任/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/不接入实时 analytics/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).getAllByText(/不托管或发放奖励/).length).toBeGreaterThan(0);
    expect(within(zhCloseout).queryByRole("button", { name: /发奖|claim|archive|export file|contract/i })).not.toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "设置" }));
    const zhSettings = screen.getByLabelText("设置 readiness");
    expect(
      within(zhSettings).getByRole("heading", { name: "设置 readiness" }),
    ).toBeInTheDocument();
    expect(within(zhSettings).getByLabelText("设置摘要")).toBeInTheDocument();
    expect(within(zhSettings).getByText("钱包策略")).toBeInTheDocument();
    expect(within(zhSettings).getByText("奖励责任")).toBeInTheDocument();
    expect(within(zhSettings).getByText("导出策略")).toBeInTheDocument();
    expect(within(zhSettings).getByText(/不会保存真实设置/)).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "AI 内容" }));
    const aiContentPack = screen.getByLabelText("AI 内容包");
    expect(within(aiContentPack).getByRole("heading", { name: "AI 内容包" })).toBeInTheDocument();
    expect(within(aiContentPack).getByText("质量阻断")).toBeInTheDocument();
    expect(within(aiContentPack).getByText("奖励责任")).toBeInTheDocument();
  });

  it("keeps User App and Admin/Ops reachable from navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "User App" }));
    expect(screen.getByRole("heading", { name: "Awaken Sprint" })).toBeInTheDocument();
    expect(getUserAppConnectWalletButton()).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Admin/Ops" }));
    expect(screen.getByRole("heading", { name: "Review queue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Template Governance" })).toBeInTheDocument();
  });
});
