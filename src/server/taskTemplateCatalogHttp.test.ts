import { describe, expect, it, vi } from "vitest";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";
import {
  TaskTemplateCatalogError,
  type TaskTemplateCatalogErrorCode,
} from "./taskTemplateCatalogStore";
import type {
  TaskTemplateCatalogAdoptResult,
  TaskTemplateCatalogResolvedPage,
  TaskTemplateCatalogResolvedTemplate,
  TaskTemplateCatalogService,
} from "./taskTemplateCatalogService";
import {
  createTaskTemplateCatalogHttpHandler,
  type TaskTemplateCatalogHttpRequest,
} from "./taskTemplateCatalogHttp";
import {
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
} from "./walletAuthentication";

const directTemplate = taskTemplateCatalogManifestV1.find(
  (template) => template.adoptionMode === "direct",
);

if (!directTemplate) {
  throw new Error("The task template catalog test fixture requires a direct template.");
}

const directEnglishContent = Object.freeze({
  description: "Complete the resolved catalog task.",
  title: "Resolved catalog task",
});

const resolvedTemplate = (
  requestedLocale: string | null,
): TaskTemplateCatalogResolvedTemplate => Object.freeze({
  adoptionMode: directTemplate.adoptionMode,
  catalogSchemaVersion: directTemplate.catalogSchemaVersion,
  category: directTemplate.category,
  checksum: directTemplate.checksum,
  content: Object.freeze({ ...directEnglishContent }),
  evidenceRule: directTemplate.evidenceRule,
  locale: Object.freeze({
    requestedLocale,
    resolvedLocale: "en-US",
    status: "exact" as const,
  }),
  points: directTemplate.points,
  requiredPolicy: directTemplate.requiredPolicy,
  riskLevel: directTemplate.riskLevel,
  status: directTemplate.status,
  templateCode: directTemplate.templateCode,
  verificationType: directTemplate.verificationType,
  version: directTemplate.version,
  walletCompatibility: directTemplate.walletCompatibility,
});

const listTemplate = resolvedTemplate("en-US");
const detailTemplate = resolvedTemplate(null);

const issueAuthority = ({
  capabilities = ["campaign:read", "campaign:write", "task:build"],
  roleIds = ["project_owner"],
}: {
  capabilities?: readonly string[];
  roleIds?: readonly string[];
} = {}) => issueResolvedWalletSessionAuthority({
  absoluteExpiresAt: "2099-07-20T04:00:00.000Z",
  capabilities,
  credentialBoundary: "wallet-auth-cookie/v1",
  idleExpiresAt: "2099-07-20T03:00:00.000Z",
  membershipRevision: "catalog-http-membership-v1",
  roleIds,
  sessionId: "catalog-http-session-v1",
  subject: issueVerifiedWalletSubject({
    accountType: "EOA",
    adapterId: "aelf-eoa-v1",
    chainId: "AELF",
    network: "mainnet",
    proofDigest: "a".repeat(64),
    proofMethod: "AELF_EOA_RECOVERABLE",
    signerAddress: "ELF_catalog_http_owner",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    walletAddress: "ELF_catalog_http_owner",
    walletSource: "PORTKEY_EOA_EXTENSION",
  }),
  version: 1,
});

const page: TaskTemplateCatalogResolvedPage = Object.freeze({
  catalogSchemaVersion: "task-template-catalog-v1",
  items: Object.freeze([listTemplate]),
  page: Object.freeze({ limit: 24, nextCursor: null }),
  snapshotAt: "2026-07-20T00:00:00.000Z",
  totalActive: 12,
});

const adopted = (replayed = false): TaskTemplateCatalogAdoptResult => Object.freeze({
  campaignId: "campaign-catalog-http-1",
  replayed,
  status: "adopted",
  taskId: "task-catalog-http-1",
  template: Object.freeze({
    checksum: directTemplate.checksum,
    templateCode: directTemplate.templateCode,
    version: directTemplate.version,
  }),
  traceId: "trace-catalog-http-adopt",
});

const createService = (): TaskTemplateCatalogService => ({
  adopt: vi.fn(async () => adopted()),
  close: vi.fn(async () => undefined),
  detail: vi.fn(async (command) => ({
    status: "ok" as const,
    template: detailTemplate,
    traceId: command.traceId,
  })),
  list: vi.fn(async (command) => ({
    page,
    status: "ok" as const,
    traceId: command.traceId,
  })),
});

const baseRequest = (
  overrides: Partial<TaskTemplateCatalogHttpRequest>,
): TaskTemplateCatalogHttpRequest => ({
  authority: issueAuthority(),
  body: undefined,
  headers: {},
  params: {},
  requestTarget: "/api/task-templates",
  routeId: "task-templates.list",
  traceId: "trace-catalog-http-list",
  ...overrides,
});

describe("task template catalog HTTP adapter", () => {
  it("parses a bounded list query and returns the exact OpenAPI success envelope", async () => {
    const service = createService();
    const handler = createTaskTemplateCatalogHttpHandler({ service });
    const response = await handler.handle(baseRequest({
      requestTarget: "/api/task-templates?category=community,social&verification=SOCIAL&wallet=ANY&locale=en-US&status=active&limit=24",
    }));

    expect(response).toEqual({
      body: { data: page, ok: true, traceId: "trace-catalog-http-list" },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-trace-id": "trace-catalog-http-list",
      },
      status: 200,
    });
    expect(Object.keys(response.body).sort()).toEqual(["data", "ok", "traceId"]);
    expect(Object.keys(page).sort()).toEqual([
      "catalogSchemaVersion",
      "items",
      "page",
      "snapshotAt",
      "totalActive",
    ]);
    expect(Object.keys(page.items[0] ?? {}).sort()).toEqual([
      "adoptionMode",
      "catalogSchemaVersion",
      "category",
      "checksum",
      "content",
      "evidenceRule",
      "locale",
      "points",
      "requiredPolicy",
      "riskLevel",
      "status",
      "templateCode",
      "verificationType",
      "version",
      "walletCompatibility",
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /localizedContent|localeReadiness|supportedLocales/,
    );
    expect(service.list).toHaveBeenCalledWith({
      authority: { kind: "owner", session: expect.any(Object) },
      query: {
        categories: ["community", "social"],
        limit: 24,
        locale: "en-US",
        statuses: ["active"],
        verificationTypes: ["SOCIAL"],
        walletCompatibility: ["ANY"],
      },
      traceId: "trace-catalog-http-list",
    });
  });

  it.each([
    "/api/task-templates?limit=1&limit=2",
    "/api/task-templates?unknown=value",
    "/api/task-templates?limit=1.5",
    "/api/task-templates?limit=%32%34&limit=24",
    "/api/task-templates?verification=WALLET,UNKNOWN",
    "/api/task-templates?category=community,community",
  ])("rejects ambiguous or invalid list query %s before the service", async (requestTarget) => {
    const service = createService();
    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
      requestTarget,
    }));

    expect(response).toMatchObject({
      body: {
        error: {
          code: "TASK_TEMPLATE_ARGUMENT_INVALID",
          operation: "list",
          retryable: false,
        },
        ok: false,
        traceId: "trace-catalog-http-list",
      },
      status: 400,
    });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("reads one exact integer version without coercion", async () => {
    const service = createService();
    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
      params: { templateCode: directTemplate.templateCode, version: String(directTemplate.version) },
      requestTarget: `/api/task-templates/${directTemplate.templateCode}/versions/${directTemplate.version}`,
      routeId: "task-templates.detail",
      traceId: "trace-catalog-http-detail",
    }));

    expect(response).toMatchObject({
      body: { data: detailTemplate, ok: true, traceId: "trace-catalog-http-detail" },
      status: 200,
    });
    expect(response.body).toEqual({
      data: detailTemplate,
      ok: true,
      traceId: "trace-catalog-http-detail",
    });
    expect(detailTemplate.locale).toEqual({
      requestedLocale: null,
      resolvedLocale: "en-US",
      status: "exact",
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /localizedContent|localeReadiness|supportedLocales/,
    );
    expect(service.detail).toHaveBeenCalledWith({
      authority: { kind: "owner", session: expect.any(Object) },
      template: {
        templateCode: directTemplate.templateCode,
        version: directTemplate.version,
      },
      traceId: "trace-catalog-http-detail",
    });
  });

  it.each(["1.0", "01", "0", "NaN", "2147483648"])(
    "rejects non-canonical detail version %s before the service",
    async (version) => {
      const service = createService();
      const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
        params: { templateCode: directTemplate.templateCode, version },
        requestTarget: `/api/task-templates/${directTemplate.templateCode}/versions/${version}`,
        routeId: "task-templates.detail",
        traceId: "trace-catalog-http-detail",
      }));

      expect(response).toMatchObject({ status: 400, body: { ok: false } });
      expect(service.detail).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: "wrong content type", headers: { "content-type": "text/plain" }, body: "{}" },
    { label: "missing idempotency", headers: { "content-type": "application/json", "x-csrf-token": "c".repeat(16) }, body: "{}" },
    { label: "duplicate JSON key", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":1},\"template\":{\"templateCode\":\"y\",\"version\":1}}" },
    { label: "forged campaign", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":1},\"campaignId\":\"forged\"}" },
    { label: "forged canonical field", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":1},\"verificationType\":\"MANUAL\"}" },
    { label: "nested template extension", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":1,\"checksum\":\"forged\"}}" },
    { label: "coerced version", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":\"1\"}}" },
    { label: "empty overrides", headers: { "content-type": "application/json", "idempotency-key": "catalog-key-0001", "x-csrf-token": "c".repeat(16) }, body: "{\"template\":{\"templateCode\":\"x\",\"version\":1},\"overrides\":{}}" },
  ])("rejects $label before adoption", async ({ body, headers }) => {
    const service = createService();
    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
      body,
      headers,
      params: { campaignId: "campaign-catalog-http-1" },
      requestTarget: "/api/campaigns/campaign-catalog-http-1/tasks/from-template",
      routeId: "campaigns.tasks.from-template",
      traceId: "trace-catalog-http-adopt",
    }));

    expect(response).toMatchObject({
      body: {
        error: {
          code: "TASK_TEMPLATE_ARGUMENT_INVALID",
          operation: "adopt",
        },
        ok: false,
      },
      status: 400,
    });
    expect(service.adopt).not.toHaveBeenCalled();
  });

  it("enforces the route body bound before JSON parsing", async () => {
    const service = createService();
    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
      body: `{\"template\":{\"templateCode\":\"${"x".repeat(8_192)}\",\"version\":1}}`,
      headers: {
        "content-type": "application/json",
        "idempotency-key": "catalog-key-0001",
        "x-csrf-token": "c".repeat(16),
      },
      params: { campaignId: "campaign-catalog-http-1" },
      requestTarget: "/api/campaigns/campaign-catalog-http-1/tasks/from-template",
      routeId: "campaigns.tasks.from-template",
      traceId: "trace-catalog-http-adopt",
    }));

    expect(response).toMatchObject({ status: 400, body: { ok: false } });
    expect(service.adopt).not.toHaveBeenCalled();
  });

  it.each([
    { replayed: false, status: 201 },
    { replayed: true, status: 200 },
  ])("returns $status for replayed=$replayed", async ({ replayed, status }) => {
    const service = createService();
    vi.mocked(service.adopt).mockResolvedValue(adopted(replayed));
    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({
      body: JSON.stringify({
        overrides: { points: 50, required: true },
        template: {
          templateCode: directTemplate.templateCode,
          version: directTemplate.version,
        },
      }),
      headers: {
        "content-type": "application/json; charset=utf-8",
        "idempotency-key": "catalog-key-0001",
        "x-csrf-token": "c".repeat(16),
      },
      params: { campaignId: "campaign-catalog-http-1" },
      requestTarget: "/api/campaigns/campaign-catalog-http-1/tasks/from-template",
      routeId: "campaigns.tasks.from-template",
      traceId: "trace-catalog-http-adopt",
    }));

    expect(response).toEqual({
      body: {
        data: {
          campaignId: "campaign-catalog-http-1",
          replayed,
          taskId: "task-catalog-http-1",
          templateChecksum: directTemplate.checksum,
          templateCode: directTemplate.templateCode,
          templateVersion: directTemplate.version,
        },
        ok: true,
        traceId: "trace-catalog-http-adopt",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-trace-id": "trace-catalog-http-adopt",
      },
      status,
    });
  });

  it.each([
    ["TASK_TEMPLATE_ARGUMENT_INVALID", 400],
    ["TASK_TEMPLATE_CURSOR_INVALID", 400],
    ["TASK_TEMPLATE_NOT_FOUND", 404],
    ["TASK_TEMPLATE_ADOPTION_CONFLICT", 409],
    ["TASK_TEMPLATE_STALE", 422],
    ["TASK_TEMPLATE_ADOPTION_DEFERRED", 422],
    ["TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED", 422],
    ["TASK_TEMPLATE_POLICY_MISMATCH", 422],
    ["TASK_TEMPLATE_CORRUPT", 503],
    ["TASK_TEMPLATE_SCHEMA_NOT_READY", 503],
    ["TASK_TEMPLATE_CATALOG_UNAVAILABLE", 503],
    ["TASK_TEMPLATE_CLOSED", 503],
    ["TASK_TEMPLATE_CLEANUP_FAILED", 503],
  ] as const)("maps %s to HTTP %i with a safe exact error", async (code, status) => {
    const service = createService();
    vi.mocked(service.list).mockRejectedValue(new TaskTemplateCatalogError({
      code: code as TaskTemplateCatalogErrorCode,
      field: "catalog",
      operation: "list",
      traceId: "trace-catalog-http-list",
    }));

    const response = await createTaskTemplateCatalogHttpHandler({ service }).handle(baseRequest({}));

    expect(response).toEqual({
      body: {
        error: {
          code,
          field: "catalog",
          operation: "list",
          retryable: [
            "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
            "TASK_TEMPLATE_CLEANUP_FAILED",
            "TASK_TEMPLATE_SCHEMA_NOT_READY",
          ].includes(code),
        },
        ok: false,
        traceId: "trace-catalog-http-list",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-trace-id": "trace-catalog-http-list",
      },
      status,
    });
    expect(JSON.stringify(response)).not.toMatch(/stack|sql|cookie|csrf|session|wallet|private/i);
  });
});
