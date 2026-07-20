import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TaskTemplateCatalogAdoptedTask,
  TaskTemplateCatalogApiBridge,
  TaskTemplateCatalogFailure,
  TaskTemplateCatalogPage,
  TaskTemplateCatalogStatus,
  TaskTemplateCatalogTemplate,
  TaskTemplateVerificationType,
  TaskTemplateWalletCompatibility,
} from "../../../../api/taskTemplateCatalogApiBridge";

export type TaskTemplateCatalogFeatureMode = "configured" | "disabled_demo";
export type TaskTemplateCatalogViewStatus =
  | "disabled_demo"
  | "empty"
  | "error"
  | "filtered_empty"
  | "loading"
  | "ready"
  | "stale_adoption";

export interface TaskTemplateCatalogFilters {
  readonly categories: readonly string[];
  readonly locale: string;
  readonly status: TaskTemplateCatalogStatus;
  readonly verificationTypes: readonly TaskTemplateVerificationType[];
  readonly walletCompatibility: readonly TaskTemplateWalletCompatibility[];
}

export interface TaskTemplateCatalogViewState {
  readonly adoptedTask: TaskTemplateCatalogAdoptedTask | null;
  readonly announcement: string;
  readonly error: TaskTemplateCatalogFailure | null;
  readonly filters: TaskTemplateCatalogFilters;
  readonly page: TaskTemplateCatalogPage | null;
  readonly pendingTemplateKey: string | null;
  readonly staleTemplateKey: string | null;
  readonly status: TaskTemplateCatalogViewStatus;
}

export interface UseTaskTemplateCatalogOptions {
  readonly bridge?: TaskTemplateCatalogApiBridge;
  readonly campaignId?: string | null;
  readonly idempotencyKeyGenerator?: () => string;
  readonly locale: string;
  readonly mode: TaskTemplateCatalogFeatureMode;
  readonly onAdoptedTask?: (task: TaskTemplateCatalogAdoptedTask) => void;
  readonly sessionKey?: string | null;
}

export interface TaskTemplateCatalogFilterPatch {
  readonly categories?: readonly string[];
  readonly locale?: string;
  readonly status?: TaskTemplateCatalogStatus;
  readonly verificationTypes?: readonly TaskTemplateVerificationType[];
  readonly walletCompatibility?: readonly TaskTemplateWalletCompatibility[];
}

export interface UseTaskTemplateCatalogResult {
  readonly adopt: (
    template: TaskTemplateCatalogTemplate,
    overrides?: Readonly<{ points?: number; required?: boolean }>,
  ) => Promise<void>;
  readonly resetFilters: () => void;
  readonly retry: () => void;
  readonly setFilters: (patch: TaskTemplateCatalogFilterPatch) => void;
  readonly state: TaskTemplateCatalogViewState;
}

interface CurrentContext {
  readonly bridge?: TaskTemplateCatalogApiBridge;
  readonly campaignId?: string | null;
  readonly idempotencyKeyGenerator?: () => string;
  readonly mode: TaskTemplateCatalogFeatureMode;
  readonly onAdoptedTask?: (task: TaskTemplateCatalogAdoptedTask) => void;
  readonly sessionKey?: string | null;
}

interface AdoptionCommandIdentity {
  readonly contextEpoch: number;
  readonly idempotencyKey: string;
  readonly signature: string;
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
let generatedCommandSequence = 0;

const createFilters = (locale: string): TaskTemplateCatalogFilters => Object.freeze({
  categories: Object.freeze([]),
  locale,
  status: "active" as const,
  verificationTypes: Object.freeze([]),
  walletCompatibility: Object.freeze([]),
});

const initialState = (
  mode: TaskTemplateCatalogFeatureMode,
  locale: string,
): TaskTemplateCatalogViewState => Object.freeze({
  adoptedTask: null,
  announcement: "",
  error: null,
  filters: createFilters(locale),
  page: null,
  pendingTemplateKey: null,
  staleTemplateKey: null,
  status: mode === "disabled_demo" ? "disabled_demo" : "loading",
});

const localFailure = (
  code: TaskTemplateCatalogFailure["code"],
  field: string,
  operation: TaskTemplateCatalogFailure["operation"],
  traceId: string,
): TaskTemplateCatalogFailure => Object.freeze({
  code,
  field,
  ok: false as const,
  operation,
  retryable: false,
  traceId,
});

const templateKey = (template: Pick<TaskTemplateCatalogTemplate, "templateCode" | "version">) =>
  `${template.templateCode}:${template.version}`;

const adoptionCommandSignature = (
  campaignId: string,
  template: Pick<TaskTemplateCatalogTemplate, "templateCode" | "version">,
  overrides: Readonly<{ points?: number; required?: boolean }> | undefined,
) => JSON.stringify({
  campaignId,
  overrides: overrides === undefined
    ? null
    : {
      points: overrides.points ?? null,
      required: overrides.required ?? null,
    },
  templateCode: template.templateCode,
  version: template.version,
});

const arraysEqual = <TValue,>(left: readonly TValue[], right: readonly TValue[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const filtersEqual = (left: TaskTemplateCatalogFilters, right: TaskTemplateCatalogFilters) =>
  left.locale === right.locale
  && left.status === right.status
  && arraysEqual(left.categories, right.categories)
  && arraysEqual(left.verificationTypes, right.verificationTypes)
  && arraysEqual(left.walletCompatibility, right.walletCompatibility);

const filtersActive = (filters: TaskTemplateCatalogFilters) =>
  filters.categories.length > 0
  || filters.verificationTypes.length > 0
  || filters.walletCompatibility.length > 0
  || filters.status !== "active";

const stateForPage = (
  current: TaskTemplateCatalogViewState,
  page: TaskTemplateCatalogPage,
  traceId: string,
): TaskTemplateCatalogViewState => Object.freeze({
  ...current,
  adoptedTask: null,
  announcement: `Catalog updated. ${page.items.length} templates. Trace ${traceId}.`,
  error: null,
  page,
  pendingTemplateKey: null,
  staleTemplateKey: null,
  status: page.items.length > 0
    ? "ready"
    : filtersActive(current.filters)
      ? "filtered_empty"
      : "empty",
});

const nextIdempotencyKey = (generator: (() => string) | undefined): string => {
  try {
    const generated = generator?.();
    if (typeof generated === "string" && IDEMPOTENCY_KEY_PATTERN.test(generated)) {
      return generated;
    }
  } catch {
    // Use the bounded local command identity below.
  }
  generatedCommandSequence = generatedCommandSequence < Number.MAX_SAFE_INTEGER
    ? generatedCommandSequence + 1
    : 1;
  return `catalog-adopt-${Date.now().toString(36)}-${generatedCommandSequence.toString(36)}`;
};

export const useTaskTemplateCatalog = ({
  bridge,
  campaignId = null,
  idempotencyKeyGenerator,
  locale,
  mode,
  onAdoptedTask,
  sessionKey = null,
}: UseTaskTemplateCatalogOptions): UseTaskTemplateCatalogResult => {
  const [state, setState] = useState<TaskTemplateCatalogViewState>(() => initialState(mode, locale));
  const [retryEpoch, setRetryEpoch] = useState(0);
  const mountedRef = useRef(true);
  const contextEpochRef = useRef(0);
  const listControllerRef = useRef<AbortController | null>(null);
  const adoptionControllerRef = useRef<AbortController | null>(null);
  const adoptionCommandRef = useRef<AdoptionCommandIdentity | null>(null);
  const pendingTemplateRef = useRef<string | null>(null);
  const previousLocaleRef = useRef(locale);
  const currentContextRef = useRef<CurrentContext>({
    bridge,
    campaignId,
    idempotencyKeyGenerator,
    mode,
    onAdoptedTask,
    sessionKey,
  });
  currentContextRef.current = {
    bridge,
    campaignId,
    idempotencyKeyGenerator,
    mode,
    onAdoptedTask,
    sessionKey,
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      contextEpochRef.current += 1;
      pendingTemplateRef.current = null;
      adoptionCommandRef.current = null;
      listControllerRef.current?.abort();
      adoptionControllerRef.current?.abort();
      listControllerRef.current = null;
      adoptionControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previousLocaleRef.current === locale) {
      return;
    }
    const previousLocale = previousLocaleRef.current;
    previousLocaleRef.current = locale;
    setState((current) => {
      if (current.filters.locale !== previousLocale) {
        return current;
      }
      return Object.freeze({
        ...current,
        filters: Object.freeze({ ...current.filters, locale }),
      });
    });
  }, [locale]);

  const filterSignature = useMemo(() => [
    state.filters.categories.join(","),
    state.filters.locale,
    state.filters.status,
    state.filters.verificationTypes.join(","),
    state.filters.walletCompatibility.join(","),
  ].join("|"), [state.filters]);

  useEffect(() => {
    const epoch = contextEpochRef.current + 1;
    contextEpochRef.current = epoch;
    listControllerRef.current?.abort();
    adoptionControllerRef.current?.abort();
    pendingTemplateRef.current = null;
    adoptionCommandRef.current = null;
    adoptionControllerRef.current = null;

    if (mode === "disabled_demo") {
      listControllerRef.current = null;
      setState((current) => Object.freeze({
        ...current,
        adoptedTask: null,
        announcement: "",
        error: null,
        page: null,
        pendingTemplateKey: null,
        staleTemplateKey: null,
        status: "disabled_demo",
      }));
      return undefined;
    }

    const traceId = `catalog-ui-list-${epoch}`;
    const missing = !bridge
      ? localFailure("BRIDGE_INVALID_INPUT", "bridge", "list", traceId)
      : !campaignId
        ? localFailure("BRIDGE_INVALID_INPUT", "campaignId", "list", traceId)
        : !sessionKey
          ? localFailure("AUTH_SESSION_REQUIRED", "session", "list", traceId)
          : null;
    if (missing) {
      listControllerRef.current = null;
      setState((current) => Object.freeze({
        ...current,
        adoptedTask: null,
        announcement: `Catalog unavailable. Trace ${traceId}.`,
        error: missing,
        page: null,
        pendingTemplateKey: null,
        staleTemplateKey: null,
        status: "error",
      }));
      return undefined;
    }
    if (!bridge) {
      return undefined;
    }

    const controller = new AbortController();
    listControllerRef.current = controller;
    setState((current) => Object.freeze({
      ...current,
      adoptedTask: null,
      announcement: "Loading catalog.",
      error: null,
      page: null,
      pendingTemplateKey: null,
      staleTemplateKey: null,
      status: "loading",
    }));
    const query = state.filters;
    void bridge.list({
      ...(query.categories.length === 0 ? {} : { categories: query.categories }),
      locale: query.locale,
      status: query.status,
      ...(query.verificationTypes.length === 0
        ? {}
        : { verificationTypes: query.verificationTypes }),
      ...(query.walletCompatibility.length === 0
        ? {}
        : { walletCompatibility: query.walletCompatibility }),
    }, { signal: controller.signal, traceId }).then((result) => {
      if (!mountedRef.current || controller.signal.aborted || contextEpochRef.current !== epoch) {
        return;
      }
      if (result.ok) {
        setState((current) => stateForPage(current, result.data, result.traceId));
        return;
      }
      setState((current) => Object.freeze({
        ...current,
        announcement: `Catalog request failed. Trace ${result.traceId}.`,
        error: result,
        page: null,
        pendingTemplateKey: null,
        staleTemplateKey: null,
        status: "error",
      }));
    }).catch(() => {
      if (!mountedRef.current || controller.signal.aborted || contextEpochRef.current !== epoch) {
        return;
      }
      const error = localFailure("BRIDGE_NETWORK_ERROR", "request", "list", traceId);
      setState((current) => Object.freeze({
        ...current,
        announcement: `Catalog request failed. Trace ${traceId}.`,
        error,
        page: null,
        pendingTemplateKey: null,
        staleTemplateKey: null,
        status: "error",
      }));
    });

    return () => {
      controller.abort();
      if (listControllerRef.current === controller) {
        listControllerRef.current = null;
      }
      adoptionControllerRef.current?.abort();
      adoptionControllerRef.current = null;
      pendingTemplateRef.current = null;
    };
  }, [bridge, campaignId, filterSignature, mode, retryEpoch, sessionKey]);

  const setFilters = useCallback((patch: TaskTemplateCatalogFilterPatch) => {
    setState((current) => {
      const next = Object.freeze({
        categories: Object.freeze([...(patch.categories ?? current.filters.categories)]),
        locale: patch.locale ?? current.filters.locale,
        status: patch.status ?? current.filters.status,
        verificationTypes: Object.freeze([
          ...(patch.verificationTypes ?? current.filters.verificationTypes),
        ]),
        walletCompatibility: Object.freeze([
          ...(patch.walletCompatibility ?? current.filters.walletCompatibility),
        ]),
      });
      return filtersEqual(current.filters, next)
        ? current
        : Object.freeze({ ...current, filters: next });
    });
  }, []);

  const resetFilters = useCallback(() => {
    setState((current) => {
      const next = createFilters(locale);
      return filtersEqual(current.filters, next)
        ? current
        : Object.freeze({ ...current, filters: next });
    });
  }, [locale]);

  const retry = useCallback(() => {
    setRetryEpoch((current) => current < Number.MAX_SAFE_INTEGER ? current + 1 : 0);
  }, []);

  const adopt = useCallback(async (
    template: TaskTemplateCatalogTemplate,
    overrides?: Readonly<{ points?: number; required?: boolean }>,
  ) => {
    const context = currentContextRef.current;
    const key = templateKey(template);
    if (pendingTemplateRef.current !== null) {
      return;
    }
    const epoch = contextEpochRef.current;
    const traceId = `catalog-ui-adopt-${epoch}`;
    if (
      context.mode !== "configured"
      || !context.bridge
      || !context.campaignId
      || !context.sessionKey
    ) {
      if (!mountedRef.current) {
        return;
      }
      const field = !context.bridge
        ? "bridge"
        : !context.campaignId
          ? "campaignId"
          : !context.sessionKey
            ? "session"
            : "mode";
      const error = localFailure("BRIDGE_INVALID_INPUT", field, "adopt", traceId);
      setState((current) => Object.freeze({
        ...current,
        announcement: `Template adoption unavailable. Trace ${traceId}.`,
        error,
        status: "error",
      }));
      return;
    }

    const controller = new AbortController();
    adoptionControllerRef.current?.abort();
    adoptionControllerRef.current = controller;
    pendingTemplateRef.current = key;
    const commandSignature = adoptionCommandSignature(context.campaignId, template, overrides);
    const previousCommand = adoptionCommandRef.current;
    const command = previousCommand
      && previousCommand.contextEpoch === epoch
      && previousCommand.signature === commandSignature
      ? previousCommand
      : Object.freeze({
        contextEpoch: epoch,
        idempotencyKey: nextIdempotencyKey(context.idempotencyKeyGenerator),
        signature: commandSignature,
      });
    adoptionCommandRef.current = command;
    setState((current) => Object.freeze({
      ...current,
      adoptedTask: null,
      announcement: `Adopting ${template.templateCode}.`,
      error: null,
      pendingTemplateKey: key,
      staleTemplateKey: null,
    }));

    let result;
    try {
      result = await context.bridge.adopt({
        campaignId: context.campaignId,
        idempotencyKey: command.idempotencyKey,
        ...(overrides === undefined ? {} : { overrides }),
        template: { templateCode: template.templateCode, version: template.version },
      }, { signal: controller.signal, traceId });
    } catch {
      result = localFailure("BRIDGE_NETWORK_ERROR", "request", "adopt", traceId);
    }

    if (
      !mountedRef.current
      || controller.signal.aborted
      || contextEpochRef.current !== epoch
      || pendingTemplateRef.current !== key
    ) {
      return;
    }
    pendingTemplateRef.current = null;
    adoptionControllerRef.current = null;

    if (!result.ok) {
      const stale = result.code === "TASK_TEMPLATE_STALE";
      setState((current) => Object.freeze({
        ...current,
        announcement: stale
          ? `Catalog changed. Refresh required. Trace ${result.traceId}.`
          : `Template adoption failed. Trace ${result.traceId}.`,
        error: result,
        pendingTemplateKey: null,
        staleTemplateKey: stale ? key : null,
        status: stale ? "stale_adoption" : "error",
      }));
      return;
    }

    if (adoptionCommandRef.current === command) {
      adoptionCommandRef.current = null;
    }

    setState((current) => Object.freeze({
      ...current,
      adoptedTask: result.data,
      announcement: result.data.replayed
        ? `Existing task restored. Trace ${result.traceId}.`
        : `Task created. Trace ${result.traceId}.`,
      error: null,
      pendingTemplateKey: null,
      staleTemplateKey: null,
      status: current.page?.items.length
        ? "ready"
        : filtersActive(current.filters)
          ? "filtered_empty"
          : "empty",
    }));
    try {
      context.onAdoptedTask?.(result.data);
    } catch {
      if (mountedRef.current && contextEpochRef.current === epoch) {
        const error = localFailure("BRIDGE_INVALID_INPUT", "onAdoptedTask", "adopt", result.traceId);
        setState((current) => Object.freeze({
          ...current,
          announcement: `Task refresh failed. Trace ${result.traceId}.`,
          error,
          status: "error",
        }));
      }
      return;
    }
    if (mountedRef.current && contextEpochRef.current === epoch) {
      setRetryEpoch((current) => current < Number.MAX_SAFE_INTEGER ? current + 1 : 0);
    }
  }, []);

  return useMemo(() => Object.freeze({
    adopt,
    resetFilters,
    retry,
    setFilters,
    state,
  }), [adopt, resetFilters, retry, setFilters, state]);
};
