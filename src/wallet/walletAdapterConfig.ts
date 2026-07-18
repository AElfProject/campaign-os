export const WALLET_ADAPTER_CONFIG_JSON_MAX_BYTES = 32_768;
export const WALLET_ADAPTER_CONFIG_MAX_ENTRIES = 16;
export const WALLET_ADAPTER_ID_MAX_LENGTH = 64;
export const WALLET_ADAPTER_LABEL_MAX_LENGTH = 80;

const WALLET_ADAPTER_CANDIDATE_VERSION = "0.4.0-alpha.21";
const WALLET_ADAPTER_DEFAULT_TRACE_ID = "wallet-adapter-config-startup";

export type WalletAdapterConfigStatus = "disabled" | "invalid" | "ready";
export type WalletAdapterAvailabilityStatus = "available" | "disabled" | "unavailable";
export type WalletAdapterPackageGateStatus = "candidate" | "unavailable";
export type WalletAdapterPackageRole = "adapter" | "foundation" | "react_wrapper";
export type WalletAdapterPackageGateCode =
  | "WALLET_ADAPTER_NODE_ESM_IMPORT_UNSUPPORTED"
  | "WALLET_ADAPTER_PACKAGE_MISSING"
  | "WALLET_ADAPTER_PEER_GRAPH_INVALID"
  | "WALLET_ADAPTER_VITE_BUNDLE_FAILED";

export type WalletAdapterConfigDiagnosticCode =
  | "WALLET_ADAPTER_ENABLEMENT_INVALID"
  | "WALLET_ADAPTER_JSON_REQUIRED"
  | "WALLET_ADAPTER_JSON_TOO_LARGE"
  | "WALLET_ADAPTER_JSON_INVALID"
  | "WALLET_ADAPTER_JSON_SHAPE_INVALID"
  | "WALLET_ADAPTER_UNKNOWN_FIELD"
  | "WALLET_ADAPTER_ENTRY_LIMIT_EXCEEDED"
  | "WALLET_ADAPTER_FIELD_INVALID"
  | "WALLET_ADAPTER_ID_CONFLICT"
  | "WALLET_ADAPTER_RECOMMENDED_CONFLICT"
  | "WALLET_ADAPTER_SERVER_BINDING_REQUIRED"
  | "WALLET_ADAPTER_PACKAGE_UNAVAILABLE"
  | "WALLET_ADAPTER_RUNTIME_AVAILABILITY_REQUIRED";

export interface WalletAdapterPackageGate {
  readonly adapterId?: string;
  readonly code: WalletAdapterPackageGateCode;
  readonly nodeEsmImport: "failed" | "not_run";
  readonly packageName: string;
  readonly role: WalletAdapterPackageRole;
  readonly status: WalletAdapterPackageGateStatus;
  readonly version: typeof WALLET_ADAPTER_CANDIDATE_VERSION;
  readonly viteBundle: "failed" | "not_run" | "passed";
}

export const walletAdapterPackageGates: readonly WalletAdapterPackageGate[] = Object.freeze([
  Object.freeze({
    code: "WALLET_ADAPTER_NODE_ESM_IMPORT_UNSUPPORTED",
    nodeEsmImport: "failed",
    packageName: "@aelf-web-login/wallet-adapter-base",
    role: "foundation",
    status: "candidate",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "passed",
  }),
  Object.freeze({
    code: "WALLET_ADAPTER_VITE_BUNDLE_FAILED",
    nodeEsmImport: "failed",
    packageName: "@aelf-web-login/wallet-adapter-react",
    role: "react_wrapper",
    status: "unavailable",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "failed",
  }),
  Object.freeze({
    adapterId: "portkey-aa",
    code: "WALLET_ADAPTER_PEER_GRAPH_INVALID",
    nodeEsmImport: "not_run",
    packageName: "@aelf-web-login/wallet-adapter-portkey-aa",
    role: "adapter",
    status: "unavailable",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "not_run",
  }),
  Object.freeze({
    adapterId: "portkey-discover-eoa",
    code: "WALLET_ADAPTER_NODE_ESM_IMPORT_UNSUPPORTED",
    nodeEsmImport: "failed",
    packageName: "@aelf-web-login/wallet-adapter-portkey-discover",
    role: "adapter",
    status: "candidate",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "passed",
  }),
  Object.freeze({
    adapterId: "portkey-eoa-extension",
    code: "WALLET_ADAPTER_PACKAGE_MISSING",
    nodeEsmImport: "not_run",
    packageName: "@aelf-web-login/wallet-adapter-portkey-extension",
    role: "adapter",
    status: "unavailable",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "not_run",
  }),
  Object.freeze({
    adapterId: "nightelf",
    code: "WALLET_ADAPTER_NODE_ESM_IMPORT_UNSUPPORTED",
    nodeEsmImport: "failed",
    packageName: "@aelf-web-login/wallet-adapter-night-elf",
    role: "adapter",
    status: "candidate",
    version: WALLET_ADAPTER_CANDIDATE_VERSION,
    viteBundle: "passed",
  }),
]);

export const walletAdapterInstallCandidatePackageNames: readonly string[] = Object.freeze(
  walletAdapterPackageGates
    .filter(({ status, viteBundle }) => status === "candidate" && viteBundle === "passed")
    .map(({ packageName }) => packageName),
);

const walletAdapterInstallCandidatePackageNameSet = new Set(
  walletAdapterInstallCandidatePackageNames,
);

export const isWalletAdapterInstallCandidatePackageName = (packageName: string): boolean =>
  walletAdapterInstallCandidatePackageNameSet.has(packageName);

export interface BrowserWalletAdapterConfigEntry {
  readonly adapterId: string;
  readonly enabled: boolean;
  readonly label: string;
  readonly packageName: string;
  readonly recommended: boolean;
  readonly status: WalletAdapterAvailabilityStatus;
}

export interface WalletAdapterConfigDiagnostic {
  readonly adapterId?: string;
  readonly code: WalletAdapterConfigDiagnosticCode;
  readonly field: string;
  readonly severity: "error";
  readonly traceId: string;
}

export interface WalletAdapterConfig {
  readonly adapters: readonly BrowserWalletAdapterConfigEntry[];
  readonly diagnostics: readonly WalletAdapterConfigDiagnostic[];
  readonly enabled: boolean;
  readonly status: WalletAdapterConfigStatus;
  readonly valid: boolean;
}

export interface WalletAdapterConfigSummary {
  readonly adapterCount: number;
  readonly enabledAdapterIds: readonly string[];
  readonly recommendedAdapterId?: string;
  readonly status: WalletAdapterConfigStatus;
  readonly unavailableAdapterIds: readonly string[];
}

export interface ResolveWalletAdapterConfigOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly jsonParser?: (source: string) => unknown;
  readonly runtimeAvailability?: Readonly<Partial<Record<string, "available" | "unavailable">>>;
  readonly serverBindingIds?: readonly string[];
  readonly traceId?: string;
}

export type WalletAdapterModuleLoadResult<TModule = unknown> =
  | Readonly<{
    adapterId: string;
    module: TModule;
    status: "available";
  }>
  | Readonly<{
    adapterId: string;
    code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE";
    status: "unavailable";
    traceId: string;
  }>;

class WalletAdapterConfigFailure extends Error {
  readonly adapterId?: string;
  readonly code: WalletAdapterConfigDiagnosticCode;
  readonly field: string;

  constructor(code: WalletAdapterConfigDiagnosticCode, field: string, adapterId?: string) {
    super("Browser wallet adapter configuration is invalid.");
    this.name = "WalletAdapterConfigFailure";
    this.code = code;
    this.field = field;
    this.adapterId = adapterId;
  }
}

const fail = (
  code: WalletAdapterConfigDiagnosticCode,
  field: string,
  adapterId?: string,
): never => {
  throw new WalletAdapterConfigFailure(code, field, adapterId);
};

const utf8ByteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

const safeTraceId = (value: string | undefined): string =>
  value && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : WALLET_ADAPTER_DEFAULT_TRACE_ID;

const safeAdapterId = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= WALLET_ADAPTER_ID_MAX_LENGTH
  && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const ownValue = (record: Record<string, unknown>, field: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    return fail("WALLET_ADAPTER_JSON_SHAPE_INVALID", `adapters[].${field}`);
  }

  return descriptor.value;
};

const adapterFields = new Set(["adapterId", "enabled", "label", "recommended"]);
const packageGateByAdapterId = new Map(
  walletAdapterPackageGates.flatMap((gate) =>
    gate.adapterId === undefined ? [] : [[gate.adapterId, gate] as const]),
);

const parseGlobalEnablement = (value: string | undefined): boolean => {
  if (value === undefined || value === "" || value === "0" || value === "false") {
    return false;
  }

  if (value === "1" || value === "true") {
    return true;
  }

  return fail("WALLET_ADAPTER_ENABLEMENT_INVALID", "VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED");
};

const parseEntries = (
  source: string | undefined,
  parser: (source: string) => unknown,
): readonly Record<string, unknown>[] => {
  if (!source) {
    return fail("WALLET_ADAPTER_JSON_REQUIRED", "VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON");
  }

  if (utf8ByteLength(source) > WALLET_ADAPTER_CONFIG_JSON_MAX_BYTES) {
    return fail("WALLET_ADAPTER_JSON_TOO_LARGE", "VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON");
  }

  let parsed: unknown;
  try {
    parsed = parser(source);
  } catch {
    return fail("WALLET_ADAPTER_JSON_INVALID", "VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON");
  }

  if (!Array.isArray(parsed)) {
    return fail("WALLET_ADAPTER_JSON_SHAPE_INVALID", "VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON");
  }

  if (parsed.length > WALLET_ADAPTER_CONFIG_MAX_ENTRIES) {
    return fail("WALLET_ADAPTER_ENTRY_LIMIT_EXCEEDED", "VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON");
  }

  if (parsed.some((entry) => !isPlainRecord(entry))) {
    return fail("WALLET_ADAPTER_JSON_SHAPE_INVALID", "adapters[]");
  }

  return parsed as readonly Record<string, unknown>[];
};

const parseEntry = (
  value: Record<string, unknown>,
  runtimeAvailability: Readonly<Partial<Record<string, "available" | "unavailable">>>,
  serverBindingIds: ReadonlySet<string>,
): BrowserWalletAdapterConfigEntry => {
  if (Object.keys(value).some((field) => !adapterFields.has(field))) {
    return fail("WALLET_ADAPTER_UNKNOWN_FIELD", "adapters[]");
  }

  const adapterIdValue = ownValue(value, "adapterId");
  if (!safeAdapterId(adapterIdValue)) {
    return fail("WALLET_ADAPTER_FIELD_INVALID", "adapters[].adapterId");
  }
  const adapterId = adapterIdValue;
  const enabled = ownValue(value, "enabled");
  const label = ownValue(value, "label");
  const recommended = ownValue(value, "recommended");
  if (
    typeof enabled !== "boolean"
    || typeof label !== "string"
    || label.length === 0
    || label.length > WALLET_ADAPTER_LABEL_MAX_LENGTH
    || /[\u0000-\u001f\u007f]/.test(label)
    || typeof recommended !== "boolean"
    || (recommended && !enabled)
  ) {
    return fail("WALLET_ADAPTER_FIELD_INVALID", "adapters[]", adapterId);
  }

  const packageGate = packageGateByAdapterId.get(adapterId);
  if (!packageGate) {
    return fail("WALLET_ADAPTER_PACKAGE_UNAVAILABLE", "adapters[].adapterId", adapterId);
  }

  const runtimeStatus = runtimeAvailability[adapterId];
  const effectivelyAvailable = enabled
    && packageGate.status === "candidate"
    && runtimeStatus === "available"
    && serverBindingIds.has(adapterId);

  return Object.freeze({
    adapterId,
    enabled,
    label,
    packageName: packageGate.packageName,
    recommended,
    status: enabled
      ? effectivelyAvailable
        ? "available"
        : "unavailable"
      : packageGate.status === "unavailable" || runtimeStatus === "unavailable"
        ? "unavailable"
        : "disabled",
  });
};

const createConfig = (
  status: WalletAdapterConfigStatus,
  adapters: readonly BrowserWalletAdapterConfigEntry[] = [],
  diagnostics: readonly WalletAdapterConfigDiagnostic[] = [],
): WalletAdapterConfig => Object.freeze({
  adapters: Object.freeze([...adapters]),
  diagnostics: Object.freeze([...diagnostics]),
  enabled: status === "ready",
  status,
  valid: status !== "invalid",
});

export const resolveWalletAdapterConfig = ({
  env,
  jsonParser = JSON.parse,
  runtimeAvailability = {},
  serverBindingIds = [],
  traceId: requestedTraceId,
}: ResolveWalletAdapterConfigOptions): WalletAdapterConfig => {
  const traceId = safeTraceId(requestedTraceId);

  try {
    if (!parseGlobalEnablement(env.VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED)) {
      return createConfig("disabled");
    }

    const bindingIds = new Set(serverBindingIds);
    const adapters = parseEntries(
      env.VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON,
      jsonParser,
    ).map((entry) => parseEntry(entry, runtimeAvailability, bindingIds));
    if (new Set(adapters.map(({ adapterId }) => adapterId)).size !== adapters.length) {
      return fail("WALLET_ADAPTER_ID_CONFLICT", "adapters[].adapterId");
    }
    if (adapters.filter(({ recommended }) => recommended).length > 1) {
      return fail("WALLET_ADAPTER_RECOMMENDED_CONFLICT", "adapters[].recommended");
    }

    return createConfig(
      "ready",
      [...adapters].sort((left, right) => left.adapterId.localeCompare(right.adapterId)),
    );
  } catch (error) {
    const failure = error instanceof WalletAdapterConfigFailure
      ? error
      : new WalletAdapterConfigFailure("WALLET_ADAPTER_JSON_INVALID", "config");
    const safeDiagnostic: WalletAdapterConfigDiagnostic = Object.freeze({
      ...(failure.adapterId === undefined ? {} : { adapterId: failure.adapterId }),
      code: failure.code,
      field: failure.field,
      severity: "error",
      traceId,
    });

    return createConfig("invalid", [], [safeDiagnostic]);
  }
};

export const summarizeWalletAdapterConfig = (
  config: WalletAdapterConfig,
): WalletAdapterConfigSummary => Object.freeze({
  adapterCount: config.adapters.length,
  enabledAdapterIds: Object.freeze(
    config.adapters.filter(({ enabled }) => enabled).map(({ adapterId }) => adapterId),
  ),
  recommendedAdapterId: config.adapters.find(({ recommended }) => recommended)?.adapterId,
  status: config.status,
  unavailableAdapterIds: Object.freeze(
    config.adapters.filter(({ status }) => status === "unavailable").map(({ adapterId }) => adapterId),
  ),
});

export const loadWalletAdapterModule = async <TModule>({
  adapterId,
  loader,
  traceId: requestedTraceId,
}: {
  readonly adapterId: string;
  readonly loader: () => Promise<TModule>;
  readonly traceId?: string;
}): Promise<WalletAdapterModuleLoadResult<TModule>> => {
  const traceId = safeTraceId(requestedTraceId);
  const resultAdapterId = safeAdapterId(adapterId) ? adapterId : "unknown";
  const packageGate = packageGateByAdapterId.get(resultAdapterId);

  if (!packageGate || packageGate.status !== "candidate" || packageGate.viteBundle !== "passed") {
    return Object.freeze({
      adapterId: resultAdapterId,
      code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE",
      status: "unavailable",
      traceId,
    });
  }

  try {
    const loadedModule = await loader();
    if (loadedModule === null || loadedModule === undefined) {
      throw new Error("unavailable");
    }

    return Object.freeze({ adapterId: resultAdapterId, module: loadedModule, status: "available" });
  } catch {
    return Object.freeze({
      adapterId: resultAdapterId,
      code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE",
      status: "unavailable",
      traceId,
    });
  }
};
