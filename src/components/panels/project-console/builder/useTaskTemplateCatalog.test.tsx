import { StrictMode, type PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  TaskTemplateCatalogAdoptResult,
  TaskTemplateCatalogApiBridge,
  TaskTemplateCatalogDetailResult,
  TaskTemplateCatalogListResult,
  TaskTemplateCatalogPage,
  TaskTemplateCatalogTemplate,
} from "../../../../api/taskTemplateCatalogApiBridge";
import { useTaskTemplateCatalog } from "./useTaskTemplateCatalog";

const checksum = "b".repeat(64);

const template = (overrides: Partial<TaskTemplateCatalogTemplate> = {}): TaskTemplateCatalogTemplate => ({
  adoptionMode: "direct",
  catalogSchemaVersion: "task-template-catalog-v1",
  category: "wallet",
  checksum,
  content: { description: "Connect a supported wallet.", title: "Connect wallet" },
  evidenceRule: { source: "WALLET_SESSION" },
  locale: { requestedLocale: "en-US", resolvedLocale: "en-US", status: "exact" },
  points: { default: 40, maximum: 80, minimum: 20 },
  requiredPolicy: { default: true, overrideAllowed: true },
  riskLevel: "low",
  status: "active",
  templateCode: "wallet-connect",
  verificationType: "WALLET",
  version: 3,
  walletCompatibility: "ANY",
  ...overrides,
});

const page = (
  items: readonly TaskTemplateCatalogTemplate[] = [template()],
): TaskTemplateCatalogPage => ({
  catalogSchemaVersion: "task-template-catalog-v1",
  items,
  page: { limit: 24, nextCursor: null },
  snapshotAt: "2026-07-20T07:00:00.000Z",
  totalActive: items.length,
});

const listSuccess = (
  data = page(),
  traceId = "trace-hook-list",
): TaskTemplateCatalogListResult => ({ data, httpStatus: 200, ok: true, traceId });

const adoptSuccess = (
  replayed = false,
): TaskTemplateCatalogAdoptResult => ({
  data: {
    campaignId: "campaign-a",
    replayed,
    taskId: "task-adopted-1",
    templateChecksum: checksum,
    templateCode: "wallet-connect",
    templateVersion: 3,
  },
  httpStatus: replayed ? 200 : 201,
  ok: true,
  traceId: "trace-hook-adopt",
});

const detailFailure = (): TaskTemplateCatalogDetailResult => ({
  code: "BRIDGE_CLOSED",
  field: "bridge",
  ok: false,
  operation: "detail",
  retryable: false,
  traceId: "trace-unused",
});

const bridge = (
  overrides: Partial<TaskTemplateCatalogApiBridge> = {},
): TaskTemplateCatalogApiBridge => ({
  adopt: vi.fn(async () => adoptSuccess()),
  close: vi.fn(),
  detail: vi.fn(async () => detailFailure()),
  list: vi.fn(async () => listSuccess()),
  ...overrides,
});

const deferred = <TValue,>() => {
  let resolve!: (value: TValue) => void;
  const promise = new Promise<TValue>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

const configured = (catalogBridge: TaskTemplateCatalogApiBridge) => ({
  bridge: catalogBridge,
  campaignId: "campaign-a",
  idempotencyKeyGenerator: () => "catalog-hook-command-1",
  locale: "en-US",
  mode: "configured" as const,
  sessionKey: "issued-owner-session-a",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTaskTemplateCatalog", () => {
  it("remains mounted and commits the live request under React StrictMode replay", async () => {
    const list = vi.fn(async () => listSuccess());
    const catalogBridge = bridge({ list });
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(
      () => useTaskTemplateCatalog(configured(catalogBridge)),
      { wrapper },
    );

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state.page?.items[0].templateCode).toBe("wallet-connect");
    expect(list.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps explicit disabled demo inert without touching the API bridge", () => {
    const catalogBridge = bridge();
    const { result } = renderHook(() => useTaskTemplateCatalog({
      ...configured(catalogBridge),
      mode: "disabled_demo",
    }));

    expect(result.current.state).toMatchObject({
      error: null,
      page: null,
      pendingTemplateKey: null,
      status: "disabled_demo",
    });
    expect(catalogBridge.list).not.toHaveBeenCalled();
    expect(catalogBridge.adopt).not.toHaveBeenCalled();
  });

  it.each([
    { field: "bridge", override: { bridge: undefined } },
    { field: "campaignId", override: { campaignId: null } },
    { field: "session", override: { sessionKey: null } },
  ])("fails closed for configured mode without $field", async ({ field, override }) => {
    const catalogBridge = bridge();
    const { result } = renderHook(() => useTaskTemplateCatalog({
      ...configured(catalogBridge),
      ...override,
    }));

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state.error).toMatchObject({ field, ok: false, operation: "list" });
    expect(catalogBridge.list).not.toHaveBeenCalled();
  });

  it("loads ready, empty and filtered-empty states from server page facts", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce(listSuccess(page()))
      .mockResolvedValueOnce(listSuccess(page([])))
      .mockResolvedValueOnce(listSuccess(page([])));
    const catalogBridge = bridge({ list });
    const { result } = renderHook(() => useTaskTemplateCatalog(configured(catalogBridge)));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state.page?.totalActive).toBe(1);
    expect(list).toHaveBeenLastCalledWith({ locale: "en-US", status: "active" }, expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe("empty"));

    act(() => result.current.setFilters({ verificationTypes: ["SOCIAL"] }));
    await waitFor(() => expect(result.current.state.status).toBe("filtered_empty"));
    expect(list).toHaveBeenLastCalledWith({
      locale: "en-US",
      status: "active",
      verificationTypes: ["SOCIAL"],
    }, expect.any(Object));
  });

  it("aborts A and ignores its late success after Campaign/session epoch B is ready", async () => {
    const requestA = deferred<TaskTemplateCatalogListResult>();
    const requestB = deferred<TaskTemplateCatalogListResult>();
    const list = vi.fn()
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise);
    const catalogBridge = bridge({ list });
    const initial = configured(catalogBridge);
    const { result, rerender } = renderHook(
      ({ campaignId, sessionKey }) => useTaskTemplateCatalog({
        ...initial,
        campaignId,
        sessionKey,
      }),
      { initialProps: { campaignId: "campaign-a", sessionKey: "issued-owner-session-a" } },
    );

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    const signalA = list.mock.calls[0][1].signal as AbortSignal;
    rerender({ campaignId: "campaign-b", sessionKey: "issued-owner-session-b" });
    expect(signalA.aborted).toBe(true);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

    await act(async () => requestB.resolve(listSuccess(page([
      template({ content: { description: "B", title: "Campaign B template" } }),
    ]), "trace-b")));
    await waitFor(() => expect(result.current.state.page?.items[0].content.title)
      .toBe("Campaign B template"));

    await act(async () => requestA.resolve(listSuccess(page([
      template({ content: { description: "A", title: "Late Campaign A template" } }),
    ]), "trace-a")));
    expect(result.current.state.page?.items[0].content.title).toBe("Campaign B template");
  });

  it("rotates filter/retry epochs and aborts the active request", async () => {
    const requests = [
      deferred<TaskTemplateCatalogListResult>(),
      deferred<TaskTemplateCatalogListResult>(),
      deferred<TaskTemplateCatalogListResult>(),
    ];
    const list = vi.fn()
      .mockReturnValueOnce(requests[0].promise)
      .mockReturnValueOnce(requests[1].promise)
      .mockReturnValueOnce(requests[2].promise);
    const catalogBridge = bridge({ list });
    const { result } = renderHook(() => useTaskTemplateCatalog(configured(catalogBridge)));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    const firstSignal = list.mock.calls[0][1].signal as AbortSignal;
    act(() => result.current.setFilters({ categories: ["social"] }));
    expect(firstSignal.aborted).toBe(true);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    const secondSignal = list.mock.calls[1][1].signal as AbortSignal;
    act(() => result.current.retry());
    expect(secondSignal.aborted).toBe(true);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));

    await act(async () => requests[2].resolve(listSuccess(page([]))));
    await waitFor(() => expect(result.current.state.status).toBe("filtered_empty"));
    await act(async () => {
      requests[0].resolve(listSuccess());
      requests[1].resolve(listSuccess());
    });
    expect(result.current.state.status).toBe("filtered_empty");
  });

  it("aborts list and adoption on unmount with no late state work", async () => {
    const listRequest = deferred<TaskTemplateCatalogListResult>();
    const adoptRequest = deferred<TaskTemplateCatalogAdoptResult>();
    const list = vi.fn().mockReturnValueOnce(listRequest.promise);
    const adopt = vi.fn().mockReturnValueOnce(adoptRequest.promise);
    const catalogBridge = bridge({ adopt, list });
    const { result, unmount } = renderHook(() => useTaskTemplateCatalog(configured(catalogBridge)));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    await act(async () => listRequest.resolve(listSuccess()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    act(() => {
      void result.current.adopt(template());
    });
    await waitFor(() => expect(adopt).toHaveBeenCalledTimes(1));
    const listSignal = list.mock.calls[0][1].signal as AbortSignal;
    const adoptSignal = adopt.mock.calls[0][1].signal as AbortSignal;
    unmount();

    expect(listSignal.aborted).toBe(true);
    expect(adoptSignal.aborted).toBe(true);
    await act(async () => adoptRequest.resolve(adoptSuccess()));
  });

  it("deduplicates adoption, sends only identity/overrides and refetches after success", async () => {
    const adoptRequest = deferred<TaskTemplateCatalogAdoptResult>();
    const list = vi.fn()
      .mockResolvedValueOnce(listSuccess())
      .mockResolvedValueOnce(listSuccess());
    const adopt = vi.fn().mockReturnValueOnce(adoptRequest.promise);
    const onAdoptedTask = vi.fn();
    const catalogBridge = bridge({ adopt, list });
    const { result } = renderHook(() => useTaskTemplateCatalog({
      ...configured(catalogBridge),
      onAdoptedTask,
    }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => {
      void result.current.adopt(template(), { points: 60, required: false });
      void result.current.adopt(template(), { points: 70 });
    });
    await waitFor(() => expect(adopt).toHaveBeenCalledTimes(1));
    expect(adopt).toHaveBeenCalledWith({
      campaignId: "campaign-a",
      idempotencyKey: "catalog-hook-command-1",
      overrides: { points: 60, required: false },
      template: { templateCode: "wallet-connect", version: 3 },
    }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result.current.state.pendingTemplateKey).toBe("wallet-connect:3");

    await act(async () => adoptRequest.resolve(adoptSuccess()));
    await waitFor(() => expect(onAdoptedTask).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-adopted-1" }),
    ));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(result.current.state.pendingTemplateKey).toBeNull();
  });

  it("reuses one idempotency key after an unknown outcome until the same payload succeeds", async () => {
    const adopt = vi.fn()
      .mockResolvedValueOnce({
        code: "BRIDGE_NETWORK_ERROR",
        field: "request",
        ok: false,
        operation: "adopt",
        retryable: true,
        traceId: "trace-unknown-outcome",
      } satisfies TaskTemplateCatalogAdoptResult)
      .mockResolvedValueOnce(adoptSuccess());
    const idempotencyKeyGenerator = vi.fn()
      .mockReturnValueOnce("catalog-stable-command-1")
      .mockReturnValueOnce("catalog-should-not-be-used-2");
    const catalogBridge = bridge({ adopt });
    const { result } = renderHook(() => useTaskTemplateCatalog({
      ...configured(catalogBridge),
      idempotencyKeyGenerator,
    }));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => result.current.adopt(template(), { points: 60, required: false }));
    expect(result.current.state.status).toBe("error");
    await act(async () => result.current.adopt(template(), { points: 60, required: false }));

    expect(adopt).toHaveBeenCalledTimes(2);
    expect(adopt.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
      "catalog-stable-command-1",
      "catalog-stable-command-1",
    ]);
    expect(idempotencyKeyGenerator).toHaveBeenCalledTimes(1);
  });

  it("surfaces stale adoption without clearing the current catalog page", async () => {
    const adopt = vi.fn(async (): Promise<TaskTemplateCatalogAdoptResult> => ({
      code: "TASK_TEMPLATE_STALE",
      field: "template",
      httpStatus: 422,
      ok: false,
      operation: "adopt",
      retryable: false,
      traceId: "trace-stale-adopt",
    }));
    const catalogBridge = bridge({ adopt });
    const { result } = renderHook(() => useTaskTemplateCatalog(configured(catalogBridge)));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => result.current.adopt(template()));

    expect(result.current.state).toMatchObject({
      error: { code: "TASK_TEMPLATE_STALE", traceId: "trace-stale-adopt" },
      page: { totalActive: 1 },
      pendingTemplateKey: null,
      staleTemplateKey: "wallet-connect:3",
      status: "stale_adoption",
    });
  });
});
