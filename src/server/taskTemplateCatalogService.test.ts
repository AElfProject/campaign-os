// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { TaskTemplateCatalogVersion } from "../domain/taskTemplateCatalog";
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
