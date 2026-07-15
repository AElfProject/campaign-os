import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  canonicalizeAdminReviewJson,
  projectAdminReviewSnapshot,
  type AdminReviewWinnerRow,
  type AdminReviewWinnerSource,
} from "./adminReview";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MAX_ARTIFACT_BYTES,
  ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
  AdminReviewStoreError,
  deriveAdminReviewDecisionPayloadHash,
  type AdminExportArtifactFormat,
  type AdminExportArtifactMetadata,
  type AdminExportArtifactProjection,
  type AdminExportArtifactProjectionInput,
  type AdminExportArtifactProjectionSource,
  type AdminExportArtifactResult,
  type AdminReviewDecisionRecord,
  type AdminReviewJsonObject,
  type AdminReviewOperationContext,
  type AdminReviewSnapshotRows,
  type AdminReviewStore,
} from "./adminReviewStore";
import {
  ADMIN_EXPORT_ARTIFACT_CSV_HEADERS,
  AdminExportArtifactError,
  csvAdminExportArtifactSerializer,
  generateAdminExportArtifact,
  jsonAdminExportArtifactSerializer,
  serializeAdminExportArtifact,
  serializeAdminExportArtifactWithStrategy,
  type ArtifactSerializer,
} from "./adminExportArtifact";

const sha256 = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

const campaign = (id: string) => ({
  contractMode: "OFF_CHAIN_MVP" as const,
  endTime: "2026-08-15T00:00:00.000Z",
  id,
  startTime: "2026-08-01T00:00:00.000Z",
  status: "ended",
  updatedAt: "2026-07-15T00:00:01.000Z",
  walletPolicy: "ANY" as const,
});

const winnerRow = (
  participantId: string,
  overrides: Partial<AdminReviewWinnerRow> = {},
): AdminReviewWinnerRow => ({
  campaignId: "campaign-export-0001",
  decisionId: `decision-${participantId}`,
  decisionVersion: 1,
  evidenceHashes: [sha256(`evidence-${participantId}`)],
  participantId,
  rank: 1,
  snapshotFingerprint: sha256(`snapshot-${participantId}`),
  totalPoints: 100,
  walletAddress: `wallet-${participantId}`,
  ...overrides,
});

const winnerSource = (
  rows: readonly AdminReviewWinnerRow[],
  campaignId = rows[0]?.campaignId ?? "campaign-export-0001",
): AdminReviewWinnerSource => {
  const manifest = {
    campaign: campaign(campaignId),
    rows,
    version: ADMIN_ARTIFACT_SOURCE_VERSION,
  } satisfies AdminReviewWinnerSource["manifest"];
  const canonicalJson = canonicalizeAdminReviewJson(
    manifest as unknown as AdminReviewJsonObject,
    { field: "manifest", traceId: "trace-artifact-source-fixture" },
  );

  return {
    canonicalJson,
    fingerprint: sha256(canonicalJson),
    manifest,
    rowCount: rows.length,
    rows,
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
  };
};

const specialRows = (): readonly AdminReviewWinnerRow[] => [
  winnerRow("participant,\"line\n\u96ea", {
    evidenceHashes: [],
    rank: 2,
    totalPoints: 100,
    walletAddress: "=SUM(1,1)",
  }),
  winnerRow("participant-plus", {
    rank: 1,
    totalPoints: 100,
    walletAddress: "+cmd",
  }),
  winnerRow("participant-minus", { walletAddress: "-cmd" }),
  winnerRow("participant-at", { walletAddress: "@cmd" }),
  winnerRow("participant-tab", { walletAddress: "\tcmd" }),
  winnerRow("participant-cr", { walletAddress: "\rcmd" }),
  winnerRow("participant-lf", { walletAddress: "\ncmd" }),
];

const transactionRows = (
  campaignId = "campaign-export-0001",
  points = 10,
): AdminReviewSnapshotRows => ({
  campaign: campaign(campaignId),
  completions: [{
    accountType: "EOA",
    campaignId,
    completedAt: "2026-07-15T00:10:00.000Z",
    id: "completion-export-0001",
    pointsAwarded: points,
    status: "completed",
    taskId: "task-export-0001",
    updatedAt: "2026-07-15T00:10:01.000Z",
    walletAddress: "wallet-export-0001",
    walletSource: "PORTKEY_EOA_EXTENSION",
  }],
  evidence: [{
    campaignId,
    capturedAt: "2026-07-15T00:10:02.000Z",
    completionId: "completion-export-0001",
    diagnosticCodes: [],
    evidenceHash: sha256(`evidence-${points}`),
    evidenceSource: "AELFSCAN",
    id: "evidence-export-0001",
    pointsAwarded: points,
    status: "completed",
    taskId: "task-export-0001",
    updatedAt: "2026-07-15T00:10:03.000Z",
    walletAddress: "wallet-export-0001",
  }],
  participants: [{
    accountType: "EOA",
    campaignId,
    createdAt: "2026-07-15T00:00:02.000Z",
    id: "participant-export-0001",
    rank: 1,
    riskFlags: [],
    totalPoints: points,
    updatedAt: "2026-07-15T00:10:04.000Z",
    walletAddress: "wallet-export-0001",
    walletSource: "PORTKEY_EOA_EXTENSION",
    walletTypeVerified: true,
  }],
  ranking: [{
    campaignId,
    createdAt: "2026-07-15T00:10:04.000Z",
    participantId: "participant-export-0001",
    rank: 1,
    totalPoints: points,
    walletAddress: "wallet-export-0001",
  }],
  tasks: [{
    campaignId,
    id: "task-export-0001",
    points,
    required: true,
    updatedAt: "2026-07-15T00:00:03.000Z",
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
  }],
});

const transactionSource = (
  points = 10,
  campaignId = "campaign-export-0001",
): AdminExportArtifactProjectionSource => {
  const rows = transactionRows(campaignId, points);
  const snapshot = projectAdminReviewSnapshot(rows, {
    generatedAt: "2026-07-15T01:00:00.000Z",
    participantId: "participant-export-0001",
    traceId: "trace-artifact-snapshot-fixture",
  });
  const decision: AdminReviewDecisionRecord = {
    campaignId,
    decidedAt: "2026-07-15T01:10:00.000Z",
    decision: "approved",
    id: `decision-export-${points}`,
    idempotencyKeyHash: sha256(`key-${points}`),
    operatorRole: "review_operator",
    operatorSubject: "operator-export-0001",
    participantId: "participant-export-0001",
    payloadHash: "",
    reasonCode: "evidence_verified",
    snapshotFingerprint: snapshot.fingerprint,
    snapshotManifest: snapshot.manifest as unknown as AdminReviewJsonObject,
    snapshotVersion: "review-snapshot-v1",
    traceId: "trace-artifact-decision-fixture",
    version: 1,
    walletAddress: "wallet-export-0001",
  };
  decision.payloadHash = deriveAdminReviewDecisionPayloadHash({
    campaignId: decision.campaignId,
    decision: decision.decision,
    expectedSnapshotFingerprint: decision.snapshotFingerprint,
    operatorRole: decision.operatorRole,
    operatorSubject: decision.operatorSubject,
    participantId: decision.participantId,
    reasonCode: decision.reasonCode,
  });

  return { latestDecisions: [decision], rows };
};

const metadataFromProjection = (
  input: AdminExportArtifactProjectionInput,
  projection: AdminExportArtifactProjection,
  context: AdminReviewOperationContext,
  id: string,
): AdminExportArtifactMetadata => ({
  campaignId: input.campaignId,
  contentBytes: Buffer.byteLength(projection.content, "utf8"),
  contentHash: projection.contentHash,
  createdAt: "2026-07-15T02:00:00.000Z",
  creatorRole: input.creatorRole,
  creatorSubject: input.creatorSubject,
  fileName: projection.fileName,
  format: input.format,
  id,
  mimeType: projection.mimeType,
  rowCount: projection.rowCount,
  sourceFingerprint: projection.sourceFingerprint,
  sourceVersion: projection.sourceVersion,
  traceId: context.traceId,
});

class AtomicArtifactStore {
  readonly records: Array<{
    artifact: AdminExportArtifactMetadata;
    content: string;
  }> = [];
  insertCount = 0;
  source = transactionSource();
  private lock = Promise.resolve();

  readonly putArtifactFromSnapshot = vi.fn(async (
    input: AdminExportArtifactProjectionInput,
    projectArtifact: (
      source: AdminExportArtifactProjectionSource,
    ) => AdminExportArtifactProjection | Promise<AdminExportArtifactProjection>,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactResult> => {
    const snapshot = structuredClone(this.source) as AdminExportArtifactProjectionSource;
    const projection = await projectArtifact(snapshot);
    if (
      input.expectedSourceFingerprint !== undefined
      && input.expectedSourceFingerprint !== projection.sourceFingerprint
    ) {
      throw new AdminReviewStoreError({
        code: "ADMIN_REVIEW_STORE_STALE",
        field: "expectedSourceFingerprint",
        operation: "putArtifactFromSnapshot",
        traceId: context.traceId,
      });
    }

    const previousLock = this.lock;
    let unlock = (): void => undefined;
    this.lock = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    await previousLock;
    try {
      const existing = this.records.find(({ artifact }) =>
        artifact.campaignId === input.campaignId
        && artifact.sourceFingerprint === projection.sourceFingerprint
        && artifact.format === input.format);
      if (existing) {
        return { artifact: existing.artifact, created: false };
      }
      const artifact = metadataFromProjection(
        input,
        projection,
        context,
        `artifact-export-${this.records.length + 1}`,
      );
      this.records.push({ artifact, content: projection.content });
      this.insertCount += 1;
      return { artifact, created: true };
    } finally {
      unlock();
    }
  });

  asPort(): AdminReviewStore {
    return {
      putArtifactFromSnapshot: this.putArtifactFromSnapshot,
    } as unknown as AdminReviewStore;
  }
}

const trustedContext = {
  operatorRole: "review_operator" as const,
  operatorSubject: "operator-export-0001",
  traceId: "trace-artifact-generate-0001",
};

describe("Admin export artifact serializer contract", () => {
  it.each(["csv", "json"] as const)(
    "serializes %s content, exact UTF-8 bytes, rows, and lowercase SHA-256 deterministically",
    (format) => {
      const source = winnerSource(specialRows());
      const results = Array.from({ length: 100 }, () =>
        serializeAdminExportArtifact(source, format));
      const first = results[0]!;

      expect(new Set(results.map(({ content }) => content))).toEqual(new Set([first.content]));
      expect(new Set(results.map(({ contentBytes }) => contentBytes))).toEqual(
        new Set([Buffer.byteLength(first.content, "utf8")]),
      );
      expect(new Set(results.map(({ contentHash }) => contentHash))).toEqual(
        new Set([sha256(first.content)]),
      );
      expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(first.rowCount).toBe(source.rows.length);
      expect(first.contentBytes).toBeGreaterThan(first.content.length);
    },
  );

  it("keeps the WP03 authority order instead of sorting winner rows again", () => {
    const rows = [
      winnerRow("participant-b", { rank: 2 }),
      winnerRow("participant-a", { rank: 1 }),
    ];
    const source = winnerSource(rows);
    const json = JSON.parse(serializeAdminExportArtifact(source, "json").content) as {
      rows: Array<{ participantId: string }>;
    };
    const csv = serializeAdminExportArtifact(source, "csv").content;

    expect(json.rows.map(({ participantId }) => participantId)).toEqual([
      "participant-b",
      "participant-a",
    ]);
    expect(csv.indexOf("participant-b")).toBeLessThan(csv.indexOf("participant-a"));
    expect(serializeAdminExportArtifact(winnerSource([...rows]), "json").content)
      .toBe(serializeAdminExportArtifact(source, "json").content);
  });

  it("uses fixed CSV fields, CRLF, RFC4180 quoting, and deterministic formula mitigation", () => {
    const result = serializeAdminExportArtifact(winnerSource(specialRows()), "csv");
    const [header] = result.content.split("\r\n");

    expect(header).toBe(ADMIN_EXPORT_ARTIFACT_CSV_HEADERS.join(","));
    expect(result.content.endsWith("\r\n")).toBe(true);
    expect(result.content).toContain("\"participant,\"\"line\n\u96ea\"");
    expect(result.content).toContain("\"'=SUM(1,1)\"");
    expect(result.content).toContain("'+cmd");
    expect(result.content).toContain("'-cmd");
    expect(result.content).toContain("'@cmd");
    expect(result.content).toContain("'\tcmd");
    expect(result.content).toContain("\"'\rcmd\"");
    expect(result.content).toContain("\"'\ncmd\"");
    expect(result.mimeType).toBe("text/csv;charset=utf-8");
  });

  it("uses fixed JSON version/source/rows ordering and only allowlisted row properties", () => {
    const row = {
      ...winnerRow("participant-json"),
      generatedLocalPath: "/Users/private/export.json",
      operatorCredential: "Bearer secret",
      rawProof: "proof-secret",
    };
    const source = {
      ...winnerSource([row]),
      arbitraryTopLevelSecret: "token-secret",
    } as AdminReviewWinnerSource;

    expect(() => serializeAdminExportArtifact(source, "json")).toThrowError(
      expect.objectContaining({
        code: "ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE",
        field: "rows",
      }),
    );

    const safe = serializeAdminExportArtifact(
      winnerSource([winnerRow("participant-json")]),
      "json",
    );
    expect(Object.keys(JSON.parse(safe.content) as object)).toEqual(["version", "source", "rows"]);
    expect(safe.content.indexOf('"campaignId"')).toBeLessThan(
      safe.content.indexOf('"decisionId"'),
    );
    expect(safe.content).not.toMatch(
      /generatedLocalPath|operatorCredential|rawProof|Bearer|\/Users\/|token-secret/,
    );
    expect(safe.mimeType).toBe("application/json;charset=utf-8");
  });

  it("accepts zero and 5000 rows, then rejects 5001 rows before producing content", () => {
    expect(serializeAdminExportArtifact(winnerSource([]), "csv")).toMatchObject({
      rowCount: 0,
    });
    const rows = Array.from({ length: ADMIN_REVIEW_MAX_ARTIFACT_ROWS }, (_, index) =>
      winnerRow(`p${index}`, {
        decisionId: `d${index}`,
        evidenceHashes: [],
        walletAddress: `w${index}`,
      }));
    expect(serializeAdminExportArtifact(winnerSource(rows), "csv").rowCount)
      .toBe(ADMIN_REVIEW_MAX_ARTIFACT_ROWS);

    const oversizedSource = {
      ...winnerSource(rows),
      rowCount: ADMIN_REVIEW_MAX_ARTIFACT_ROWS + 1,
      rows: [...rows, winnerRow("participant-overflow")],
      manifest: {
        ...winnerSource(rows).manifest,
        rows: [...rows, winnerRow("participant-overflow")],
      },
    } as AdminReviewWinnerSource;
    expect(() => serializeAdminExportArtifact(oversizedSource, "csv")).toThrowError(
      expect.objectContaining({
        code: "ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED",
        field: "rows",
        limit: ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
      }),
    );
  });

  it("accepts exactly 10 MiB and rejects one additional UTF-8 byte", () => {
    const source = winnerSource([]);
    const strategy = (content: string): ArtifactSerializer => ({
      format: "json",
      mimeType: "application/json;charset=utf-8",
      serialize: () => content,
    });

    expect(serializeAdminExportArtifactWithStrategy(
      source,
      strategy("x".repeat(ADMIN_REVIEW_MAX_ARTIFACT_BYTES)),
    ).contentBytes).toBe(ADMIN_REVIEW_MAX_ARTIFACT_BYTES);
    expect(() => serializeAdminExportArtifactWithStrategy(
      source,
      strategy("x".repeat(ADMIN_REVIEW_MAX_ARTIFACT_BYTES + 1)),
    )).toThrowError(expect.objectContaining({
      code: "ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED",
      field: "content",
      limit: ADMIN_REVIEW_MAX_ARTIFACT_BYTES,
    }));
  });

  it.each([
    ["NaN points", { totalPoints: Number.NaN }, "totalPoints"],
    ["infinite points", { totalPoints: Number.POSITIVE_INFINITY }, "totalPoints"],
    ["negative points", { totalPoints: -1 }, "totalPoints"],
    ["invalid rank", { rank: 0 }, "rank"],
    ["invalid snapshot hash", { snapshotFingerprint: "not-a-hash" }, "snapshotFingerprint"],
    ["oversized value", { participantId: "p".repeat(161) }, "participantId"],
  ] as const)("typed-rejects %s without reflecting the row", (_name, overrides, field) => {
    const unsafeMarker = "private-row-value-must-not-leak";
    const validSource = winnerSource([winnerRow(unsafeMarker)]);
    const row = { ...validSource.rows[0]!, ...overrides } as AdminReviewWinnerRow;
    const source = {
      ...validSource,
      manifest: { ...validSource.manifest, rows: [row] },
      rows: [row],
    } as AdminReviewWinnerSource;

    try {
      serializeAdminExportArtifact(source, "json");
      throw new Error("Expected serialization to reject invalid source data.");
    } catch (error) {
      expect(error).toBeInstanceOf(AdminExportArtifactError);
      expect(error).toMatchObject({
        code: expect.stringMatching(/^ADMIN_EXPORT_ARTIFACT_/),
        field,
      });
      expect(String(error)).not.toContain(unsafeMarker);
    }
  });

  it("rejects duplicate Participants and invalid format/strategy contracts", () => {
    const duplicateRows = [winnerRow("participant-duplicate"), winnerRow("participant-duplicate")];
    expect(() => serializeAdminExportArtifact(winnerSource(duplicateRows), "csv"))
      .toThrowError(expect.objectContaining({
        code: "ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE",
        field: "participantId",
      }));
    expect(() => serializeAdminExportArtifact(
      winnerSource([]),
      "xml" as AdminExportArtifactFormat,
    )).toThrowError(expect.objectContaining({
      code: "ADMIN_EXPORT_ARTIFACT_INVALID_INPUT",
      field: "format",
    }));
    expect(() => serializeAdminExportArtifactWithStrategy(winnerSource([]), {
      ...csvAdminExportArtifactSerializer,
      mimeType: "application/json;charset=utf-8",
    })).toThrowError(expect.objectContaining({
      code: "ADMIN_EXPORT_ARTIFACT_INVALID_INPUT",
      field: "mimeType",
    }));
  });

  it("preserves WP03 bounded evidence-hash identifiers without treating them as SHA-256 authority", () => {
    const source = winnerSource([winnerRow("participant-evidence-id", {
      evidenceHashes: ["evidence-hash:bridge", "evidence-hash:share"],
    })]);

    expect(serializeAdminExportArtifact(source, "json").content).toContain(
      '"evidenceHashes":["evidence-hash:bridge","evidence-hash:share"]',
    );
  });

  it.each([
    csvAdminExportArtifactSerializer,
    jsonAdminExportArtifactSerializer,
  ])("generates bounded safe filenames for $format", (strategy) => {
    const result = serializeAdminExportArtifactWithStrategy(
      winnerSource([], "../\u6d3b\u52a8/with controls\r\n"),
      strategy,
    );

    expect(result.fileName).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(result.fileName.length).toBeLessThanOrEqual(180);
    expect(result.fileName).toContain(result.sourceFingerprint.slice(0, 12));
    expect(result.fileName.endsWith(`.${strategy.format}`)).toBe(true);
    expect(result.fileName).not.toMatch(/[\\/\r\n]/);
  });
});

describe("Admin export artifact generation orchestration", () => {
  it("projects one WP03 winner source inside WP02 atomic persistence and returns a narrow receipt", async () => {
    const store = new AtomicArtifactStore();
    const clock = vi.fn(() => "2026-07-15T01:00:00.000Z");

    const receipt = await generateAdminExportArtifact(
      store.asPort(),
      { campaignId: "campaign-export-0001", format: "csv" },
      trustedContext,
      { clock },
    );

    expect(clock).toHaveBeenCalledOnce();
    expect(store.putArtifactFromSnapshot).toHaveBeenCalledOnce();
    expect(store.putArtifactFromSnapshot.mock.calls[0]?.[0]).toEqual({
      campaignId: "campaign-export-0001",
      creatorRole: "review_operator",
      creatorSubject: "operator-export-0001",
      format: "csv",
    });
    expect(receipt).toEqual({
      artifact: expect.objectContaining({
        campaignId: "campaign-export-0001",
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        format: "csv",
        id: "artifact-export-1",
        rowCount: 1,
        sourceFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      created: true,
    });
    expect(Object.keys(receipt)).toEqual(["artifact", "created"]);
    expect(store.records[0]?.content).toContain("participant-export-0001");
  });

  it("returns the canonical existing artifact for a same-source retry", async () => {
    const store = new AtomicArtifactStore();
    const first = await generateAdminExportArtifact(
      store.asPort(),
      { campaignId: "campaign-export-0001", format: "json" },
      trustedContext,
    );
    const replay = await generateAdminExportArtifact(
      store.asPort(),
      { campaignId: "campaign-export-0001", format: "json" },
      { ...trustedContext, traceId: "trace-artifact-generate-replay" },
    );

    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.artifact.id).toBe(first.artifact.id);
    expect(replay.artifact.contentHash).toBe(first.artifact.contentHash);
    expect(store.insertCount).toBe(1);
  });

  it("creates a new artifact after the source changes without mutating the old artifact", async () => {
    const store = new AtomicArtifactStore();
    const first = await generateAdminExportArtifact(
      store.asPort(),
      { campaignId: "campaign-export-0001", format: "csv" },
      trustedContext,
    );
    const oldContent = store.records[0]!.content;
    store.source = transactionSource(20);
    const second = await generateAdminExportArtifact(
      store.asPort(),
      { campaignId: "campaign-export-0001", format: "csv" },
      { ...trustedContext, traceId: "trace-artifact-generate-new-source" },
    );

    expect(second.created).toBe(true);
    expect(second.artifact.id).not.toBe(first.artifact.id);
    expect(second.artifact.sourceFingerprint).not.toBe(first.artifact.sourceFingerprint);
    expect(store.records).toHaveLength(2);
    expect(store.records[0]).toMatchObject({
      artifact: first.artifact,
      content: oldContent,
    });
  });

  it("delegates an expected-source mismatch to the transaction and performs no insert", async () => {
    const store = new AtomicArtifactStore();

    await expect(generateAdminExportArtifact(
      store.asPort(),
      {
        campaignId: "campaign-export-0001",
        expectedSourceFingerprint: "f".repeat(64),
        format: "csv",
      },
      trustedContext,
    )).rejects.toMatchObject({
      code: "ADMIN_EXPORT_ARTIFACT_STALE",
      field: "expectedSourceFingerprint",
      traceId: trustedContext.traceId,
    });
    expect(store.insertCount).toBe(0);
    expect(store.records).toEqual([]);
  });

  it("fails closed when the transactional source changes instead of persisting mixed content", async () => {
    const persisted: AdminExportArtifactProjection[] = [];
    const putArtifactFromSnapshot = vi.fn(async (
      _input: AdminExportArtifactProjectionInput,
      projectArtifact: (source: AdminExportArtifactProjectionSource) =>
        AdminExportArtifactProjection | Promise<AdminExportArtifactProjection>,
      context: AdminReviewOperationContext,
    ): Promise<AdminExportArtifactResult> => {
      const readProjection = await projectArtifact(transactionSource(10));
      const changedProjection = await projectArtifact(transactionSource(20));
      expect(changedProjection.sourceFingerprint).not.toBe(readProjection.sourceFingerprint);
      throw new AdminReviewStoreError({
        code: "ADMIN_REVIEW_STORE_STALE",
        field: "sourceFingerprint",
        operation: "putArtifactFromSnapshot",
        traceId: context.traceId,
      });
    });
    const store = { putArtifactFromSnapshot } as unknown as AdminReviewStore;

    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "json" },
      trustedContext,
    )).rejects.toMatchObject({ code: "ADMIN_EXPORT_ARTIFACT_STALE" });
    expect(persisted).toEqual([]);
  });

  it("serializes twenty same-source requests into one canonical identity", async () => {
    const store = new AtomicArtifactStore();
    const receipts = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      generateAdminExportArtifact(
        store.asPort(),
        { campaignId: "campaign-export-0001", format: "csv" },
        { ...trustedContext, traceId: `trace-artifact-race-${index}` },
      )));

    expect(store.insertCount).toBe(1);
    expect(receipts.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(receipts.map(({ artifact }) => artifact.id)).size).toBe(1);
    expect(new Set(receipts.map(({ artifact }) => artifact.contentHash)).size).toBe(1);
  });

  it("keeps concurrent CSV and JSON idempotency keys isolated by format", async () => {
    const store = new AtomicArtifactStore();
    const receipts = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      generateAdminExportArtifact(
        store.asPort(),
        {
          campaignId: "campaign-export-0001",
          format: index % 2 === 0 ? "csv" : "json",
        },
        { ...trustedContext, traceId: `trace-artifact-format-race-${index}` },
      )));

    expect(store.insertCount).toBe(2);
    expect(new Set(receipts.filter(({ artifact }) => artifact.format === "csv")
      .map(({ artifact }) => artifact.id)).size).toBe(1);
    expect(new Set(receipts.filter(({ artifact }) => artifact.format === "json")
      .map(({ artifact }) => artifact.id)).size).toBe(1);
    expect(receipts.filter(({ created }) => created)).toHaveLength(2);
  });

  it.each([
    [
      "serializer failure",
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE",
    ],
    [
      "store failure",
      "ADMIN_REVIEW_STORE_QUERY_FAILED",
      "ADMIN_EXPORT_ARTIFACT_UNAVAILABLE",
    ],
  ] as const)("leaves no partial artifact after %s", async (
    _caseName,
    storeCode,
    artifactCode,
  ) => {
    const persisted: AdminExportArtifactProjection[] = [];
    const putArtifactFromSnapshot = vi.fn(async (
      _input: AdminExportArtifactProjectionInput,
      projectArtifact: (source: AdminExportArtifactProjectionSource) =>
        AdminExportArtifactProjection | Promise<AdminExportArtifactProjection>,
      context: AdminReviewOperationContext,
    ): Promise<AdminExportArtifactResult> => {
      if (storeCode === "ADMIN_REVIEW_STORE_ARGUMENT_INVALID") {
        const invalid = transactionSource();
        (invalid.rows.participants[0] as { totalPoints: number }).totalPoints = Number.NaN;
        await projectArtifact(invalid);
      } else {
        await projectArtifact(transactionSource());
      }
      throw new AdminReviewStoreError({
        code: storeCode,
        field: storeCode === "ADMIN_REVIEW_STORE_ARGUMENT_INVALID" ? "projectArtifact" : "database",
        operation: "putArtifactFromSnapshot",
        traceId: context.traceId,
      });
    });
    const store = { putArtifactFromSnapshot } as unknown as AdminReviewStore;

    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "csv" },
      trustedContext,
    )).rejects.toMatchObject({ code: artifactCode });
    expect(putArtifactFromSnapshot).toHaveBeenCalledOnce();
    expect(persisted).toEqual([]);
  });

  it.each([
    ["hash", { contentHash: "0".repeat(64) }, "contentHash"],
    ["bytes", { contentBytes: 1 }, "contentBytes"],
    ["rows", { rowCount: 0 }, "rowCount"],
    ["format", { format: "json" as const }, "format"],
    ["timestamp", { createdAt: "not-a-timestamp" }, "createdAt"],
  ] as const)("rejects a store result with inconsistent %s", async (_name, override, field) => {
    const putArtifactFromSnapshot = vi.fn(async (
      input: AdminExportArtifactProjectionInput,
      projectArtifact: (source: AdminExportArtifactProjectionSource) =>
        AdminExportArtifactProjection | Promise<AdminExportArtifactProjection>,
      context: AdminReviewOperationContext,
    ): Promise<AdminExportArtifactResult> => {
      const projection = await projectArtifact(transactionSource());
      return {
        artifact: {
          ...metadataFromProjection(input, projection, context, "artifact-corrupt"),
          ...override,
        },
        created: true,
      };
    });
    const store = { putArtifactFromSnapshot } as unknown as AdminReviewStore;

    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "csv" },
      trustedContext,
    )).rejects.toMatchObject({
      code: "ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED",
      field,
    });
  });

  it("projects only allowlisted artifact metadata from the store receipt", async () => {
    const putArtifactFromSnapshot = vi.fn(async (
      input: AdminExportArtifactProjectionInput,
      projectArtifact: (source: AdminExportArtifactProjectionSource) =>
        AdminExportArtifactProjection | Promise<AdminExportArtifactProjection>,
      context: AdminReviewOperationContext,
    ): Promise<AdminExportArtifactResult> => {
      const projection = await projectArtifact(transactionSource());
      return {
        artifact: {
          ...metadataFromProjection(input, projection, context, "artifact-narrow"),
          content: "must-not-leak",
          rawProof: "must-not-leak",
        },
        created: true,
      } as AdminExportArtifactResult;
    });
    const store = { putArtifactFromSnapshot } as unknown as AdminReviewStore;

    const receipt = await generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "csv" },
      trustedContext,
    );

    expect(receipt.artifact).not.toHaveProperty("content");
    expect(receipt.artifact).not.toHaveProperty("rawProof");
    expect(Object.keys(receipt.artifact)).toEqual([
      "campaignId",
      "contentBytes",
      "contentHash",
      "createdAt",
      "creatorRole",
      "creatorSubject",
      "fileName",
      "format",
      "id",
      "mimeType",
      "rowCount",
      "sourceFingerprint",
      "sourceVersion",
      "traceId",
    ]);
  });

  it("validates commands and trusted context before calling the store", async () => {
    const putArtifactFromSnapshot = vi.fn();
    const store = { putArtifactFromSnapshot } as unknown as AdminReviewStore;

    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "", format: "csv" },
      trustedContext,
    )).rejects.toMatchObject({
      code: "ADMIN_EXPORT_ARTIFACT_INVALID_INPUT",
      field: "campaignId",
    });
    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "xml" as AdminExportArtifactFormat },
      trustedContext,
    )).rejects.toMatchObject({ field: "format" });
    await expect(generateAdminExportArtifact(
      store,
      { campaignId: "campaign-export-0001", format: "csv" },
      { ...trustedContext, operatorRole: "owner" as "review_operator" },
    )).rejects.toMatchObject({ field: "operatorRole" });
    expect(putArtifactFromSnapshot).not.toHaveBeenCalled();
  });
});
