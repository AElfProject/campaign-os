// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES,
  type TaskTemplateCatalogVersion,
} from "../domain/taskTemplateCatalog";
import {
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
  type ResolvedWalletSessionAuthority,
} from "./walletAuthentication";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";
import {
  createTaskTemplateCatalogService,
  type TaskTemplateCatalogAdminReadAuthority,
  type TaskTemplateCatalogOwnerAdoptionAuthority,
  type TaskTemplateCatalogOwnerReadAuthority,
} from "./taskTemplateCatalogService";
import {
  TASK_TEMPLATE_SNAPSHOT_VERSION,
  TaskTemplateCatalogError,
  type TaskTemplateAdoptedTask,
  type TaskTemplateCatalogStore,
} from "./taskTemplateCatalogStore";

const NOW = "2026-07-20T10:00:00.000Z";
const directTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "direct",
)!;
const otherDirectTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode, templateCode }) =>
    adoptionMode === "direct" && templateCode !== directTemplate.templateCode,
)!;

const issuedSession = ({
  absoluteExpiresAt = "2026-07-20T12:00:00.000Z",
  capabilities,
  idleExpiresAt = "2026-07-20T11:00:00.000Z",
  roleIds,
  walletAddress = "ELF_catalog_service_owner",
}: {
  absoluteExpiresAt?: string;
  capabilities: readonly string[];
  idleExpiresAt?: string;
  roleIds: readonly string[];
  walletAddress?: string;
}): ResolvedWalletSessionAuthority => issueResolvedWalletSessionAuthority({
  absoluteExpiresAt,
  capabilities,
  credentialBoundary: "wallet-auth-cookie/v1",
  idleExpiresAt,
  membershipRevision: "catalog-membership-v1",
  roleIds,
  sessionId: "catalog-session-v1",
  subject: issueVerifiedWalletSubject({
    accountType: "EOA",
    adapterId: "nightelf-live",
    chainId: "AELF",
    network: "mainnet",
    proofDigest: "a".repeat(64),
    proofMethod: "AELF_EOA_RECOVERABLE",
    signerAddress: walletAddress,
    verifiedAt: "2026-07-20T09:55:00.000Z",
    walletAddress,
    walletSource: "NIGHTELF",
  }),
  version: 1,
});

const ownerSession = () => issuedSession({
  capabilities: ["campaign:read", "campaign:write", "task:build"],
  roleIds: ["project_owner"],
});

const adminSession = () => issuedSession({
  capabilities: ["admin:review"],
  roleIds: ["internal_operator"],
  walletAddress: "ELF_catalog_admin",
});

const participantSession = () => issuedSession({
  capabilities: ["campaign:read", "user:participate"],
  roleIds: ["participant"],
  walletAddress: "ELF_catalog_participant",
});

const ownerReadAuthority = (
  session = ownerSession(),
): TaskTemplateCatalogOwnerReadAuthority => ({
  kind: "owner",
  session,
});

const adminReadAuthority = (
  session = adminSession(),
): TaskTemplateCatalogAdminReadAuthority => ({
  kind: "admin",
  session,
});

const ownerAdoptionAuthority = (
  session = ownerSession(),
): TaskTemplateCatalogOwnerAdoptionAuthority => ({
  campaignId: "campaign-catalog-service-1",
  kind: "owner",
  session,
});

const catalogPage = (items: readonly TaskTemplateCatalogVersion[] = [directTemplate]) => Object.freeze({
  catalogSchemaVersion: "task-template-catalog-v1" as const,
  items: Object.freeze([...items]),
  page: Object.freeze({ limit: 24, nextCursor: null }),
  snapshotAt: NOW,
  totalActive: items.length,
});

const adoptedTask = (
  overrides: Partial<TaskTemplateAdoptedTask> = {},
): TaskTemplateAdoptedTask => Object.freeze({
  campaignId: "campaign-catalog-service-1",
  createdAt: NOW,
  evidenceRule: directTemplate.evidenceRule,
  points: directTemplate.points.default,
  replayed: false,
  required: directTemplate.requiredPolicy.default,
  snapshot: Object.freeze({
    adoptionMode: "direct",
    category: directTemplate.category,
    evidenceRule: directTemplate.evidenceRule,
    points: directTemplate.points.default,
    required: directTemplate.requiredPolicy.default,
    templateChecksum: directTemplate.checksum,
    templateCode: directTemplate.templateCode,
    templateVersion: directTemplate.version,
    verificationType: directTemplate.verificationType,
    version: TASK_TEMPLATE_SNAPSHOT_VERSION,
    walletCompatibility: directTemplate.walletCompatibility,
  }),
  taskId: "task-catalog-service-1",
  templateChecksum: directTemplate.checksum,
  templateCode: directTemplate.templateCode,
  templateVersion: directTemplate.version,
  updatedAt: NOW,
  verificationType: directTemplate.verificationType,
  walletCompatibility: directTemplate.walletCompatibility,
  ...overrides,
});

type MutableAdoptionResult = Record<string, unknown> & {
  snapshot: Record<string, unknown>;
};

type AdoptionResultMutation = (task: MutableAdoptionResult) => unknown;
type ReflectionTrapName = "getOwnPropertyDescriptor" | "getPrototypeOf" | "ownKeys";

const PRIVATE_REFLECTION_MARKER = "private-reflection-marker";

const taskRequiredFields = [
  "campaignId",
  "createdAt",
  "evidenceRule",
  "points",
  "replayed",
  "required",
  "snapshot",
  "taskId",
  "templateChecksum",
  "templateCode",
  "templateVersion",
  "updatedAt",
  "verificationType",
  "walletCompatibility",
] as const;

const snapshotRequiredFields = [
  "adoptionMode",
  "category",
  "evidenceRule",
  "points",
  "required",
  "templateChecksum",
  "templateCode",
  "templateVersion",
  "verificationType",
  "version",
  "walletCompatibility",
] as const;

const mutableAdoptionResult = (): MutableAdoptionResult => {
  const task = adoptedTask();
  return {
    ...task,
    snapshot: { ...task.snapshot },
  };
};

const omitField = (
  record: Readonly<Record<string, unknown>>,
  field: string,
): Record<string, unknown> => {
  const result = { ...record };
  delete result[field];
  return result;
};

const replaceSnapshot = (
  task: MutableAdoptionResult,
  snapshot: Record<string, unknown>,
): MutableAdoptionResult => ({ ...task, snapshot });

const reflectionTrapCases = (
  ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"] as const
).flatMap((trap) => (["forged", "ordinary"] as const).map((errorKind) => ({
  errorKind,
  name: `${trap} ${errorKind} error`,
  trap,
})));

const resultWithThrowingReflectionTrap = (
  trap: ReflectionTrapName,
  error: Error,
): TaskTemplateAdoptedTask => {
  const raise = (): never => {
    throw error;
  };
  const target = mutableAdoptionResult();
  switch (trap) {
    case "getPrototypeOf":
      return new Proxy(target, { getPrototypeOf: raise }) as unknown as TaskTemplateAdoptedTask;
    case "ownKeys":
      return new Proxy(target, { ownKeys: raise }) as unknown as TaskTemplateAdoptedTask;
    case "getOwnPropertyDescriptor":
      return new Proxy(target, {
        getOwnPropertyDescriptor: raise,
      }) as unknown as TaskTemplateAdoptedTask;
  }
};

const malformedAdoptionResults: readonly Readonly<{
  name: string;
  mutate: AdoptionResultMutation;
}>[] = [
  ...taskRequiredFields.map((field) => ({
    name: `missing Task.${field}`,
    mutate: (task: MutableAdoptionResult) => omitField(task, field),
  })),
  ...snapshotRequiredFields.map((field) => ({
    name: `missing snapshot.${field}`,
    mutate: (task: MutableAdoptionResult) => replaceSnapshot(
      task,
      omitField(task.snapshot, field),
    ),
  })),
  ...(["evidenceRule", "points", "required", "verificationType", "walletCompatibility"] as const)
    .map((field) => ({
      name: `paired missing Task/snapshot ${field}`,
      mutate: (task: MutableAdoptionResult) => replaceSnapshot(
        omitField(task, field) as MutableAdoptionResult,
        omitField(task.snapshot, field),
      ),
    })),
  {
    name: "Task field is not enumerable",
    mutate: (task) => Object.defineProperty({ ...task }, "createdAt", {
      enumerable: false,
      value: task.createdAt,
    }),
  },
  {
    name: "snapshot field is an accessor",
    mutate: (task) => replaceSnapshot(
      task,
      Object.defineProperty({ ...task.snapshot }, "points", {
        enumerable: true,
        get: () => directTemplate.points.default,
      }),
    ),
  },
  { name: "Task campaignId type", mutate: (task) => ({ ...task, campaignId: 1 }) },
  { name: "Task createdAt type", mutate: (task) => ({ ...task, createdAt: 1 }) },
  { name: "Task createdAt timestamp", mutate: (task) => ({ ...task, createdAt: "not-an-iso-timestamp" }) },
  { name: "Task updatedAt timestamp", mutate: (task) => ({ ...task, updatedAt: "2026-07-20T10:00:00Z" }) },
  {
    name: "Task timestamp order",
    mutate: (task) => ({ ...task, createdAt: "2026-07-20T10:00:01.000Z" }),
  },
  { name: "Task evidenceRule type", mutate: (task) => ({ ...task, evidenceRule: [] }) },
  { name: "Task points type", mutate: (task) => ({ ...task, points: "100" }) },
  { name: "Task points bound", mutate: (task) => ({ ...task, points: Number.MAX_SAFE_INTEGER }) },
  { name: "Task replayed type", mutate: (task) => ({ ...task, replayed: "false" }) },
  { name: "Task required type", mutate: (task) => ({ ...task, required: "false" }) },
  { name: "Task snapshot type", mutate: (task) => ({ ...task, snapshot: [] }) },
  { name: "Task taskId type", mutate: (task) => ({ ...task, taskId: 1 }) },
  { name: "Task taskId shape", mutate: (task) => ({ ...task, taskId: "unsafe/task" }) },
  { name: "Task checksum type", mutate: (task) => ({ ...task, templateChecksum: 1 }) },
  { name: "Task templateCode type", mutate: (task) => ({ ...task, templateCode: 1 }) },
  { name: "Task templateVersion type", mutate: (task) => ({ ...task, templateVersion: 1.5 }) },
  { name: "Task updatedAt type", mutate: (task) => ({ ...task, updatedAt: 1 }) },
  { name: "Task verificationType type", mutate: (task) => ({ ...task, verificationType: 1 }) },
  { name: "Task walletCompatibility type", mutate: (task) => ({ ...task, walletCompatibility: 1 }) },
  {
    name: "snapshot adoptionMode type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, adoptionMode: 1 }),
  },
  {
    name: "snapshot category type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, category: 1 }),
  },
  {
    name: "snapshot category canonical shape",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, category: "Invalid Category" }),
  },
  {
    name: "snapshot evidenceRule type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, evidenceRule: [] }),
  },
  {
    name: "snapshot points type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, points: "100" }),
  },
  {
    name: "snapshot required type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, required: "false" }),
  },
  {
    name: "snapshot checksum type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, templateChecksum: 1 }),
  },
  {
    name: "snapshot templateCode type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, templateCode: 1 }),
  },
  {
    name: "snapshot templateVersion type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, templateVersion: 1.5 }),
  },
  {
    name: "snapshot verificationType type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, verificationType: 1 }),
  },
  {
    name: "snapshot schema version type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, version: 1 }),
  },
  {
    name: "snapshot walletCompatibility type",
    mutate: (task) => replaceSnapshot(task, { ...task.snapshot, walletCompatibility: 1 }),
  },
  {
    name: "paired invalid evidenceRule type",
    mutate: (task) => {
      const evidenceRule: unknown[] = [];
      return replaceSnapshot(
        { ...task, evidenceRule },
        { ...task.snapshot, evidenceRule },
      );
    },
  },
  {
    name: "paired invalid points type",
    mutate: (task) => replaceSnapshot(
      { ...task, points: "100" },
      { ...task.snapshot, points: "100" },
    ),
  },
  {
    name: "paired invalid required type",
    mutate: (task) => replaceSnapshot(
      { ...task, required: "false" },
      { ...task.snapshot, required: "false" },
    ),
  },
  {
    name: "paired invalid verificationType value",
    mutate: (task) => replaceSnapshot(
      { ...task, verificationType: "UNKNOWN" },
      { ...task.snapshot, verificationType: "UNKNOWN" },
    ),
  },
  {
    name: "paired invalid walletCompatibility value",
    mutate: (task) => replaceSnapshot(
      { ...task, walletCompatibility: "UNKNOWN" },
      { ...task.snapshot, walletCompatibility: "UNKNOWN" },
    ),
  },
  {
    name: "Task/snapshot evidence mismatch",
    mutate: (task) => ({ ...task, evidenceRule: { source: "sensitive-result-material" } }),
  },
  {
    name: "canonical evidence nested value",
    mutate: (task) => ({ ...task, evidenceRule: { score: 0.5 } }),
  },
  {
    name: "canonical evidence cycle",
    mutate: (task) => {
      const evidenceRule: Record<string, unknown> = {};
      evidenceRule.self = evidenceRule;
      return { ...task, evidenceRule };
    },
  },
  {
    name: "canonical evidence string byte bound",
    mutate: (task) => ({
      ...task,
      evidenceRule: { proof: "x".repeat(4_097) },
    }),
  },
  {
    name: "canonical evidence total byte bound",
    mutate: (task) => ({
      ...task,
      evidenceRule: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `proof${index}`,
          "x".repeat(TASK_TEMPLATE_EVIDENCE_RULE_MAX_BYTES / 4),
        ]),
      ),
    }),
  },
  {
    name: "canonical evidence array bound",
    mutate: (task) => ({
      ...task,
      evidenceRule: { proofs: Array.from({ length: 65 }, () => true) },
    }),
  },
  {
    name: "canonical evidence object field bound",
    mutate: (task) => ({
      ...task,
      evidenceRule: Object.fromEntries(
        Array.from({ length: 33 }, (_, index) => [`field${index}`, true]),
      ),
    }),
  },
  {
    name: "canonical evidence key byte bound",
    mutate: (task) => ({
      ...task,
      evidenceRule: { ["k".repeat(97)]: true },
    }),
  },
  {
    name: "canonical evidence depth bound",
    mutate: (task) => {
      let evidenceRule: Record<string, unknown> = { accepted: true };
      for (let depth = 0; depth < 9; depth += 1) {
        evidenceRule = { nested: evidenceRule };
      }
      return { ...task, evidenceRule };
    },
  },
  {
    name: "canonical evidence accessor",
    mutate: (task) => ({
      ...task,
      evidenceRule: Object.defineProperty({}, "proof", {
        enumerable: true,
        get: () => "sensitive-result-material",
      }),
    }),
  },
];

const fakeStore = (overrides: Partial<TaskTemplateCatalogStore> = {}) => ({
  adopt: vi.fn(async () => adoptedTask()),
  close: vi.fn(async () => undefined),
  get: vi.fn(async () => directTemplate),
  list: vi.fn(async () => catalogPage()),
  ...overrides,
}) satisfies TaskTemplateCatalogStore;

const createService = (store: TaskTemplateCatalogStore) => createTaskTemplateCatalogService({
  now: () => new Date(NOW),
  store,
});

const listCommand = (authority: TaskTemplateCatalogOwnerReadAuthority | TaskTemplateCatalogAdminReadAuthority) => ({
  authority,
  query: {},
  traceId: "trace-catalog-service-list",
});

const adoptCommand = () => ({
  authority: ownerAdoptionAuthority(),
  campaignId: "campaign-catalog-service-1",
  idempotencyKey: "catalog-service-key-0001",
  overrides: {
    points: directTemplate.points.default + 1,
    required: directTemplate.requiredPolicy.default,
  },
  template: {
    templateCode: directTemplate.templateCode,
    version: directTemplate.version,
  },
  traceId: "trace-catalog-service-adopt",
});

describe("task template catalog service reads", () => {
  it("uses one store path for active Owner/Admin reads and preserves caller Trace ID", async () => {
    const store = fakeStore();
    const service = createService(store);

    await expect(service.list(listCommand(ownerReadAuthority()))).resolves.toEqual({
      page: catalogPage(),
      status: "ok",
      traceId: "trace-catalog-service-list",
    });
    await expect(service.list({
      ...listCommand(adminReadAuthority()),
      traceId: "trace-catalog-service-admin-list",
    })).resolves.toEqual({
      page: catalogPage(),
      status: "ok",
      traceId: "trace-catalog-service-admin-list",
    });

    expect(store.list).toHaveBeenNthCalledWith(1, {}, {
      historicalReadAllowed: false,
      traceId: "trace-catalog-service-list",
    });
    expect(store.list).toHaveBeenNthCalledWith(2, {}, {
      historicalReadAllowed: true,
      traceId: "trace-catalog-service-admin-list",
    });
  });

  it("allows historical list/detail only for an explicit issued Admin capability", async () => {
    const historical = Object.freeze({ ...directTemplate, status: "deprecated" as const });
    const store = fakeStore({
      get: vi.fn(async () => historical),
      list: vi.fn(async () => catalogPage([historical])),
    });
    const service = createService(store);

    await expect(service.list({
      authority: ownerReadAuthority(),
      query: { statuses: ["deprecated"] },
      traceId: "trace-owner-history",
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_NOT_FOUND",
      operation: "list",
      traceId: "trace-owner-history",
    });
    expect(store.list).not.toHaveBeenCalled();

    await expect(service.list({
      authority: adminReadAuthority(),
      query: { statuses: ["deprecated"] },
      traceId: "trace-admin-history",
    })).resolves.toMatchObject({ status: "ok", traceId: "trace-admin-history" });
    await expect(service.detail({
      authority: adminReadAuthority(),
      template: { templateCode: historical.templateCode, version: historical.version },
      traceId: "trace-admin-history-detail",
    })).resolves.toEqual({
      status: "ok",
      template: historical,
      traceId: "trace-admin-history-detail",
    });
    expect(store.get).toHaveBeenCalledWith(
      { templateCode: historical.templateCode, version: historical.version },
      { historicalReadAllowed: true, traceId: "trace-admin-history-detail" },
    );
  });

  it("maps missing exact detail to a non-leaking typed error", async () => {
    const store = fakeStore({ get: vi.fn(async () => null) });
    const service = createService(store);

    await expect(service.detail({
      authority: ownerReadAuthority(),
      template: { templateCode: directTemplate.templateCode, version: directTemplate.version },
      traceId: "trace-detail-missing",
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_NOT_FOUND",
      field: "resource",
      operation: "detail",
      retryable: false,
      traceId: "trace-detail-missing",
    });
  });

  it("fails closed when the detail port returns a different exact identity", async () => {
    const store = fakeStore({ get: vi.fn(async () => otherDirectTemplate) });
    const service = createService(store);

    await expect(service.detail({
      authority: ownerReadAuthority(),
      template: { templateCode: directTemplate.templateCode, version: directTemplate.version },
      traceId: "trace-detail-integrity",
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CORRUPT",
      field: "catalogResult",
      operation: "detail",
      traceId: "trace-detail-integrity",
    });
  });

  it.each([
    ["Participant", ownerReadAuthority(participantSession())],
    ["expired", ownerReadAuthority(issuedSession({
      absoluteExpiresAt: "2026-07-20T09:59:59.000Z",
      capabilities: ["campaign:read", "campaign:write", "task:build"],
      idleExpiresAt: "2026-07-20T09:59:59.000Z",
      roleIds: ["project_owner"],
    }))],
    ["forged spread", {
      kind: "owner",
      session: { ...ownerSession() },
    }],
    ["unknown", { kind: "unknown", session: ownerSession() }],
  ])("rejects %s read authority before calling the store", async (_label, authority) => {
    const store = fakeStore();
    const service = createService(store);

    await expect(service.list({
      authority,
      query: {},
      traceId: "trace-read-denied",
    } as never)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_NOT_FOUND",
      field: "resource",
      operation: "list",
      traceId: "trace-read-denied",
    });
    expect(store.list).not.toHaveBeenCalled();
  });

  it("preserves typed dependency errors and safely maps unknown failures", async () => {
    const timeout = new TaskTemplateCatalogError({
      code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      field: "database",
      operation: "list",
      traceId: "trace-list-timeout",
    });
    const typedStore = fakeStore({ list: vi.fn(async () => Promise.reject(timeout)) });
    const typedService = createService(typedStore);
    await expect(typedService.list({
      authority: ownerReadAuthority(),
      query: {},
      traceId: "trace-list-timeout",
    })).rejects.toBe(timeout);

    const unknownStore = fakeStore({
      list: vi.fn(async () => Promise.reject(new Error("sensitive-store-detail"))),
    });
    const unknownService = createService(unknownStore);
    const failure = await unknownService.list({
      authority: ownerReadAuthority(),
      query: {},
      traceId: "trace-list-unknown",
    }).catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      operation: "list",
      retryable: true,
      traceId: "trace-list-unknown",
    });
    expect(JSON.stringify(failure)).not.toContain("sensitive-store-detail");
    expect((failure as Error).stack).toBeUndefined();
  });
});

describe("task template catalog service adoption", () => {
  it("calls only the atomic adopt primitive once and returns a narrow safe result", async () => {
    const store = fakeStore();
    const service = createService(store);
    const command = adoptCommand();

    await expect(service.adopt(command)).resolves.toEqual({
      campaignId: command.campaignId,
      replayed: false,
      status: "adopted",
      taskId: "task-catalog-service-1",
      template: {
        checksum: directTemplate.checksum,
        templateCode: directTemplate.templateCode,
        version: directTemplate.version,
      },
      traceId: command.traceId,
    });

    expect(store.adopt).toHaveBeenCalledTimes(1);
    expect(store.get).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
    expect(store.adopt).toHaveBeenCalledWith({
      campaignId: command.campaignId,
      idempotencyKey: command.idempotencyKey,
      overrides: command.overrides,
      template: command.template,
    }, {
      ownerAddress: command.authority.session.subject.walletAddress,
      traceId: command.traceId,
    });

    const serialized = JSON.stringify(await service.adopt({
      ...command,
      idempotencyKey: "catalog-service-key-0002",
    }));
    expect(serialized).not.toContain(command.idempotencyKey);
    expect(serialized).not.toContain(command.authority.session.sessionId);
    expect(serialized).not.toContain(command.authority.session.subject.walletAddress);
    expect(serialized).not.toContain("evidenceRule");
  });

  it.each([
    ["Participant", { ...adoptCommand(), authority: ownerAdoptionAuthority(participantSession()) }],
    ["Admin", { ...adoptCommand(), authority: {
      campaignId: "campaign-catalog-service-1",
      kind: "admin",
      session: adminSession(),
    } }],
    ["cross-Campaign", { ...adoptCommand(), campaignId: "campaign-other" }],
    ["inactive", { ...adoptCommand(), authority: ownerAdoptionAuthority(issuedSession({
      capabilities: ["campaign:read", "campaign:write", "task:build"],
      idleExpiresAt: "2026-07-20T09:59:59.000Z",
      roleIds: ["project_owner"],
    })) }],
    ["forged", { ...adoptCommand(), authority: {
      campaignId: "campaign-catalog-service-1",
      kind: "owner",
      session: { ...ownerSession() },
    } }],
  ])("rejects %s adoption authority before the atomic store call", async (_label, command) => {
    const store = fakeStore();
    const service = createService(store);

    await expect(service.adopt(command as never)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_NOT_FOUND",
      field: "resource",
      operation: "adopt",
      traceId: "trace-catalog-service-adopt",
    });
    expect(store.adopt).not.toHaveBeenCalled();
  });

  it.each([
    ["short", "short"],
    ["long", "x".repeat(129)],
    ["space", "unsafe key"],
    ["slash", "unsafe/key"],
    ["unicode", "unsafe-key-私密"],
  ])("rejects %s idempotency keys before the store call", async (_label, idempotencyKey) => {
    const store = fakeStore();
    const service = createService(store);
    const command = { ...adoptCommand(), idempotencyKey };

    const failure = await service.adopt(command).catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "TASK_TEMPLATE_ARGUMENT_INVALID",
      field: "idempotencyKey",
      operation: "adopt",
      traceId: command.traceId,
    });
    expect(JSON.stringify(failure)).not.toContain(idempotencyKey);
    expect(store.adopt).not.toHaveBeenCalled();
  });

  it.each([
    ["campaign", { campaignId: "campaign-other" }],
    ["template code", { templateCode: "other-template" }],
    ["template version", { templateVersion: directTemplate.version + 1 }],
    ["checksum", { templateChecksum: "b".repeat(64) }],
    ["snapshot code", { snapshot: { ...adoptedTask().snapshot, templateCode: "other-template" } }],
    ["snapshot version", { snapshot: { ...adoptedTask().snapshot, templateVersion: directTemplate.version + 1 } }],
    ["snapshot checksum", { snapshot: { ...adoptedTask().snapshot, templateChecksum: "b".repeat(64) } }],
    ["snapshot schema", { snapshot: { ...adoptedTask().snapshot, version: "task-template-snapshot-v2" } }],
    ["result shape", { unexpectedPrivateMaterial: "must-not-pass" }],
  ])("fails closed on returned %s integrity mismatch", async (_label, resultOverrides) => {
    const store = fakeStore({
      adopt: vi.fn(async () => adoptedTask(resultOverrides as Partial<TaskTemplateAdoptedTask>)),
    });
    const service = createService(store);

    await expect(service.adopt(adoptCommand())).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CORRUPT",
      field: "adoptionResult",
      operation: "adopt",
      traceId: "trace-catalog-service-adopt",
    });
    expect(store.adopt).toHaveBeenCalledTimes(1);
  });

  it.each(malformedAdoptionResults)(
    "rejects malformed adoption result: $name",
    async ({ mutate }) => {
      const command = adoptCommand();
      const store = fakeStore({
        adopt: vi.fn(async () => mutate(mutableAdoptionResult()) as TaskTemplateAdoptedTask),
      });
      const service = createService(store);

      const failure = await service.adopt(command).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(TaskTemplateCatalogError);
      expect(failure).toMatchObject({
        code: "TASK_TEMPLATE_CORRUPT",
        field: "adoptionResult",
        operation: "adopt",
        retryable: false,
        traceId: command.traceId,
      });
      expect((failure as Error).stack).toBeUndefined();
      const serialized = JSON.stringify(failure);
      expect(serialized).not.toContain(command.idempotencyKey);
      expect(serialized).not.toContain(command.authority.session.sessionId);
      expect(serialized).not.toContain(command.authority.session.subject.walletAddress);
      expect(serialized).not.toContain("sensitive-result-material");
      expect(store.adopt).toHaveBeenCalledTimes(1);
    },
  );

  it.each(reflectionTrapCases)(
    "normalizes malformed result reflection failures: $name",
    async ({ errorKind, trap }) => {
      const command = adoptCommand();
      const sourceError = errorKind === "forged"
        ? Object.assign(new TaskTemplateCatalogError({
          code: "TASK_TEMPLATE_CORRUPT",
          field: "adoptionResult",
          operation: "list",
          traceId: PRIVATE_REFLECTION_MARKER,
        }), { privateMetadata: PRIVATE_REFLECTION_MARKER })
        : Object.assign(new Error(PRIVATE_REFLECTION_MARKER), {
          privateMetadata: PRIVATE_REFLECTION_MARKER,
        });
      const store = fakeStore({
        adopt: vi.fn(async () => resultWithThrowingReflectionTrap(trap, sourceError)),
      });
      const service = createService(store);

      const failure = await service.adopt(command).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(TaskTemplateCatalogError);
      expect(failure).not.toBe(sourceError);
      expect(failure).toMatchObject({
        code: "TASK_TEMPLATE_CORRUPT",
        field: "adoptionResult",
        message: "Task template catalog data is invalid.",
        operation: "adopt",
        retryable: false,
        traceId: command.traceId,
      });
      expect((failure as Error).stack).toBeUndefined();
      expect(failure).not.toHaveProperty("privateMetadata");
      expect(String(failure)).not.toContain(PRIVATE_REFLECTION_MARKER);
      expect(JSON.stringify(failure)).not.toContain(PRIVATE_REFLECTION_MARKER);
      expect(store.adopt).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects forbidden client canonical/role fields through strict DTOs", async () => {
    const store = fakeStore();
    const service = createService(store);
    const forbidden = [
      { ...adoptCommand(), checksum: directTemplate.checksum },
      { ...adoptCommand(), evidenceRule: directTemplate.evidenceRule },
      { ...adoptCommand(), ownerAddress: "ELF_forged_owner" },
      { ...adoptCommand(), role: "Admin" },
      { ...adoptCommand(), template: { ...adoptCommand().template, checksum: directTemplate.checksum } },
      { ...adoptCommand(), overrides: { ...adoptCommand().overrides, verificationType: "WALLET" } },
    ];

    for (const command of forbidden) {
      await expect(service.adopt(command as never)).rejects.toMatchObject({
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        operation: "adopt",
        traceId: "trace-catalog-service-adopt",
      });
    }
    expect(store.adopt).not.toHaveBeenCalled();
  });

  it("rejects an explicit override object without a concrete allowlisted value", async () => {
    const store = fakeStore();
    const service = createService(store);

    await expect(service.adopt({
      ...adoptCommand(),
      overrides: { points: undefined },
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ARGUMENT_INVALID",
      field: "overrides",
      operation: "adopt",
      traceId: "trace-catalog-service-adopt",
    });
    expect(store.adopt).not.toHaveBeenCalled();
  });
});

describe("task template catalog service lifecycle", () => {
  it("passes close through the port and preserves typed close/closed outcomes", async () => {
    const closed = new TaskTemplateCatalogError({
      code: "TASK_TEMPLATE_CLOSED",
      field: "store",
      operation: "list",
      traceId: "trace-after-close",
    });
    const store = fakeStore({
      list: vi.fn(async () => Promise.reject(closed)),
    });
    const service = createService(store);

    await expect(service.close({ traceId: "trace-service-close" })).resolves.toBeUndefined();
    expect(store.close).toHaveBeenCalledWith({ traceId: "trace-service-close" });
    await expect(service.list({
      authority: ownerReadAuthority(),
      query: {},
      traceId: "trace-after-close",
    })).rejects.toBe(closed);
  });
});
