import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import type { TaskVerificationBinding } from "./taskVerificationConfig";
import {
  createProviderHttpCanonicalRequestMaterial,
  createProviderHttpExecutionMaterialResolver,
  disposeProviderHttpCanonicalRequestMaterial,
  disposeProviderHttpExecutionMaterial,
  isProviderHttpExecutionMaterial,
  useProviderHttpExecutionMaterial,
  type ProviderHttpMaterialLookup,
} from "./providerHttpExecutionMaterial";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";

const ENDPOINT_KEY = "CAMPAIGN_OS_FAKE_PROVIDER_ENDPOINT";
const HEADER_KEY = "CAMPAIGN_OS_FAKE_PROVIDER_HEADERS";
const BODY_KEY = "CAMPAIGN_OS_FAKE_PROVIDER_BODY";
const CREDENTIAL_KEY = "CAMPAIGN_OS_FAKE_PROVIDER_CREDENTIAL";
const FAKE_CREDENTIAL = "fake-credential-sentinel";

const binding = (
  overrides: Partial<TaskVerificationBinding> = {},
): TaskVerificationBinding => Object.freeze({
  bodyEnvKey: BODY_KEY,
  credentialEnvKey: CREDENTIAL_KEY,
  degradationPolicy: "manual_review",
  enabled: true,
  endpointEnvKey: ENDPOINT_KEY,
  endpointId: "dapp-api-verification-status",
  evidenceSource: "DAPP_API",
  headerEnvKey: HEADER_KEY,
  id: "fake-dapp-binding",
  maxAttempts: 3,
  maxResponseBytes: 256 * 1024,
  providerFamily: "ebridge",
  providerGroupId: "dapp-api-adapters",
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  revision: 1,
  timeoutMs: 2_500,
  verificationType: "DAPP_API",
  ...overrides,
});

const plan = (
  overrides: Partial<ProviderHttpRequestPlan> = {},
): ProviderHttpRequestPlan => ({
  attempt: { count: 1, maxAttempts: 3 },
  bodyRef: "config-ref:campaign_os_fake_provider_body",
  campaignId: "campaign-fake-1",
  endpointId: "dapp-api-verification-status",
  headerRefs: ["header-ref:provider-http-dapp-auth"],
  idempotencyRef: "idem-ref:fake-1",
  leaseRef: "lease-ref:fake-1",
  matcherContextDigest: "b".repeat(64),
  maxResponseBytes: 256 * 1024,
  method: "POST",
  operatorContextRefs: {},
  providerGroupId: "dapp-api-adapters",
  requestDigest: "c".repeat(64),
  requestMappingId: "provider-http-request-map:dapp-api-status-v1",
  responseMappingId: "provider-http-response-map:dapp-api-status-v1",
  retryPolicyRef: "retry-policy:provider-http-dapp-backoff",
  taskId: "task-fake-1",
  timeoutMs: 2_500,
  timeoutPolicyRef: "timeout-policy:provider-http-dapp-2500ms",
  traceId: "trace-material",
  urlRef: "provider.endpoint.dapp_api.verification_status.url",
  verificationType: "DAPP_API",
  ...overrides,
});

const lookupFrom = (
  values: Readonly<Record<string, string | undefined>>,
): ProviderHttpMaterialLookup => ({
  get: (key) => values[key],
});

const localValues = (endpoint: string) => ({
  [BODY_KEY]: "{\"requestRef\":\"fake-request-sentinel\"}",
  [CREDENTIAL_KEY]: FAKE_CREDENTIAL,
  [ENDPOINT_KEY]: endpoint,
  [HEADER_KEY]: "{\"x-provider\":\"fake-provider-sentinel\"}",
});

const resolveWithCanonicalTestMaterial = (
  resolver: ReturnType<typeof createProviderHttpExecutionMaterialResolver>,
  request: ProviderHttpRequestPlan,
  providerBinding: TaskVerificationBinding = binding(),
) => {
  const canonical = createProviderHttpCanonicalRequestMaterial({
    bindingId: providerBinding.id,
    bindingRevision: providerBinding.revision,
    endpointId: request.endpointId,
    mapping: {
      fields: [{
        name: "x-request-id",
        required: true,
        source: "task.taskId",
        target: "header",
      }],
      method: request.method === "GET" ? "GET" : "POST",
    },
    requestMappingId: request.requestMappingId,
    strategyId: request.strategyId ?? "dapp-api-status-v1",
    values: { "task.taskId": request.taskId },
  });
  return resolver({
    ...request,
    requestMaterialRef: canonical.requestMaterialRef,
    strategyId: request.strategyId ?? "dapp-api-status-v1",
  }, canonical.material);
};

describe("provider HTTP execution material", () => {
  it("resolves loopback material through an explicit lookup without observable values", async () => {
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding(),
      environment: "local",
      lookup: lookupFrom(localValues("http://127.0.0.1:4179/verify?mode=fake")),
    });
    const result = await resolveWithCanonicalTestMaterial(resolver, plan());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(isProviderHttpExecutionMaterial(result.material)).toBe(true);
    expect(Object.keys(result.material)).toEqual([]);
    expect(JSON.stringify(result.material)).toBe("{}");
    expect(inspect(result.material)).not.toContain(FAKE_CREDENTIAL);
    expect(String(result.material)).not.toContain(FAKE_CREDENTIAL);
    expect(inspect(result)).not.toContain(FAKE_CREDENTIAL);
    expect(JSON.stringify(result)).not.toContain(FAKE_CREDENTIAL);

    const snapshot = await useProviderHttpExecutionMaterial(result.material, (material) => ({
      body: material.body,
      headers: { ...material.headers },
      method: material.method,
      url: material.url.toString(),
    }));

    expect(snapshot).toMatchObject({
      body: "{\"requestRef\":\"fake-request-sentinel\"}",
      headers: {
        authorization: `Bearer ${FAKE_CREDENTIAL}`,
        "content-type": "application/json",
        "x-provider": "fake-provider-sentinel",
        "x-trace-id": "trace-material",
      },
      method: "POST",
      url: "http://127.0.0.1:4179/verify?mode=fake",
    });

    await expect(
      useProviderHttpExecutionMaterial(result.material, () => undefined),
    ).rejects.toMatchObject({ code: "PROVIDER_HTTP_MATERIAL_DISPOSED" });
    disposeProviderHttpExecutionMaterial(result.material);
  });

  it("allows only one concurrent execution-material consumer", async () => {
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding(),
      environment: "local",
      lookup: lookupFrom(localValues("http://127.0.0.1:4179/verify")),
    });
    const result = await resolveWithCanonicalTestMaterial(resolver, plan());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: (() => void) | undefined;
    const enteredGate = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const first = useProviderHttpExecutionMaterial(result.material, async ({ method }) => {
      entered?.();
      await gate;
      return method;
    });
    await enteredGate;

    await expect(
      useProviderHttpExecutionMaterial(result.material, () => undefined),
    ).rejects.toMatchObject({ code: "PROVIDER_HTTP_MATERIAL_DISPOSED" });
    release?.();
    await expect(first).resolves.toBe("POST");
  });

  it("materializes canonical refs into provider path, query, body, and headers only at use time", async () => {
    const wallet = "ELF_FAKE_DYNAMIC_WALLET";
    const chainId = "chain-ref:dynamic-a";
    const canonical = createProviderHttpCanonicalRequestMaterial({
      bindingId: binding().id,
      bindingRevision: binding().revision,
      endpointId: "dapp-api-verification-status",
      mapping: {
        fields: [
          {
            name: "participantWallet",
            required: true,
            source: "participant.walletAddress",
            target: "path",
          },
          {
            name: "taskId",
            required: true,
            source: "task.taskId",
            target: "path",
          },
          {
            name: "chainId",
            required: true,
            source: "rule.chainId",
            target: "query",
          },
          {
            name: "contractAddress",
            source: "rule.contractAddress",
            target: "body",
          },
          {
            name: "x-task-revision",
            required: true,
            source: "task.revision",
            target: "header",
          },
        ],
        method: "POST",
        pathTemplate: "/participants/{participantWallet}/tasks/{taskId}",
      },
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      strategyId: "dapp-api-status-v1",
      values: {
        "participant.walletAddress": wallet,
        "rule.chainId": chainId,
        "rule.contractAddress": "ELF_FAKE_CONTRACT",
        "task.revision": 2,
        "task.taskId": "task-fake-1",
      },
    });
    const endpoint = "http://127.0.0.1:4179/provider-base?mode=fake";
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding(),
      environment: "local",
      lookup: lookupFrom({
        ...localValues(endpoint),
        [BODY_KEY]: "{\"staticMode\":\"fake\"}",
      }),
    });
    const dynamicPlan = plan({
      requestMaterialRef: canonical.requestMaterialRef,
      strategyId: "dapp-api-status-v1",
    });

    expect(Object.keys(canonical.material)).toEqual([]);
    expect(JSON.stringify(canonical)).not.toContain(wallet);
    expect(inspect(canonical)).not.toContain(chainId);

    const result = await resolver(dynamicPlan, canonical.material);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(wallet);
    expect(inspect(result)).not.toContain(chainId);
    if (!result.ok) {
      return;
    }

    const wire = await useProviderHttpExecutionMaterial(result.material, (material) => ({
      body: material.body,
      headers: { ...material.headers },
      url: material.url.toString(),
    }));
    expect(wire.url).toBe(
      "http://127.0.0.1:4179/provider-base/participants/ELF_FAKE_DYNAMIC_WALLET/tasks/task-fake-1?mode=fake&chainId=chain-ref%3Adynamic-a",
    );
    expect(JSON.parse(wire.body ?? "{}")).toEqual({
      contractAddress: "ELF_FAKE_CONTRACT",
      staticMode: "fake",
    });
    expect(wire.headers).toMatchObject({
      "x-task-revision": "2",
    });
    disposeProviderHttpExecutionMaterial(result.material);
    disposeProviderHttpCanonicalRequestMaterial(canonical.material);
  });

  it("rejects strategy-tagged static-only material before config lookup", async () => {
    let lookupCalls = 0;
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding(),
      environment: "local",
      lookup: {
        get() {
          lookupCalls += 1;
          return "must-not-read";
        },
      },
    });
    const result = await resolver(plan({
      requestMaterialRef: `request-ref:${"d".repeat(64)}`,
      strategyId: "dapp-api-status-v1",
    }));

    expect(result).toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_DYNAMIC_REQUEST_REQUIRED" },
      ok: false,
    });
    expect(lookupCalls).toBe(0);
  });

  it("binds one-shot canonical material to the exact binding id and revision", async () => {
    const originalBinding = binding();
    const canonical = createProviderHttpCanonicalRequestMaterial({
      bindingId: originalBinding.id,
      bindingRevision: originalBinding.revision,
      endpointId: originalBinding.endpointId,
      mapping: {
        fields: [{
          name: "x-request-id",
          required: true,
          source: "task.taskId",
          target: "header",
        }],
        method: "POST",
      },
      requestMappingId: originalBinding.requestMappingId,
      strategyId: "dapp-api-status-v1",
      values: { "task.taskId": "task-fake-1" },
    });
    let lookupCalls = 0;
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding({ id: "fake-dapp-binding-v2", revision: 2 }),
      environment: "local",
      lookup: {
        get() {
          lookupCalls += 1;
          return "must-not-read";
        },
      },
    });
    const request = plan({
      requestMaterialRef: canonical.requestMaterialRef,
      strategyId: "dapp-api-status-v1",
    });

    await expect(resolver(request, canonical.material)).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_DYNAMIC_REQUEST_MISMATCH" },
      ok: false,
    });
    await expect(resolver(request, canonical.material)).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_DYNAMIC_REQUEST_REUSED" },
      ok: false,
    });
    expect(lookupCalls).toBe(0);
  });

  it("rejects dot path segments and non-allowlisted dynamic headers", async () => {
    const providerBinding = binding({
      bodyEnvKey: undefined,
      credentialEnvKey: undefined,
      headerEnvKey: undefined,
    });
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: providerBinding,
      environment: "local",
      lookup: lookupFrom({ [ENDPOINT_KEY]: "http://127.0.0.1:4179/base" }),
    });
    const resolve = (target: "header" | "path", name: string, value: string) => {
      const canonical = createProviderHttpCanonicalRequestMaterial({
        bindingId: providerBinding.id,
        bindingRevision: providerBinding.revision,
        endpointId: providerBinding.endpointId,
        mapping: {
          fields: [{ name, required: true, source: "rule.action", target }],
          method: "POST",
          ...(target === "path" ? { pathTemplate: `/{${name}}` } : {}),
        },
        requestMappingId: providerBinding.requestMappingId,
        strategyId: "dapp-api-status-v1",
        values: { "rule.action": value },
      });
      return resolver(plan({
        bodyRef: undefined,
        requestMaterialRef: canonical.requestMaterialRef,
        strategyId: "dapp-api-status-v1",
      }), canonical.material);
    };

    await expect(resolve("path", "action", "..")).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_DYNAMIC_REQUEST_INVALID" },
      ok: false,
    });
    await expect(resolve("header", "x-unapproved-dynamic", "fake-value")).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_HEADER_UNSAFE" },
      ok: false,
    });
  });

  it.each([
    ["local", "https://provider.invalid/verify", "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"],
    ["stage", "http://192.0.2.10/verify", "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"],
    ["production", "http://provider.invalid/verify", "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"],
    ["production", "https://user@provider.invalid/verify", "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"],
    ["production", "https://provider.invalid/verify#fragment", "PROVIDER_HTTP_ENDPOINT_POLICY_INVALID"],
  ] as const)("fails closed for %s endpoint posture", async (environment, endpoint, code) => {
    const resolver = createProviderHttpExecutionMaterialResolver({
      approvedProductionHosts: ["provider.invalid"],
      binding: binding(),
      environment,
      lookup: lookupFrom(localValues(endpoint)),
    });
    const result = await resolveWithCanonicalTestMaterial(resolver, plan());

    expect(result).toMatchObject({ diagnostic: { code }, ok: false });
    expect(JSON.stringify(result)).not.toContain(endpoint);
  });

  it("accepts only explicitly approved fake production hosts over HTTPS", async () => {
    const allowed = createProviderHttpExecutionMaterialResolver({
      approvedProductionHosts: ["provider.invalid"],
      binding: binding({ bodyEnvKey: undefined, headerEnvKey: undefined }),
      environment: "production",
      lookup: lookupFrom({
        [CREDENTIAL_KEY]: FAKE_CREDENTIAL,
        [ENDPOINT_KEY]: "https://provider.invalid/verify",
      }),
    });
    const denied = createProviderHttpExecutionMaterialResolver({
      approvedProductionHosts: ["approved.invalid"],
      binding: binding({ bodyEnvKey: undefined, headerEnvKey: undefined }),
      environment: "production",
      lookup: lookupFrom({
        [CREDENTIAL_KEY]: FAKE_CREDENTIAL,
        [ENDPOINT_KEY]: "https://provider.invalid/verify",
      }),
    });

    await expect(resolveWithCanonicalTestMaterial(
      allowed,
      plan({ method: "GET" }),
    )).resolves.toMatchObject({ ok: true });
    await expect(resolveWithCanonicalTestMaterial(
      denied,
      plan({ method: "GET" }),
    )).resolves.toMatchObject({
      diagnostic: { code: "PROVIDER_HTTP_ENDPOINT_HOST_NOT_APPROVED" },
      ok: false,
    });
  });

  it.each([
    ["missing endpoint", { [ENDPOINT_KEY]: "" }, "PROVIDER_HTTP_MATERIAL_MISSING"],
    ["missing credential", { [CREDENTIAL_KEY]: "" }, "PROVIDER_HTTP_MATERIAL_MISSING"],
    ["invalid header JSON", { [HEADER_KEY]: "not-json" }, "PROVIDER_HTTP_HEADERS_INVALID"],
    ["hop-by-hop header", { [HEADER_KEY]: "{\"connection\":\"keep-alive\"}" }, "PROVIDER_HTTP_HEADER_UNSAFE"],
    ["wrong content type", { [HEADER_KEY]: "{\"content-type\":\"text/plain\"}" }, "PROVIDER_HTTP_CONTENT_TYPE_INVALID"],
    ["invalid body JSON", { [BODY_KEY]: "not-json" }, "PROVIDER_HTTP_BODY_INVALID"],
  ])("rejects %s with typed safe diagnostics", async (_case, override, code) => {
    const endpoint = "http://localhost:4179/verify";
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding(),
      environment: "stage",
      lookup: lookupFrom({ ...localValues(endpoint), ...override }),
    });
    const result = await resolveWithCanonicalTestMaterial(resolver, plan());
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({ diagnostic: { code, traceId: "trace-material" }, ok: false });
    expect(serialized).not.toContain(FAKE_CREDENTIAL);
    expect(serialized).not.toContain(endpoint);
    expect(inspect(result)).not.toContain(FAKE_CREDENTIAL);
  });

  it("enforces method, body, header count, name, value, and byte bounds", async () => {
    const cases: Array<{
      binding?: TaskVerificationBinding;
      code: string;
      plan?: ProviderHttpRequestPlan;
      values: Record<string, string>;
    }> = [
      {
        code: "PROVIDER_HTTP_METHOD_INVALID",
        plan: plan({ method: "DELETE" as never }),
        values: localValues("http://127.0.0.1:4179/verify"),
      },
      {
        code: "PROVIDER_HTTP_BODY_NOT_ALLOWED",
        plan: plan({ method: "GET" }),
        values: localValues("http://127.0.0.1:4179/verify"),
      },
      {
        code: "PROVIDER_HTTP_BODY_TOO_LARGE",
        values: {
          ...localValues("http://127.0.0.1:4179/verify"),
          [BODY_KEY]: JSON.stringify({ value: "x".repeat(64 * 1024) }),
        },
      },
      {
        code: "PROVIDER_HTTP_HEADER_UNSAFE",
        values: {
          ...localValues("http://127.0.0.1:4179/verify"),
          [HEADER_KEY]: "{\"host\":\"fake.invalid\"}",
        },
      },
      {
        code: "PROVIDER_HTTP_HEADER_VALUE_INVALID",
        values: {
          ...localValues("http://127.0.0.1:4179/verify"),
          [HEADER_KEY]: JSON.stringify({ "x-provider": "line-one\nline-two" }),
        },
      },
    ];

    for (const entry of cases) {
      const resolver = createProviderHttpExecutionMaterialResolver({
        binding: entry.binding ?? binding(),
        environment: "local",
        lookup: lookupFrom(entry.values),
      });
      const request = entry.plan ?? plan();
      const result = await resolveWithCanonicalTestMaterial(resolver, request);

      expect(result).toMatchObject({ diagnostic: { code: entry.code }, ok: false });
    }
  });

  it("enforces configured header name, count, and aggregate byte limits", async () => {
    const endpoint = "http://127.0.0.1:4179/verify";
    const countHeaderNames = Array.from({ length: 32 }, (_, index) => `x-fake-${index}`);
    const countHeaders = Object.fromEntries(countHeaderNames.map((name) => [name, "value"]));
    const totalHeaderNames = Array.from({ length: 5 }, (_, index) => `x-total-${index}`);
    const totalHeaders = Object.fromEntries(
      totalHeaderNames.map((name) => [name, "x".repeat(3_500)]),
    );
    const cases = [
      {
        allowedHeaderNames: undefined,
        code: "PROVIDER_HTTP_HEADER_NAME_INVALID",
        headers: JSON.stringify({ "bad header": "value" }),
      },
      {
        allowedHeaderNames: [...countHeaderNames, "x-request-id"],
        code: "PROVIDER_HTTP_HEADER_COUNT_EXCEEDED",
        headers: JSON.stringify(countHeaders),
      },
      {
        allowedHeaderNames: [...totalHeaderNames, "x-request-id"],
        code: "PROVIDER_HTTP_HEADER_TOTAL_EXCEEDED",
        headers: JSON.stringify(totalHeaders),
      },
    ];

    for (const entry of cases) {
      const resolver = createProviderHttpExecutionMaterialResolver({
        ...(entry.allowedHeaderNames
          ? { allowedHeaderNames: entry.allowedHeaderNames }
          : {}),
        binding: binding({ bodyEnvKey: undefined, credentialEnvKey: undefined }),
        environment: "local",
        lookup: lookupFrom({
          [ENDPOINT_KEY]: endpoint,
          [HEADER_KEY]: entry.headers,
        }),
      });
      const result = await resolveWithCanonicalTestMaterial(
        resolver,
        plan({ bodyRef: undefined, method: "GET" }),
      );

      expect(result).toMatchObject({ diagnostic: { code: entry.code }, ok: false });
      expect(JSON.stringify(result)).not.toContain(endpoint);
    }
  });

  it("does not cache resolved values across credential rotation", async () => {
    let credential = "fake-credential-generation-one";
    let reads = 0;
    const resolver = createProviderHttpExecutionMaterialResolver({
      binding: binding({ bodyEnvKey: undefined, headerEnvKey: undefined }),
      environment: "local",
      lookup: {
        get(key) {
          reads += 1;
          return key === ENDPOINT_KEY
            ? "http://127.0.0.1:4179/verify"
            : credential;
        },
      },
    });
    const first = await resolveWithCanonicalTestMaterial(resolver, plan({ method: "GET" }));
    credential = "fake-credential-generation-two";
    const second = await resolveWithCanonicalTestMaterial(resolver, plan({ method: "GET" }));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(reads).toBe(4);

    if (first.ok && second.ok) {
      const firstAuthorization = await useProviderHttpExecutionMaterial(
        first.material,
        ({ headers }) => headers.authorization,
      );
      const secondAuthorization = await useProviderHttpExecutionMaterial(
        second.material,
        ({ headers }) => headers.authorization,
      );

      expect(firstAuthorization).toBe("Bearer fake-credential-generation-one");
      expect(secondAuthorization).toBe("Bearer fake-credential-generation-two");
    }
  });
});
