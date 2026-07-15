import {
  containsUnsafeProviderHttpRuntimeMaterial,
  redactProviderHttpRuntimeValue,
} from "./providerHttpRuntimeRedaction";
import type {
  CreateProviderHttpRuntimeSummaryOptions,
  ProviderHttpBindingCompatibilityInput,
  ProviderHttpBindingCompatibilityDiagnosticCode,
  ProviderHttpBindingCompatibilitySummary,
  ProviderEndpointRolloutDiagnostic,
  ProviderEndpointRolloutSummary,
  ProviderEndpointRolloutStatus,
  ProviderHttpActivationStatus,
  ProviderHttpDiagnostic,
  ProviderHttpDiagnosticCode,
  ProviderHttpDiagnosticSeverity,
  ProviderHttpDownstreamLiveFlags,
  ProviderHttpEndpointCategory,
  ProviderHttpEndpointEntry,
  ProviderHttpProviderFamily,
  ProviderHttpPreconditionArea,
  ProviderHttpProductionPrecondition,
  ProviderHttpRuntimeProfileId,
  ProviderHttpRuntimeStatus,
  ProviderHttpRuntimeSummary,
  ProviderHttpVerificationType,
} from "./providerHttpRuntimeTypes";

const RUNTIME_ID = "campaign-os-provider-http-client-runtime" as const;

interface ProviderHttpSupportedMappingProfile {
  category: ProviderHttpEndpointCategory;
  responseMappingId: string;
  verificationType: ProviderHttpVerificationType;
}

const supportedMappingProfileByRequestId = new Map<string, ProviderHttpSupportedMappingProfile>([
  [
    "provider-http-request-map:on-chain-indexer-v1",
    {
      category: "indexer",
      responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
      verificationType: "ON_CHAIN",
    },
  ],
  [
    "provider-http-request-map:dapp-api-status-v1",
    {
      category: "dapp_api",
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      verificationType: "DAPP_API",
    },
  ],
]);

const supportedResponseMappingIds = new Set(
  [...supportedMappingProfileByRequestId.values()].map((profile) => profile.responseMappingId),
);

const compatibilityDiagnosticByRolloutStatus = new Map<
  Exclude<ProviderEndpointRolloutStatus, "enabled">,
  ProviderHttpBindingCompatibilityDiagnosticCode
>([
  ["blocked", "PROVIDER_HTTP_BINDING_ENDPOINT_BLOCKED"],
  ["deferred", "PROVIDER_HTTP_BINDING_ENDPOINT_DEFERRED"],
  ["disabled", "PROVIDER_HTTP_BINDING_ENDPOINT_DISABLED"],
]);

export const createProviderHttpDownstreamLiveFlags = (): ProviderHttpDownstreamLiveFlags => ({
  alternateQueuePublishing: false,
  analyticsIngestion: false,
  contractCalls: false,
  liveTelemetryExport: false,
  objectStorageWrites: false,
  renderedUiBehavior: false,
  rewardDistribution: false,
  schedulerExecution: false,
});

export const providerHttpRuntimeProductionPreconditions: ProviderHttpProductionPrecondition[] = [
  precondition(
    "activation",
    "PROVIDER_HTTP_RUNTIME_ACTIVATION_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT",
    "provider-http-runtime-activation",
    "Explicit provider HTTP runtime activation is required before provider HTTP calls can advance.",
  ),
  precondition(
    "registry",
    "PROVIDER_HTTP_ENDPOINT_REGISTRY_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF",
    "provider-http-endpoint-registry",
    "Provider HTTP endpoint registry reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "endpoint",
    "PROVIDER_HTTP_ENDPOINT_REFERENCE_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF",
    "provider-http-endpoint-reference",
    "Provider HTTP endpoint reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "credential",
    "PROVIDER_HTTP_CREDENTIAL_REFERENCE_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF",
    "provider-http-credential-reference",
    "Provider HTTP credential reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "header",
    "PROVIDER_HTTP_HEADER_REFERENCE_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF",
    "provider-http-header-reference",
    "Provider HTTP header reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "transport",
    "PROVIDER_HTTP_TRANSPORT_SEAM_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM",
    "provider-http-transport-seam",
    "Injected provider HTTP transport seam is required before provider HTTP calls can advance.",
  ),
  precondition(
    "timeout",
    "PROVIDER_HTTP_TIMEOUT_POLICY_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY",
    "provider-http-timeout-policy",
    "Provider HTTP timeout policy is required before provider HTTP calls can advance.",
  ),
  precondition(
    "response_mapping",
    "PROVIDER_HTTP_RESPONSE_MAPPING_POLICY_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY",
    "provider-http-response-mapping-policy",
    "Provider HTTP response mapping policy is required before provider HTTP calls can advance.",
  ),
  precondition(
    "redaction",
    "PROVIDER_HTTP_REDACTION_POLICY_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY",
    "provider-http-redaction-policy",
    "Provider HTTP redaction policy is required before provider HTTP calls can advance.",
  ),
  precondition(
    "worker_queue",
    "PROVIDER_HTTP_QUEUE_WORKER_HANDOFF_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF",
    "provider-http-queue-worker-handoff",
    "Queue and worker handoff reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "idempotency",
    "PROVIDER_HTTP_IDEMPOTENCY_REFERENCE_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF",
    "provider-http-idempotency-reference",
    "Idempotency reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "lease",
    "PROVIDER_HTTP_LEASE_REFERENCE_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF",
    "provider-http-lease-reference",
    "Lease reference is required before provider HTTP calls can advance.",
  ),
  precondition(
    "runbook",
    "PROVIDER_HTTP_RUNBOOK_MISSING",
    "CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF",
    "provider-http-runbook",
    "Operator runbook reference is required before provider HTTP calls can advance.",
  ),
];

export const providerHttpEndpointRegistry: ProviderHttpEndpointEntry[] = [
  endpoint({
    category: "indexer",
    credentialRef: "credential-ref:provider-http-indexer",
    endpointId: "aefinder-indexer-query",
    headerRefs: ["header-ref:provider-http-indexer-auth", "header-ref:provider-http-trace"],
    label: "AeFinder indexer query",
    method: "POST",
    providerFamily: "aefinder",
    providerGroupId: "aefinder-indexers",
    requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
    responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
    retryPolicyRef: "retry-policy:provider-http-indexer-backoff",
    supportedVerificationTypes: ["ON_CHAIN"],
    timeoutPolicyRef: "timeout-policy:provider-http-indexer-2500ms",
    urlTemplateRef: "provider.endpoint.aefinder.indexer.url",
  }),
  endpoint({
    category: "indexer",
    credentialRef: "credential-ref:provider-http-indexer",
    endpointId: "aelfscan-indexer-query",
    headerRefs: ["header-ref:provider-http-indexer-auth", "header-ref:provider-http-trace"],
    label: "AelfScan indexer query",
    method: "GET",
    providerFamily: "aelfscan",
    providerGroupId: "aelfscan-indexers",
    requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
    responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
    retryPolicyRef: "retry-policy:provider-http-indexer-backoff",
    supportedVerificationTypes: ["ON_CHAIN"],
    timeoutPolicyRef: "timeout-policy:provider-http-indexer-2500ms",
    urlTemplateRef: "provider.endpoint.aelfscan.indexer.url",
  }),
  endpoint({
    category: "indexer",
    credentialRef: "credential-ref:provider-http-indexer",
    endpointId: "aefinder-aelfscan-indexer-query",
    headerRefs: ["header-ref:provider-http-indexer-auth", "header-ref:provider-http-trace"],
    label: "AeFinder/AelfScan indexer query",
    method: "POST",
    providerFamily: "aefinder",
    providerGroupId: "aefinder-aelfscan-indexers",
    requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
    responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
    retryPolicyRef: "retry-policy:provider-http-indexer-backoff",
    supportedVerificationTypes: ["ON_CHAIN"],
    timeoutPolicyRef: "timeout-policy:provider-http-indexer-2500ms",
    urlTemplateRef: "provider.endpoint.aefinder_aelfscan.indexer.url",
  }),
  endpoint({
    category: "dapp_api",
    credentialRef: "credential-ref:provider-http-dapp-api",
    endpointId: "dapp-api-verification-status",
    headerRefs: ["header-ref:provider-http-dapp-auth", "header-ref:provider-http-trace"],
    label: "dApp API verification status",
    method: "GET",
    providerFamily: "ebridge",
    providerGroupId: "dapp-api-adapters",
    requestMappingId: "provider-http-request-map:dapp-api-status-v1",
    responseMappingId: "provider-http-response-map:dapp-api-status-v1",
    retryPolicyRef: "retry-policy:provider-http-dapp-backoff",
    supportedVerificationTypes: ["DAPP_API"],
    timeoutPolicyRef: "timeout-policy:provider-http-dapp-2500ms",
    urlTemplateRef: "provider.endpoint.dapp_api.verification_status.url",
  }),
  ...[
    ["awaken", "Awaken swap/liquidity verification"],
    ["forest-schrodinger", "Forest/Schrodinger NFT verification"],
    ["tmrwdao", "TMRWDAO governance verification"],
    ["daipp", "daipp interaction verification"],
    ["pay", "aelf Pay task verification"],
    ["forecast", "aelf Forecast task verification"],
    ["portfolio", "Portfolio activity verification"],
  ].map(([providerFamily, label]) =>
    endpoint({
      category: "dapp_api",
      credentialRef: `credential-ref:provider-http-${providerFamily}`,
      endpointId: `${providerFamily}-dapp-api-verification-status`,
      headerRefs: [`header-ref:provider-http-${providerFamily}-auth`, "header-ref:provider-http-trace"],
      label,
      method: "GET",
      providerFamily: providerFamily as ProviderHttpProviderFamily,
      providerGroupId: `${providerFamily}-dapp-api-adapters`,
      requestMappingId: `provider-http-request-map:${providerFamily}-status-v1`,
      responseMappingId: `provider-http-response-map:${providerFamily}-status-v1`,
      retryPolicyRef: `retry-policy:provider-http-${providerFamily}-backoff`,
      supportedVerificationTypes: ["DAPP_API"],
      timeoutPolicyRef: "timeout-policy:provider-http-dapp-2500ms",
      urlTemplateRef: `provider.endpoint.${providerFamily.replace(/-/g, "_")}.dapp_api.url`,
    })
  ),
  endpoint({
    category: "social_api",
    credentialRef: "credential-ref:provider-http-social-api",
    endpointId: "social-api-verification-status",
    headerRefs: ["header-ref:provider-http-social-auth", "header-ref:provider-http-trace"],
    label: "Social API verification status",
    method: "GET",
    providerFamily: "social-api",
    providerGroupId: "social-api-adapters",
    requestMappingId: "provider-http-request-map:social-api-status-v1",
    responseMappingId: "provider-http-response-map:social-api-status-v1",
    retryPolicyRef: "retry-policy:provider-http-social-backoff",
    rolloutStatus: "deferred",
    supportedVerificationTypes: ["SOCIAL"],
    timeoutPolicyRef: "timeout-policy:provider-http-social-2500ms",
    urlTemplateRef: "provider.endpoint.social_api.verification_status.url",
  }),
  endpoint({
    category: "ai_provider",
    credentialRef: "credential-ref:provider-http-ai-provider",
    endpointId: "ai-provider-verification-status",
    headerRefs: ["header-ref:provider-http-ai-auth", "header-ref:provider-http-trace"],
    label: "AI provider verification status",
    method: "POST",
    providerFamily: "ai-provider",
    providerGroupId: "ai-provider-adapters",
    requestMappingId: "provider-http-request-map:ai-provider-status-v1",
    responseMappingId: "provider-http-response-map:ai-provider-status-v1",
    retryPolicyRef: "retry-policy:provider-http-ai-backoff",
    rolloutStatus: "deferred",
    supportedVerificationTypes: ["MANUAL"],
    timeoutPolicyRef: "timeout-policy:provider-http-ai-2500ms",
    urlTemplateRef: "provider.endpoint.ai_provider.verification_status.url",
  }),
];

export const providerHttpVerificationBindingExamples = {
  "aefinder-aelfscan": {
    binding: {
      id: "aefinder-aelfscan-on-chain",
      verificationType: "ON_CHAIN",
    },
    enabled: false,
    endpoint: {
      endpointId: "aefinder-aelfscan-indexer-query",
      providerFamily: "aefinder",
      providerGroupId: "aefinder-aelfscan-indexers",
      requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
      responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
    },
  },
  ebridge: {
    binding: {
      id: "ebridge-dapp-api",
      verificationType: "DAPP_API",
    },
    enabled: false,
    endpoint: {
      endpointId: "dapp-api-verification-status",
      providerFamily: "ebridge",
      providerGroupId: "dapp-api-adapters",
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
    },
  },
  awaken: {
    binding: {
      id: "awaken-dapp-api",
      verificationType: "DAPP_API",
    },
    enabled: false,
    endpoint: {
      endpointId: "awaken-dapp-api-verification-status",
      providerFamily: "awaken",
      providerGroupId: "awaken-dapp-api-adapters",
      requestMappingId: "provider-http-request-map:awaken-status-v1",
      responseMappingId: "provider-http-response-map:awaken-status-v1",
    },
  },
  "forest-schrodinger": {
    binding: {
      id: "forest-schrodinger-nft-dapp-api",
      verificationType: "DAPP_API",
    },
    enabled: false,
    endpoint: {
      endpointId: "forest-schrodinger-dapp-api-verification-status",
      providerFamily: "forest-schrodinger",
      providerGroupId: "forest-schrodinger-dapp-api-adapters",
      requestMappingId: "provider-http-request-map:forest-schrodinger-status-v1",
      responseMappingId: "provider-http-response-map:forest-schrodinger-status-v1",
    },
  },
  tmrwdao: {
    binding: {
      id: "tmrwdao-dapp-api",
      verificationType: "DAPP_API",
    },
    enabled: false,
    endpoint: {
      endpointId: "tmrwdao-dapp-api-verification-status",
      providerFamily: "tmrwdao",
      providerGroupId: "tmrwdao-dapp-api-adapters",
      requestMappingId: "provider-http-request-map:tmrwdao-status-v1",
      responseMappingId: "provider-http-response-map:tmrwdao-status-v1",
    },
  },
  daipp: {
    binding: {
      id: "daipp-dapp-api",
      verificationType: "DAPP_API",
    },
    enabled: false,
    endpoint: {
      endpointId: "daipp-dapp-api-verification-status",
      providerFamily: "daipp",
      providerGroupId: "daipp-dapp-api-adapters",
      requestMappingId: "provider-http-request-map:daipp-status-v1",
      responseMappingId: "provider-http-response-map:daipp-status-v1",
    },
  },
} as const satisfies Readonly<Record<string, ProviderHttpBindingCompatibilityInput>>;

interface IndexedProviderHttpEndpoint {
  entry: ProviderHttpEndpointEntry;
  verificationTypes: ReadonlySet<ProviderHttpVerificationType>;
}

interface ProviderHttpEndpointIndex {
  duplicateEndpointIds: ReadonlySet<string>;
  endpointsById: ReadonlyMap<string, IndexedProviderHttpEndpoint>;
}

const providerHttpEndpointIndexCache = new WeakMap<
  readonly ProviderHttpEndpointEntry[],
  ProviderHttpEndpointIndex
>();

export const listProviderHttpEndpointEntries = (): ProviderHttpEndpointEntry[] =>
  providerHttpEndpointRegistry.map(cloneEndpointEntry);

export const findProviderHttpEndpointById = (
  endpointId: string,
  registry: readonly ProviderHttpEndpointEntry[] = providerHttpEndpointRegistry,
): ProviderHttpEndpointEntry | undefined =>
  getProviderHttpEndpointIndex(registry).endpointsById.get(endpointId)?.entry;

export const findProviderHttpEndpointForVerification = (
  input: {
    endpointId: string;
    providerGroupId: string;
    verificationType: ProviderHttpVerificationType;
  },
  registry: readonly ProviderHttpEndpointEntry[] = providerHttpEndpointRegistry,
): ProviderHttpEndpointEntry | undefined => {
  const indexedEndpoint = getProviderHttpEndpointIndex(registry).endpointsById.get(
    input.endpointId,
  );
  const endpoint = indexedEndpoint?.entry;

  if (!endpoint || !indexedEndpoint) {
    return undefined;
  }

  if (endpoint.providerGroupId !== input.providerGroupId) {
    return undefined;
  }

  if (endpoint.rolloutStatus !== "enabled") {
    return undefined;
  }

  return indexedEndpoint.verificationTypes.has(input.verificationType)
    ? endpoint
    : undefined;
};

export const validateProviderHttpVerificationBindingCompatibility = (
  input: ProviderHttpBindingCompatibilityInput,
  registry: readonly ProviderHttpEndpointEntry[] = providerHttpEndpointRegistry,
): ProviderHttpBindingCompatibilitySummary => {
  const safeInput = input && typeof input === "object" ? input : undefined;
  const summaryIds = createCompatibilitySummaryIds(safeInput);
  const diagnosticCodes = new Set<ProviderHttpBindingCompatibilityDiagnosticCode>();

  if (!safeInput || !hasSafeProviderHttpBindingCompatibilityInputShape(safeInput)) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_INVALID_SHAPE");
    return compatibilitySummary(summaryIds, "incompatible", diagnosticCodes);
  }

  if (!safeInput.enabled) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_DISABLED");
    return compatibilitySummary(summaryIds, "disabled", diagnosticCodes);
  }

  const binding = safeInput.binding;
  const endpointBinding = safeInput.endpoint;
  const endpointIndex = getProviderHttpEndpointIndex(registry);
  const indexedEndpoint = endpointIndex.endpointsById.get(endpointBinding.endpointId);

  if (!indexedEndpoint) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_ENDPOINT_NOT_FOUND");
    return compatibilitySummary(summaryIds, "incompatible", diagnosticCodes);
  }

  const endpoint = indexedEndpoint.entry;

  if (endpointIndex.duplicateEndpointIds.has(endpointBinding.endpointId)) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_ENDPOINT_DUPLICATED");
  }

  if (endpoint.rolloutStatus !== "enabled") {
    diagnosticCodes.add(compatibilityDiagnosticByRolloutStatus.get(endpoint.rolloutStatus)!);
  }

  if (endpoint.providerFamily !== endpointBinding.providerFamily) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_FAMILY_MISMATCH");
  }

  if (endpoint.providerGroupId !== endpointBinding.providerGroupId) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_GROUP_MISMATCH");
  }

  if (!indexedEndpoint.verificationTypes.has(binding.verificationType)) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_VERIFICATION_TYPE_MISMATCH");
  }

  if (endpoint.requestMappingId !== endpointBinding.requestMappingId) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_REQUEST_MAPPING_MISMATCH");
  }

  if (endpoint.responseMappingId !== endpointBinding.responseMappingId) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_MISMATCH");
  }

  const mappingProfile = supportedMappingProfileByRequestId.get(endpointBinding.requestMappingId);
  const responseMappingSupported = supportedResponseMappingIds.has(
    endpointBinding.responseMappingId,
  );

  if (!mappingProfile) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_REQUEST_MAPPING_UNSUPPORTED");
  }

  if (!responseMappingSupported) {
    diagnosticCodes.add("PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_UNSUPPORTED");
  }

  if (mappingProfile) {
    if (
      responseMappingSupported
      && mappingProfile.responseMappingId !== endpointBinding.responseMappingId
    ) {
      diagnosticCodes.add("PROVIDER_HTTP_BINDING_MAPPING_PAIR_MISMATCH");
    }

    if (mappingProfile.verificationType !== binding.verificationType) {
      diagnosticCodes.add("PROVIDER_HTTP_BINDING_TYPE_MAPPING_MISMATCH");
    }

    if (mappingProfile.category !== endpoint.category) {
      diagnosticCodes.add("PROVIDER_HTTP_BINDING_ENDPOINT_CATEGORY_MISMATCH");
    }
  }

  return compatibilitySummary(
    summaryIds,
    diagnosticCodes.size === 0 ? "compatible" : "incompatible",
    diagnosticCodes,
  );
};

type ProviderHttpCompatibilitySummaryIds = Omit<
  ProviderHttpBindingCompatibilitySummary,
  "diagnosticCodes" | "diagnosticCount" | "status"
>;

function getProviderHttpEndpointIndex(
  registry: readonly ProviderHttpEndpointEntry[],
): ProviderHttpEndpointIndex {
  const cachedIndex = providerHttpEndpointIndexCache.get(registry);

  if (cachedIndex) {
    return cachedIndex;
  }

  const duplicateEndpointIds = new Set<string>();
  const endpointsById = new Map<string, IndexedProviderHttpEndpoint>();

  registry.forEach((entry) => {
    if (endpointsById.has(entry.endpointId)) {
      duplicateEndpointIds.add(entry.endpointId);
      return;
    }

    endpointsById.set(entry.endpointId, {
      entry,
      verificationTypes: new Set(entry.supportedVerificationTypes),
    });
  });

  const index = { duplicateEndpointIds, endpointsById };
  providerHttpEndpointIndexCache.set(registry, index);
  return index;
}

function createCompatibilitySummaryIds(
  input?: Partial<ProviderHttpBindingCompatibilityInput>,
): ProviderHttpCompatibilitySummaryIds {
  return {
    bindingId: safeCompatibilityId(input?.binding?.id, "unresolved-binding-id"),
    endpointId: safeCompatibilityId(input?.endpoint?.endpointId, "unresolved-endpoint-id"),
    providerFamily: safeCompatibilityId(
      input?.endpoint?.providerFamily,
      "unresolved-provider-family",
    ),
    providerGroupId: safeCompatibilityId(
      input?.endpoint?.providerGroupId,
      "unresolved-provider-group-id",
    ),
    requestMappingId: safeCompatibilityId(
      input?.endpoint?.requestMappingId,
      "unresolved-request-mapping-id",
    ),
    responseMappingId: safeCompatibilityId(
      input?.endpoint?.responseMappingId,
      "unresolved-response-mapping-id",
    ),
    verificationType: safeCompatibilityId(
      input?.binding?.verificationType,
      "unresolved-verification-type",
    ),
  };
}

function compatibilitySummary(
  ids: ProviderHttpCompatibilitySummaryIds,
  status: ProviderHttpBindingCompatibilitySummary["status"],
  diagnosticCodes: ReadonlySet<ProviderHttpBindingCompatibilityDiagnosticCode>,
): ProviderHttpBindingCompatibilitySummary {
  return {
    ...ids,
    diagnosticCodes: [...diagnosticCodes],
    diagnosticCount: diagnosticCodes.size,
    status,
  };
}

function hasSafeProviderHttpBindingCompatibilityInputShape(
  input: ProviderHttpBindingCompatibilityInput,
): boolean {
  return typeof input.enabled === "boolean"
    && Boolean(input.binding)
    && typeof input.binding === "object"
    && Boolean(input.endpoint)
    && typeof input.endpoint === "object"
    && [
      input.binding.id,
      input.binding.verificationType,
      input.endpoint.endpointId,
      input.endpoint.providerFamily,
      input.endpoint.providerGroupId,
      input.endpoint.requestMappingId,
      input.endpoint.responseMappingId,
    ].every(isSafeCompatibilityId);
}

function safeCompatibilityId(value: unknown, fallback: string): string {
  return isSafeCompatibilityId(value) ? value : fallback;
}

function isSafeCompatibilityId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 160
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    && !containsUnsafeProviderHttpRuntimeMaterial(value);
}

export const createProviderHttpRuntimeSummary = (
  options: CreateProviderHttpRuntimeSummaryOptions = {},
): ProviderHttpRuntimeSummary => {
  const env = options.env ?? {};
  const endpointRegistry = (options.endpointRegistry ?? providerHttpEndpointRegistry).map(
    cloneEndpointEntry,
  );
  const profileResolution = resolveProfile(options.profileId);
  const activationStatus = resolveActivationStatus(profileResolution.profileId, env);
  const transportProvided = options.transportProvided === true;
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...createUnsafeConfigDiagnostics(env),
    ...createEndpointRolloutDiagnostics(endpointRegistry),
    ...(profileResolution.profileId === "production-required"
      ? createProductionDiagnostics(env, endpointRegistry, transportProvided)
      : []),
  ];
  const endpointRollout = createProviderEndpointRolloutSummary(endpointRegistry);
  const blockerCount = diagnostics.filter((diagnostic) => diagnostic.severity === "blocker")
    .length;
  const status = resolveRuntimeStatus(
    profileResolution.profileId,
    blockerCount,
    activationStatus,
  );

  return {
    activationStatus,
    blockerCount,
    configuredCategories: unique(endpointRegistry.map((endpoint) => endpoint.category)),
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    diagnostics,
    downstreamLiveFlags: createProviderHttpDownstreamLiveFlags(),
    endpointCount: endpointRegistry.length,
    endpointRollout,
    endpointRegistry,
    id: RUNTIME_ID,
    liveHttpCallsAttempted: false,
    preconditions: providerHttpRuntimeProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    requiredConfigKeys: getRequiredConfigKeys(),
    status,
    transportProvided,
    valid: profileResolution.valid
      && blockerCount === 0
      && (profileResolution.profileId !== "production-required" || status === "activated"),
  };
};

function endpoint(
  entry: Omit<ProviderHttpEndpointEntry, "requiredConfigKeys" | "rolloutStatus"> & {
    requiredConfigKeys?: string[];
    rolloutStatus?: ProviderEndpointRolloutStatus;
  },
): ProviderHttpEndpointEntry {
  return {
    ...entry,
    requiredConfigKeys: entry.requiredConfigKeys ?? endpointRequiredConfigKeys(entry.providerFamily),
    rolloutStatus: entry.rolloutStatus ?? "enabled",
  };
}

function precondition(
  area: ProviderHttpPreconditionArea,
  diagnosticCode: ProviderHttpDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
): ProviderHttpProductionPrecondition {
  return {
    area,
    diagnosticCode,
    field,
    id,
    message,
    requiredBeforeProduction: true,
    requiredConfigKeys,
    status: "blocked",
  };
}

function resolveProfile(profileId?: string): {
  diagnostics: ProviderHttpDiagnostic[];
  profileId: ProviderHttpRuntimeProfileId;
  valid: boolean;
} {
  if (
    !profileId
    || profileId === "local-review"
    || profileId === "staging-scaffold"
    || profileId === "production-required"
  ) {
    return {
      diagnostics: [],
      profileId: (profileId as ProviderHttpRuntimeProfileId | undefined) ?? "local-review",
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_PROVIDER_HTTP_PROFILE",
        "profileId",
        "Unknown provider HTTP runtime profile.",
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveActivationStatus(
  profileId: ProviderHttpRuntimeProfileId,
  env: Record<string, unknown>,
): ProviderHttpActivationStatus {
  if (profileId === "local-review") {
    return "disabled";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return env.CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT === "explicitly-enabled"
    ? "explicitly_enabled"
    : "activation_required";
}

function resolveRuntimeStatus(
  profileId: ProviderHttpRuntimeProfileId,
  blockerCount: number,
  activationStatus: ProviderHttpActivationStatus,
): ProviderHttpRuntimeStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  if (profileId === "production-required") {
    return activationStatus === "explicitly_enabled" ? "activated" : "blocked";
  }

  return "disabled";
}

function createProductionDiagnostics(
  env: Record<string, unknown>,
  endpointRegistry: readonly ProviderHttpEndpointEntry[],
  transportProvided: boolean,
): ProviderHttpDiagnostic[] {
  return providerHttpRuntimeProductionPreconditions
    .filter((precondition) => {
      if (precondition.diagnosticCode === "PROVIDER_HTTP_RUNTIME_ACTIVATION_MISSING") {
        return env.CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT !== "explicitly-enabled";
      }

      if (precondition.diagnosticCode === "PROVIDER_HTTP_ENDPOINT_REGISTRY_MISSING") {
        return endpointRegistry.length === 0
          || precondition.requiredConfigKeys.some((key) => !hasUsableConfigValue(env[key]));
      }

      if (precondition.diagnosticCode === "PROVIDER_HTTP_TRANSPORT_SEAM_MISSING") {
        return !transportProvided
          || precondition.requiredConfigKeys.some((key) => !hasUsableConfigValue(env[key]));
      }

      return precondition.requiredConfigKeys.some((key) => !hasUsableConfigValue(env[key]));
    })
    .map((precondition) =>
      diagnostic(precondition.diagnosticCode, precondition.field, precondition.message),
    );
}

function createUnsafeConfigDiagnostics(env: Record<string, unknown>): ProviderHttpDiagnostic[] {
  const unsafeFields = Object.entries(env)
    .filter(([key, value]) =>
      key.startsWith("CAMPAIGN_OS_PROVIDER_HTTP")
      && containsUnsafeProviderHttpRuntimeMaterial(value)
    )
    .map(([key]) => key);

  return unsafeFields.length === 0
    ? []
    : [
      diagnostic(
        "PROVIDER_HTTP_UNSAFE_CONFIG",
        "providerHttpConfig",
        "Provider HTTP runtime configuration contains unsafe raw material and was redacted.",
        "blocker",
        unsafeFields,
      ),
    ];
}

function createProviderEndpointRolloutSummary(
  endpointRegistry: readonly ProviderHttpEndpointEntry[],
): ProviderEndpointRolloutSummary {
  const diagnostics = createEndpointRolloutDiagnostics(endpointRegistry);

  return {
    blockedCount: countByRolloutStatus(endpointRegistry, "blocked"),
    configuredCategories: unique(endpointRegistry.map((endpoint) => endpoint.category)),
    deferredCount: countByRolloutStatus(endpointRegistry, "deferred"),
    diagnosticCodes: unique(diagnostics.map((diagnostic) => diagnostic.code)),
    diagnostics,
    disabledCount: countByRolloutStatus(endpointRegistry, "disabled"),
    enabledCount: countByRolloutStatus(endpointRegistry, "enabled"),
    endpointCount: endpointRegistry.length,
    providerFamilies: unique(endpointRegistry.map((endpoint) => endpoint.providerFamily)),
    requiredConfigKeys: unique(endpointRegistry.flatMap((endpoint) => endpoint.requiredConfigKeys)),
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "blocker"),
  };
}

function createEndpointRolloutDiagnostics(
  endpointRegistry: readonly ProviderHttpEndpointEntry[],
): ProviderEndpointRolloutDiagnostic[] {
  return endpointRegistry.flatMap((endpointEntry) => {
    const diagnostics: ProviderEndpointRolloutDiagnostic[] = [];
    const unsafeFields = [
      "credentialRef",
      "requestMappingId",
      "responseMappingId",
      "retryPolicyRef",
      "timeoutPolicyRef",
      "urlTemplateRef",
      ...endpointEntry.headerRefs.map((_, index) => `headerRefs.${index}`),
      ...endpointEntry.requiredConfigKeys.map((_, index) => `requiredConfigKeys.${index}`),
    ].filter((field) => containsUnsafeProviderHttpRuntimeMaterial(readEndpointField(endpointEntry, field)));

    if (unsafeFields.length > 0) {
      diagnostics.push(
        endpointRolloutDiagnostic(
          "PROVIDER_HTTP_ENDPOINT_UNSAFE_CONFIG",
          endpointEntry.endpointId,
          "endpointRegistry",
          "Provider HTTP endpoint rollout metadata contains unsafe raw material and was redacted.",
          "blocker",
          unsafeFields.map((field) => `${endpointEntry.endpointId}.${field}`),
        ),
      );
    }

    if (endpointEntry.rolloutStatus === "blocked") {
      diagnostics.push(
        endpointRolloutDiagnostic(
          "PROVIDER_HTTP_ENDPOINT_BLOCKED",
          endpointEntry.endpointId,
          "rolloutStatus",
          "Provider HTTP endpoint rollout is blocked until required references are configured.",
        ),
      );
    }

    if (
      endpointEntry.rolloutStatus === "enabled"
      && endpointEntry.requiredConfigKeys.some((key) => key.trim().length === 0)
    ) {
      diagnostics.push(
        endpointRolloutDiagnostic(
          "PROVIDER_HTTP_ENDPOINT_REQUIRED_CONFIG_MISSING",
          endpointEntry.endpointId,
          "requiredConfigKeys",
          "Provider HTTP endpoint rollout requires non-empty config references.",
        ),
      );
    }

    return diagnostics;
  });
}

function endpointRolloutDiagnostic(
  code: ProviderEndpointRolloutDiagnostic["code"],
  endpointId: string,
  field: string,
  message: string,
  severity: ProviderHttpDiagnosticSeverity = "blocker",
  redactedFields: string[] = [],
): ProviderEndpointRolloutDiagnostic {
  return {
    code,
    endpointId,
    field,
    message: String(redactProviderHttpRuntimeValue(message)),
    redactedFields,
    severity,
  };
}

function countByRolloutStatus(
  endpointRegistry: readonly ProviderHttpEndpointEntry[],
  status: ProviderEndpointRolloutStatus,
): number {
  return endpointRegistry.filter((endpointEntry) => endpointEntry.rolloutStatus === status).length;
}

function endpointRequiredConfigKeys(providerFamily: ProviderHttpProviderFamily): string[] {
  const normalized = providerFamily.toUpperCase().replace(/-/g, "_");

  return [
    `CAMPAIGN_OS_PROVIDER_HTTP_${normalized}_ENDPOINT_REF`,
    `CAMPAIGN_OS_PROVIDER_HTTP_${normalized}_CREDENTIAL_REF`,
    `CAMPAIGN_OS_PROVIDER_HTTP_${normalized}_HEADER_REF`,
  ];
}

function readEndpointField(endpointEntry: ProviderHttpEndpointEntry, field: string): unknown {
  if (field.startsWith("headerRefs.")) {
    return endpointEntry.headerRefs[Number(field.replace("headerRefs.", ""))];
  }

  if (field.startsWith("requiredConfigKeys.")) {
    return endpointEntry.requiredConfigKeys[Number(field.replace("requiredConfigKeys.", ""))];
  }

  return endpointEntry[field as keyof ProviderHttpEndpointEntry];
}

function hasUsableConfigValue(value: unknown): boolean {
  return typeof value === "string"
    && value.trim().length > 0
    && !containsUnsafeProviderHttpRuntimeMaterial(value);
}

function diagnostic(
  code: ProviderHttpDiagnosticCode,
  field: string,
  message: string,
  severity: ProviderHttpDiagnosticSeverity = "blocker",
  redactedFields: string[] = [],
): ProviderHttpDiagnostic {
  return {
    code,
    field,
    message: String(redactProviderHttpRuntimeValue(message)),
    redactedFields,
    severity,
  };
}

function getRequiredConfigKeys(): string[] {
  return Array.from(
    new Set([
      ...providerHttpRuntimeProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
      ...providerHttpEndpointRegistry.flatMap((item) => item.requiredConfigKeys),
    ]),
  );
}

function cloneEndpointEntry(entry: ProviderHttpEndpointEntry): ProviderHttpEndpointEntry {
  return {
    ...entry,
    headerRefs: [...entry.headerRefs],
    requiredConfigKeys: [...entry.requiredConfigKeys],
    supportedVerificationTypes: [...entry.supportedVerificationTypes],
  };
}

function unique<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}
