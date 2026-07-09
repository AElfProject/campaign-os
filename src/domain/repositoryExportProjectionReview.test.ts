import { describe, expect, it } from "vitest";
import type { CampaignDbExportProjection } from "../server/campaignDbRepository";
import {
  EXPORT_CSV_COLUMNS,
  createRepositoryExportProjectionReviewModel,
} from "./index";
import type { LocalizedText } from "./types";

const localized = (enUS: string, zhCN = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": enUS,
});

const projectionFixture = (): CampaignDbExportProjection => ({
  artifact: {
    artifactId: "camp-repo-campaign-db-export-camp-repo-csv-local-preview",
    campaignId: "camp-repo",
    checksum: "local-1234abcd",
    checksumAlgorithm: "fnv1a32-local-review",
    columns: EXPORT_CSV_COLUMNS,
    createdAt: "2026-07-09T00:00:00.000Z",
    csvPreview: EXPORT_CSV_COLUMNS.join(","),
    format: "csv",
    generatedMode: "local_review_only",
    localPreviewMode: true,
    mimeType: "text/csv;charset=utf-8",
    payloadBytes: 512,
    safety: {
      localOnly: true,
      noContractRoot: true,
      noContractTransaction: true,
      noDownloadUrl: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
      verifiedRecordsOnly: true,
    },
  },
  blockedRows: 1,
  campaignId: "camp-repo",
  columns: EXPORT_CSV_COLUMNS,
  contractRootMode: "none",
  disclaimer: "Export winners does not distribute rewards.",
  exportBatchId: "campaign-db-export-camp-repo",
  exportReadiness: {
    acknowledgements: [
      {
        acknowledged: false,
        description: localized("Only local completion records are included."),
        id: "verified-records-only",
        label: localized("Verified records only"),
        ownerRole: "internal_operator",
        required: true,
      },
      {
        acknowledged: false,
        description: localized("Project owns future reward fulfillment."),
        id: "project-owned-reward-distribution",
        label: localized("Project-owned reward distribution"),
        ownerRole: "project_owner",
        required: true,
      },
    ],
    batchId: "campaign-db-export-camp-repo",
    boundary: localized(
      "Campaign DB repository export projection is local-review only.",
      "Campaign DB repository 导出投影仅用于本地审核。",
    ),
    campaignId: "camp-repo",
    contractRootReadiness: [
      {
        approvalRequired: false,
        boundary: localized("No contract root is created."),
        label: localized("No contract root"),
        mode: "none",
        nextAction: localized("Keep no-root mode for local review."),
        readiness: "ready",
        safeDefault: true,
      },
    ],
    fieldCoverage: {
      coverageReady: true,
      missingFields: [],
      presentFields: EXPORT_CSV_COLUMNS,
      requiredFields: EXPORT_CSV_COLUMNS,
    },
    nextAction: localized("Review local rows before project-owned fulfillment."),
    previewModes: [
      {
        boundary: localized("CSV is local preview only."),
        downloadAvailable: false,
        generatesFile: false,
        includedFields: EXPORT_CSV_COLUMNS,
        label: localized("CSV local preview"),
        mode: "csv",
        nextAction: localized("Use CSV for local review."),
        readiness: "ready",
      },
      {
        boundary: localized("JSON is local preview only."),
        downloadAvailable: false,
        generatesFile: false,
        includedFields: EXPORT_CSV_COLUMNS,
        label: localized("JSON local preview"),
        mode: "json",
        nextAction: localized("Use JSON for local review."),
        readiness: "ready",
      },
    ],
    repository: {
      adapterId: "campaign-db-deterministic-adapter",
      createdViaRepository: true,
      repositoryId: "campaign-db-deterministic-adapter",
      storeId: "campaign-db",
    },
    rowStatusCoverage: [
      {
        affectedRows: 1,
        label: localized("Ready rows"),
        nextAction: localized("Keep rows available for local export review."),
        reasonCode: "eligible_verified",
        rowStatus: "ready",
      },
      {
        affectedRows: 1,
        label: localized("Review-required rows"),
        nextAction: localized("Resolve pending required tasks before approval."),
        reasonCode: "risk_review_required",
        rowStatus: "review_required",
      },
      {
        affectedRows: 1,
        label: localized("Blocked rows"),
        nextAction: localized("Complete missing required tasks before export approval."),
        reasonCode: "missing_required_tasks",
        rowStatus: "blocked",
      },
    ],
    summary: {
      acknowledgedItems: 0,
      blockedRows: 1,
      previewModeCount: 2,
      readyRows: 1,
      requiredAcknowledgements: 2,
      reviewRequiredRows: 1,
      totalRows: 3,
    },
  },
  format: "csv",
  readyRows: 1,
  repository: {
    adapterId: "campaign-db-deterministic-adapter",
    createdViaRepository: true,
    repositoryId: "campaign-db-deterministic-adapter",
    storeId: "campaign-db",
  },
  reviewRequiredRows: 1,
  rows: [
    {
      accountType: "EOA",
      campaignId: "camp-repo",
      eligible: true,
      evidenceHashes: ["evidence-hash:bridge", "evidence-hash:share"],
      exportBatchId: "campaign-db-export-camp-repo",
      localePreference: "en-US",
      missingColumnValues: [],
      missingTasks: [],
      rank: 1,
      referrerAddress: "",
      riskFlags: [],
      rowStatus: "ready",
      taskRecords: [
        {
          completedAt: "2026-07-09T00:00:00.000Z",
          evidenceHash: "evidence-hash:bridge",
          evidenceId: "campaign-db-task-evidence-0001",
          evidenceRef: "local-review:bridge",
          evidenceSource: "AEFINDER",
          liveContractExecuted: false,
          liveProviderExecuted: false,
          liveRewardExecuted: false,
          liveStorageExecuted: false,
          pointsAwarded: 120,
          pointsAvailable: 120,
          required: true,
          status: "completed",
          taskId: "task-bridge",
          templateCode: "bridge_ebridge",
          updatedAt: "2026-07-09T00:00:00.000Z",
          verificationType: "ON_CHAIN",
        },
      ],
      totalPoints: 170,
      walletAddress: "2F4ReadyWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
      walletTypeVerified: true,
    },
    {
      accountType: "AA",
      campaignId: "camp-repo",
      eligible: false,
      evidenceHashes: ["evidence-hash:pending"],
      exportBatchId: "campaign-db-export-camp-repo",
      localePreference: "en-US",
      missingColumnValues: [],
      missingTasks: ["bridge_ebridge"],
      rank: 2,
      referrerAddress: "",
      riskFlags: ["manual_review_required"],
      rowStatus: "review_required",
      taskRecords: [
        {
          evidenceHash: "evidence-hash:pending",
          evidenceId: "campaign-db-task-evidence-0002",
          evidenceSource: "MANUAL",
          liveContractExecuted: false,
          liveProviderExecuted: false,
          liveRewardExecuted: false,
          liveStorageExecuted: false,
          pointsAwarded: 0,
          pointsAvailable: 120,
          required: true,
          status: "pending",
          taskId: "task-bridge",
          templateCode: "bridge_ebridge",
          updatedAt: "2026-07-09T00:01:00.000Z",
          verificationType: "ON_CHAIN",
        },
      ],
      totalPoints: 0,
      walletAddress: "2F4ReviewWallet",
      walletSource: "PORTKEY_AA",
      walletTypeVerified: true,
    },
    {
      accountType: "UNKNOWN",
      campaignId: "camp-repo",
      eligible: false,
      evidenceHashes: [],
      exportBatchId: "campaign-db-export-camp-repo",
      localePreference: "en-US",
      missingColumnValues: ["task_records"],
      missingTasks: ["bridge_ebridge"],
      referrerAddress: "",
      riskFlags: [],
      rowStatus: "blocked",
      taskRecords: [
        {
          pointsAwarded: 0,
          pointsAvailable: 120,
          required: true,
          status: "missing",
          taskId: "task-bridge",
          templateCode: "bridge_ebridge",
          verificationType: "ON_CHAIN",
        },
      ],
      totalPoints: 0,
      walletAddress: "2F4BlockedWallet",
      walletSource: "OTHER",
      walletTypeVerified: false,
    },
  ],
});

describe("repository export projection review model", () => {
  it("derives deterministic summary state and top blocker from repository readiness", () => {
    const projection = projectionFixture();
    const model = createRepositoryExportProjectionReviewModel(projection, "en-US");
    const repeated = createRepositoryExportProjectionReviewModel(projection, "en-US");

    expect(model).toEqual(repeated);
    expect(model.ariaLabel).toBe("Repository export projection review");
    expect(model.repositoryLabel).toBe("campaign-db / campaign-db-deterministic-adapter");
    expect(model.readinessState).toBe("blocked");
    expect(model.summary).toEqual({
      acknowledgedItems: 0,
      blockedRows: 1,
      previewModeCount: 2,
      readyRows: 1,
      requiredAcknowledgements: 2,
      reviewRequiredRows: 1,
      totalRows: 3,
    });
    expect(model.topBlocker).toMatchObject({
      label: "Blocked rows",
      nextAction: "Complete missing required tasks before export approval.",
      state: "blocked",
    });
  });

  it("keeps exact v0.2 CSV column order and marks every required column", () => {
    const model = createRepositoryExportProjectionReviewModel(projectionFixture(), "en-US");

    expect(model.columnCoverage.map((item) => item.column)).toEqual(EXPORT_CSV_COLUMNS);
    expect(model.columnCoverage).toHaveLength(14);
    expect(model.columnCoverage.every((item) => item.status === "covered")).toBe(true);
    expect(model.columnCoverage.map((item) => item.detail)).toContain(
      "wallet_source is covered by the repository export projection.",
    );
  });

  it("marks missing readiness fields instead of hiding required columns", () => {
    const projection = projectionFixture();
    projection.exportReadiness.fieldCoverage = {
      coverageReady: false,
      missingFields: ["risk_flags"],
      presentFields: EXPORT_CSV_COLUMNS.filter((column) => column !== "risk_flags"),
      requiredFields: EXPORT_CSV_COLUMNS,
    };

    const model = createRepositoryExportProjectionReviewModel(projection, "en-US");

    expect(model.columnCoverage.find((item) => item.column === "risk_flags")).toMatchObject({
      source: "readiness_projection",
      status: "blocked",
    });
  });

  it("normalizes representative rows with wallet provenance and task evidence", () => {
    const model = createRepositoryExportProjectionReviewModel(projectionFixture(), "en-US");

    expect(model.previewRows[0]).toMatchObject({
      accountType: "EOA",
      eligible: true,
      evidenceHashes: ["evidence-hash:bridge", "evidence-hash:share"],
      exportBatchId: "campaign-db-export-camp-repo",
      rank: 1,
      rowStatus: "ready",
      totalPoints: 170,
      walletAddress: "2F4ReadyWallet",
      walletSource: "PORTKEY_EOA_EXTENSION",
    });
    expect(model.previewRows[0].taskRecordSummary).toEqual([
      "bridge_ebridge: completed / 120 / evidence=campaign-db-task-evidence-0001 / hash=evidence-hash:bridge",
    ]);
    expect(model.previewRows[0].taskEvidence).toEqual([
      {
        evidenceHash: "evidence-hash:bridge",
        evidenceId: "campaign-db-task-evidence-0001",
        evidenceRef: "local-review:bridge",
        liveContractExecuted: false,
        liveProviderExecuted: false,
        liveRewardExecuted: false,
        liveStorageExecuted: false,
        status: "completed",
        taskId: "task-bridge",
        templateCode: "bridge_ebridge",
      },
    ]);
    expect(model.previewRows[1]).toMatchObject({
      missingTasks: ["bridge_ebridge"],
      riskFlags: ["manual_review_required"],
      rowStatus: "review_required",
    });
    expect(model.previewRows[2]).not.toHaveProperty("rank");
  });

  it("keeps all live side-effect safety flags disabled", () => {
    const model = createRepositoryExportProjectionReviewModel(projectionFixture(), "en-US");

    expect(model.safety).toEqual({
      contractRootWriteEnabled: false,
      contractTransactionEnabled: false,
      downloadAvailable: false,
      generatesFile: false,
      localReviewOnly: true,
      queueExecutionEnabled: false,
      rewardCustodyEnabled: false,
      rewardDistributionEnabled: false,
      schedulerExecutionEnabled: false,
      signedUrlEnabled: false,
      storageWriteEnabled: false,
      walletSigningEnabled: false,
    });
  });

  it("does not serialize secret-like or private artifact values", () => {
    const serialized = JSON.stringify(
      createRepositoryExportProjectionReviewModel(projectionFixture(), "en-US"),
    ).toLowerCase();

    for (const unsafe of [
      "privatekey",
      "private key",
      "seedphrase",
      "seed phrase",
      "oauthtoken",
      "telegramtoken",
      "signed-url:",
      "object-key:",
      "storage-key:",
      "storage://",
      "docs/current",
      "kitty-specs",
      "evidence/207",
      "downloadurl",
      "https://",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("fails closed when a non-repository projection is passed at runtime", () => {
    const projection = projectionFixture();

    expect(() =>
      createRepositoryExportProjectionReviewModel({
        ...projection,
        repository: {
          ...projection.repository,
          createdViaRepository: false as true,
        },
      }, "en-US"),
    ).toThrow(/repository-created projection/i);
  });
});
