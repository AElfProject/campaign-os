import { createRequire } from "node:module";
import { createAdminOperatorMembershipRegistry } from "./adminOperatorMembership";
import { createAelfEoaSignatureVerifier } from "./aelfEoaSignatureVerifier";
import { authSessionRolePolicyById, type AuthSessionRoleId } from "./authSession";
import {
  resolveCampaignOsAdminReviewConfig,
  resolveCampaignOsCampaignDbConfig,
  type CampaignOsAdminOperatorRoleId,
  type CampaignOsCampaignDbPoolConfig,
} from "./config";
import {
  createPortkeyAaSignatureVerifier,
} from "./portkeyAaSignatureVerifier";
import {
  createPortkeyCaRelationEndpointResolver,
  createPortkeyCaRelationProvider,
  type PortkeyCaRelationProviderAdapter,
} from "./portkeyCaRelationProvider";
import {
  createPostgresWalletAuthenticationStore,
  type PostgresWalletAuthenticationPool,
} from "./postgresWalletAuthenticationStore";
import type {
  ResolvedWalletSessionAuthority,
  VerifiedWalletSubject,
  WalletAuthenticationClock,
  WalletProofVerifier,
} from "./walletAuthentication";
import type { WalletAuthenticationConfig } from "./walletAuthenticationConfig";
import {
  createWalletAuthenticationHttpController,
  type CreateWalletAuthenticationHttpControllerInput,
  type WalletAuthenticationAdminRevokeExecutor,
  type WalletAuthenticationAdminRevokeInput,
  type WalletAuthenticationAdminRevokeResult,
  type WalletAuthenticationHttpController,
} from "./walletAuthenticationHttp";
import {
  WalletAuthenticationRuntime,
  createWalletAuthenticationFinalWriteCoordinator,
  type CreateWalletAuthenticationRuntimeOptions,
  type RevalidateWalletAuthenticationFenceResult,
  type ResolveWalletAuthenticationAuthorizationResult,
  type WalletAuthenticationMembershipResolver,
  type WalletAuthenticationMutationRequestInput,
  type WalletAuthenticationRuntimeResource,
} from "./walletAuthenticationRuntime";
import {
  createWalletSessionCredentialService,
  createWalletSessionCsrfSecret,
  createWalletSessionRuntimeCredentialPort,
  destroyWalletSessionCsrfSecret,
} from "./walletSessionCredential";
import {
  createWalletSessionRequestSecurityPolicy,
  createWalletSessionRuntimeRequestSecurityPort,
} from "./walletSessionRequestSecurity";
import { WalletVerifierRegistry } from "./walletVerifierRegistry";

const compositionRequire = createRequire(import.meta.url);
const DEFAULT_TRACE_ID = "wallet-auth-server-composition";
const CHALLENGE_DOMAIN_PATTERN = /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+)(?::\d{1,5})?$/;
const CHALLENGE_AUDIENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const ADMIN_ROLE_IDS = Object.freeze([
  "internal_operator",
  "review_operator",
] satisfies readonly CampaignOsAdminOperatorRoleId[]);

export type WalletAuthenticationLiveAuthorityRuntime = Pick<
  WalletAuthenticationRuntime,
  "resolveAuthorization" | "revalidateFenceBeforeWrite" | "state" | "stop"
>;

export interface WalletAuthenticationServerComposition {
  readonly httpController: WalletAuthenticationHttpController;
  readonly runtime: WalletAuthenticationLiveAuthorityRuntime;
}

export interface WalletAuthenticationServerCompositionFactoryInput {
  readonly config: WalletAuthenticationConfig;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly traceId: string;
}

/** The factory must roll back partial construction before rejecting; ownership transfers on success. */
export type WalletAuthenticationServerCompositionFactory = (
  input: WalletAuthenticationServerCompositionFactoryInput,
) => WalletAuthenticationServerComposition | Promise<WalletAuthenticationServerComposition>;

export type WalletAuthenticationPostgresPoolFactory = (
  databaseUrl: string,
) => PostgresWalletAuthenticationPool;

export interface WalletAuthenticationServerCompositionDependencies {
  readonly clock?: WalletAuthenticationClock;
  readonly httpControllerFactory?: (
    input: CreateWalletAuthenticationHttpControllerInput,
  ) => WalletAuthenticationHttpController;
  readonly poolFactory?: WalletAuthenticationPostgresPoolFactory;
  readonly runtimeFactory?: (
    options: CreateWalletAuthenticationRuntimeOptions,
  ) => WalletAuthenticationRuntime;
}

export interface CreateDefaultWalletAuthenticationServerCompositionInput
  extends WalletAuthenticationServerCompositionFactoryInput {
  readonly dependencies?: WalletAuthenticationServerCompositionDependencies;
}

export type WalletAuthenticationServerCompositionErrorCode =
  | "WALLET_AUTH_COMPOSITION_CONFIG_INVALID"
  | "WALLET_AUTH_COMPOSITION_ROLLBACK_FAILED"
  | "WALLET_AUTH_COMPOSITION_START_FAILED"
  | "WALLET_AUTH_CSRF_SECRET_REQUIRED"
  | "WALLET_AUTH_ENABLED_BINDING_REQUIRED"
  | "WALLET_AUTH_ORIGIN_BINDING_AMBIGUOUS"
  | "WALLET_AUTH_ORIGIN_BINDING_INVALID"
  | "WALLET_AUTH_POSTGRES_REQUIRED"
  | "WALLET_AUTH_PRODUCTION_APPROVAL_REQUIRED";

export class WalletAuthenticationServerCompositionError extends Error {
  readonly code: WalletAuthenticationServerCompositionErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(
    code: WalletAuthenticationServerCompositionErrorCode,
    field: string,
    traceId: string,
  ) {
    super("Wallet authentication server composition is unavailable.");
    this.name = "WalletAuthenticationServerCompositionError";
    this.code = code;
    this.field = field;
    this.traceId = safeTraceId(traceId);
    delete this.stack;
  }
}

interface CurrentAdminPolicyResult {
  readonly membershipRevision: string;
  readonly roleIds: readonly CampaignOsAdminOperatorRoleId[];
  readonly status: "resolved";
}

interface CreateCurrentMembershipResolverInput {
  readonly env: Readonly<Record<string, string | undefined>>;
}

interface CreateAtomicAdminRevokeExecutorInput {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly runtime: Pick<
    WalletAuthenticationRuntime,
    "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
  >;
}

type Rollback = () => void | Promise<void>;

const safeTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    ? value
    : DEFAULT_TRACE_ID;

const fail = (
  code: WalletAuthenticationServerCompositionErrorCode,
  field: string,
  traceId: string,
): never => {
  throw new WalletAuthenticationServerCompositionError(code, field, traceId);
};

const clock: WalletAuthenticationClock = Object.freeze({
  now: () => new Date(),
});

const createDefaultPoolFactory = (
  poolConfig: CampaignOsCampaignDbPoolConfig,
): WalletAuthenticationPostgresPoolFactory => (databaseUrl) => {
  if (poolConfig.connectionString !== databaseUrl) {
    throw new TypeError("Wallet authentication PostgreSQL configuration is unavailable.");
  }
  const { Pool } = compositionRequire("pg") as typeof import("pg");
  const pool = new Pool(poolConfig);

  return Object.freeze({
    connect: async () => {
      const client = await pool.connect();
      return Object.freeze({
        query: async (text: string, values: unknown[] = []) => {
          const result = await client.query(text, values);
          return { rows: result.rows as Array<Record<string, unknown>> };
        },
        release: (destroy?: boolean) => client.release(destroy),
      });
    },
    end: async () => pool.end(),
    query: async (text: string, values: unknown[] = []) => {
      const result = await pool.query(text, values);
      return { rows: result.rows as Array<Record<string, unknown>> };
    },
  });
};

const settleWithin = async (
  operation: Promise<unknown>,
  timeoutMs: number,
): Promise<"fulfilled" | "rejected" | "timeout"> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(
        () => "fulfilled" as const,
        () => "rejected" as const,
      ),
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), Math.max(0, timeoutMs));
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const runRollback = async (
  rollbacks: readonly Rollback[],
  timeoutMs: number,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  let clean = true;
  for (const rollback of [...rollbacks].reverse()) {
    const result = await settleWithin(
      Promise.resolve().then(rollback),
      Math.max(0, deadline - Date.now()),
    );
    clean = clean && result === "fulfilled";
  }
  return clean;
};

const requireExactOriginBinding = (
  config: WalletAuthenticationConfig,
  traceId: string,
): Readonly<{ audience: string; domain: string; uri: string }> => {
  if (config.allowedOrigins.length !== 1) {
    return fail(
      "WALLET_AUTH_ORIGIN_BINDING_AMBIGUOUS",
      "allowedOrigins",
      traceId,
    );
  }
  const origin = config.allowedOrigins[0];
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return fail("WALLET_AUTH_ORIGIN_BINDING_INVALID", "allowedOrigins", traceId);
  }
  if (
    parsed.origin !== origin
    || parsed.pathname !== "/"
    || parsed.search !== ""
    || parsed.hash !== ""
    || parsed.username !== ""
    || parsed.password !== ""
  ) {
    return fail("WALLET_AUTH_ORIGIN_BINDING_INVALID", "allowedOrigins", traceId);
  }

  const audience = `campaign-os-wallet-auth:${config.environment}:${origin}`;
  if (
    parsed.host.length > 253
    || !CHALLENGE_DOMAIN_PATTERN.test(parsed.host)
    || audience.length > 256
    || !CHALLENGE_AUDIENCE_PATTERN.test(audience)
    || (parsed.protocol === "http:"
      && parsed.hostname !== "localhost"
      && parsed.hostname !== "127.0.0.1")
  ) {
    return fail("WALLET_AUTH_ORIGIN_BINDING_INVALID", "allowedOrigins", traceId);
  }

  return Object.freeze({
    audience,
    domain: parsed.host,
    uri: parsed.href,
  });
};

const assertCompositionConfig = (
  config: WalletAuthenticationConfig,
  traceId: string,
): ReadonlyArray<WalletAuthenticationConfig["bindings"][number]> => {
  if (
    !config
    || config.status !== "ready"
    || !config.valid
    || !config.enabled
    || !config.csrf.configured
  ) {
    return fail("WALLET_AUTH_COMPOSITION_CONFIG_INVALID", "config", traceId);
  }
  if (config.storeMode !== "postgres") {
    return fail("WALLET_AUTH_POSTGRES_REQUIRED", "storeMode", traceId);
  }
  const bindings = config.bindings.filter(({ enabled }) => enabled);
  if (bindings.length === 0) {
    return fail("WALLET_AUTH_ENABLED_BINDING_REQUIRED", "bindings", traceId);
  }
  if (config.environment === "production") {
    const providerById = new Map(
      config.caRelationProviders.map((provider) => [provider.id, provider]),
    );
    const unapproved = bindings.some((binding) =>
      !binding.productionApproved
      || (binding.caRelationProviderId !== undefined
        && !providerById.get(binding.caRelationProviderId)?.productionApproved)
    );
    if (!config.productionReady || !config.cookie.secure || unapproved) {
      return fail("WALLET_AUTH_PRODUCTION_APPROVAL_REQUIRED", "bindings", traceId);
    }
  }
  return Object.freeze(bindings);
};

const unique = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)]);

const resolveCurrentAdminPolicy = (
  env: Readonly<Record<string, string | undefined>>,
  subjectAddress: string,
): CurrentAdminPolicyResult => {
  const config = resolveCampaignOsAdminReviewConfig({ env });
  const registry = createAdminOperatorMembershipRegistry(config);
  const roleIds = ADMIN_ROLE_IDS.filter((requestedRole) =>
    registry.lookup({ requestedRole, subjectAddress }).authorized
  );
  return Object.freeze({
    membershipRevision: registry.health().sourceRevision,
    roleIds: Object.freeze(roleIds),
    status: "resolved" as const,
  });
};

export const createCurrentWalletAuthenticationMembershipResolver = ({
  env,
}: CreateCurrentMembershipResolverInput): WalletAuthenticationMembershipResolver =>
  Object.freeze({
    resolve: async (subject: VerifiedWalletSubject, signal?: AbortSignal) => {
      if (signal?.aborted) {
        return Object.freeze({ status: "unavailable" as const });
      }
      try {
        const admin = resolveCurrentAdminPolicy(env, subject.walletAddress);
        if (signal?.aborted) {
          return Object.freeze({ status: "unavailable" as const });
        }
        // project_owner is only a candidate; route authorization intersects it with current ownerAddress.
        const roleIds = Object.freeze([
          "participant",
          "project_owner",
          ...admin.roleIds,
        ] satisfies AuthSessionRoleId[]);
        const capabilities = unique(roleIds.flatMap(
          (roleId) => authSessionRolePolicyById[roleId].allowedCapabilities,
        ));
        return Object.freeze({
          capabilities,
          membershipRevision: admin.membershipRevision,
          roleIds,
          status: "resolved" as const,
        });
      } catch {
        return Object.freeze({ status: "unavailable" as const });
      }
    },
  });

const currentAdminAuthority = (
  authority: ResolvedWalletSessionAuthority,
  env: Readonly<Record<string, string | undefined>>,
): boolean => {
  try {
    const current = resolveCurrentAdminPolicy(env, authority.subject.walletAddress);
    return current.membershipRevision === authority.membershipRevision
      && authority.capabilities.includes("admin:review")
      && current.roleIds.some((roleId) => authority.roleIds.includes(roleId));
  } catch {
    return false;
  }
};

const authorizationFailure = (
  result: Exclude<ResolveWalletAuthenticationAuthorizationResult, { status: "authorized" }>,
): WalletAuthenticationAdminRevokeResult => {
  if (result.status === "unauthorized") {
    return Object.freeze({
      diagnosticCode: "WALLET_AUTH_ADMIN_SESSION_UNAUTHORIZED",
      status: "unauthorized" as const,
    });
  }
  if (result.status === "forbidden") {
    return Object.freeze({
      diagnosticCode: "WALLET_AUTH_ADMIN_MEMBERSHIP_FORBIDDEN",
      status: "forbidden" as const,
    });
  }
  return Object.freeze({
    diagnosticCode: "WALLET_AUTH_ADMIN_AUTHORITY_UNAVAILABLE",
    retryable: result.diagnostic.retryable,
    status: "unavailable" as const,
  });
};

const revalidationFailure = (
  result: Exclude<RevalidateWalletAuthenticationFenceResult<unknown>, { status: "committed" }>,
): WalletAuthenticationAdminRevokeResult => result.status === "stale"
  ? Object.freeze({
    diagnosticCode: "WALLET_AUTH_ADMIN_ACTOR_FENCE_STALE",
    status: "unauthorized" as const,
  })
  : Object.freeze({
    diagnosticCode: "WALLET_AUTH_ADMIN_AUTHORITY_UNAVAILABLE",
    retryable: result.diagnostic.retryable,
    status: "unavailable" as const,
  });

const membershipStale = (): WalletAuthenticationAdminRevokeResult => Object.freeze({
  diagnosticCode: "WALLET_AUTH_ADMIN_MEMBERSHIP_STALE",
  status: "forbidden" as const,
});

const targetRevokeUnavailable = (
  retryable: boolean,
): WalletAuthenticationAdminRevokeResult => Object.freeze({
  diagnosticCode: "WALLET_AUTH_ADMIN_TARGET_REVOKE_UNAVAILABLE",
  retryable,
  status: "unavailable" as const,
});

/** Executes actor-fence validation and the target revoke in one store transaction. */
export const createAtomicWalletAuthenticationAdminRevokeExecutor = ({
  env,
  runtime,
}: CreateAtomicAdminRevokeExecutorInput): WalletAuthenticationAdminRevokeExecutor =>
  Object.freeze({
    revoke: async (input: WalletAuthenticationAdminRevokeInput) => {
      const traceId = safeTraceId(input.traceId);
      let authorization: ResolveWalletAuthenticationAuthorizationResult;
      try {
        const request: WalletAuthenticationMutationRequestInput = {
          cookieHeader: input.cookieHeader,
          csrfHeader: input.csrfHeader,
          origin: input.origin,
          ...(input.signal === undefined ? {} : { signal: input.signal }),
          traceId,
        };
        authorization = await runtime.resolveAuthorization(request);
      } catch {
        return Object.freeze({
          diagnosticCode: "WALLET_AUTH_ADMIN_AUTHORITY_UNAVAILABLE",
          retryable: true,
          status: "unavailable" as const,
        });
      }
      if (authorization.status !== "authorized") {
        return authorizationFailure(authorization);
      }
      if (!currentAdminAuthority(authorization.authority, env)) {
        return membershipStale();
      }

      let revalidated: RevalidateWalletAuthenticationFenceResult<
        WalletAuthenticationAdminRevokeResult
      >;
      try {
        revalidated = await runtime.revalidateFenceBeforeWrite({
          fence: authorization.fence,
          ...(input.signal === undefined ? {} : { signal: input.signal }),
          traceId,
          write: async ({ authority, signal }) => {
            if (signal.aborted || !currentAdminAuthority(authority, env)) {
              return membershipStale();
            }
            const result = await runtime.revokeSession({
              reasonCode: input.reasonCode,
              sessionId: input.targetSessionId,
              signal,
              traceId,
            });
            if ("diagnostic" in result) {
              return targetRevokeUnavailable(result.diagnostic.retryable);
            }
            return Object.freeze({ status: result.status });
          },
        });
      } catch {
        return Object.freeze({
          diagnosticCode: "WALLET_AUTH_ADMIN_AUTHORITY_UNAVAILABLE",
          retryable: true,
          status: "unavailable" as const,
        });
      }
      if (revalidated.status !== "committed") {
        return revalidationFailure(revalidated);
      }
      return revalidated.value;
    },
  });

const productionHosts = (
  config: WalletAuthenticationConfig,
  env: Readonly<Record<string, string | undefined>>,
  providerId: string,
  traceId: string,
): readonly string[] | undefined => {
  if (config.environment !== "production") {
    return undefined;
  }
  const provider = config.caRelationProviders.find(({ id }) => id === providerId);
  const endpoint = provider ? env[provider.endpointEnvKey] : undefined;
  if (!provider?.productionApproved || !endpoint) {
    return fail("WALLET_AUTH_PRODUCTION_APPROVAL_REQUIRED", "caRelationProvider", traceId);
  }
  try {
    const parsed = new URL(endpoint);
    return Object.freeze([parsed.hostname.toLowerCase()]);
  } catch {
    return fail("WALLET_AUTH_PRODUCTION_APPROVAL_REQUIRED", "caRelationProvider", traceId);
  }
};

const createVerifierRegistrations = (
  config: WalletAuthenticationConfig,
  env: Readonly<Record<string, string | undefined>>,
  enabledBindings: readonly WalletAuthenticationConfig["bindings"][number][],
  resolvedClock: WalletAuthenticationClock,
  traceId: string,
  rollbacks: Rollback[],
): Readonly<{
  registrations: readonly Readonly<{
    binding: WalletAuthenticationConfig["bindings"][number];
    verifier: WalletProofVerifier;
  }>[];
  resources: readonly WalletAuthenticationRuntimeResource[];
}> => {
  const providerById = new Map(
    config.caRelationProviders.map((provider) => [provider.id, provider]),
  );
  const providers = new Map<string, PortkeyCaRelationProviderAdapter>();
  const resources: WalletAuthenticationRuntimeResource[] = [];
  const endpointResolver = createPortkeyCaRelationEndpointResolver(env);
  const registrations = enabledBindings.map((binding) => {
    if (binding.accountType === "EOA") {
      return Object.freeze({
        binding,
        verifier: createAelfEoaSignatureVerifier({ binding, clock: resolvedClock }),
      });
    }
    const providerId = binding.caRelationProviderId;
    const providerConfig = providerId ? providerById.get(providerId) : undefined;
    if (!providerId || !providerConfig?.enabled) {
      return fail("WALLET_AUTH_COMPOSITION_CONFIG_INVALID", "caRelationProvider", traceId);
    }
    let provider = providers.get(providerId);
    if (!provider) {
      const approvedProductionHosts = productionHosts(config, env, providerId, traceId);
      provider = createPortkeyCaRelationProvider({
        ...(approvedProductionHosts === undefined
          ? {}
          : { approvedProductionHosts }),
        clock: resolvedClock,
        config: providerConfig,
        endpointResolver,
        environment: config.environment,
        shutdownTimeoutMs: config.limits.shutdownTimeoutMs,
      });
      providers.set(providerId, provider);
      const ownedProvider = provider;
      resources.push(Object.freeze({
        close: () => ownedProvider.close(),
        kind: `portkey_ca_relation_provider:${providerId}`,
      }));
      rollbacks.push(() => ownedProvider.close());
    }
    return Object.freeze({
      binding,
      verifier: createPortkeyAaSignatureVerifier({
        binding,
        clock: resolvedClock,
        environment: config.environment,
        relationProvider: provider,
      }),
    });
  });

  return Object.freeze({
    registrations: Object.freeze(registrations),
    resources: Object.freeze(resources),
  });
};

const validRuntime = (value: unknown): value is WalletAuthenticationRuntime => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return [
    "currentSession",
    "issueChallenge",
    "logout",
    "resolveAuthorization",
    "revalidateFenceBeforeWrite",
    "revokeSession",
    "rotateSession",
    "state",
    "stop",
    "verifyProof",
  ].every((method) => typeof (value as Record<string, unknown>)[method] === "function");
};

export const createDefaultWalletAuthenticationServerComposition = async ({
  config,
  dependencies = {},
  env,
  traceId: requestedTraceId,
}: CreateDefaultWalletAuthenticationServerCompositionInput): Promise<
  WalletAuthenticationServerComposition
> => {
  const traceId = safeTraceId(requestedTraceId);
  const enabledBindings = assertCompositionConfig(config, traceId);
  const originBinding = requireExactOriginBinding(config, traceId);
  const csrfSource = env[config.csrf.envKey];
  if (typeof csrfSource !== "string") {
    return fail("WALLET_AUTH_CSRF_SECRET_REQUIRED", config.csrf.envKey, traceId);
  }
  const resolvedClock = dependencies.clock ?? clock;
  const rollbacks: Rollback[] = [];
  let runtime: WalletAuthenticationRuntime | undefined;

  try {
    const databaseConfig = resolveCampaignOsCampaignDbConfig({ env });
    if (databaseConfig.mode !== "postgres") {
      return fail("WALLET_AUTH_POSTGRES_REQUIRED", "database", traceId);
    }
    const poolFactory = dependencies.poolFactory
      ?? createDefaultPoolFactory(databaseConfig.pool);
    const pool = poolFactory(databaseConfig.pool.connectionString);
    rollbacks.push(() => pool.end());
    const store = createPostgresWalletAuthenticationStore({
      clock: resolvedClock,
      ownsPool: true,
      pool,
      shutdownTimeoutMs: config.limits.shutdownTimeoutMs,
    });
    rollbacks.pop();
    rollbacks.push(() => store.close());

    const csrfBytes = Uint8Array.from(Buffer.from(csrfSource, "utf8"));
    let csrfSecret;
    try {
      csrfSecret = createWalletSessionCsrfSecret(csrfBytes, traceId);
    } finally {
      csrfBytes.fill(0);
    }
    let credentialPort;
    try {
      credentialPort = createWalletSessionRuntimeCredentialPort(
        createWalletSessionCredentialService({ csrfSecret }),
      );
    } catch (error) {
      destroyWalletSessionCsrfSecret(csrfSecret);
      throw error;
    }
    rollbacks.push(() => credentialPort.close());

    const securityPolicy = createWalletSessionRequestSecurityPolicy({
      allowedOrigins: config.allowedOrigins,
      cookie: {
        ...config.cookie,
        maxAgeSeconds: config.limits.absoluteTtlSeconds,
      },
      disposableEnvironment: config.environment !== "production"
        && (env.CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE === "1"
          || env.CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE === "true"),
      environment: config.environment,
      traceId,
    });
    const requestSecurity = createWalletSessionRuntimeRequestSecurityPort(securityPolicy);
    const membershipResolver = createCurrentWalletAuthenticationMembershipResolver({ env });
    const verifierComposition = createVerifierRegistrations(
      config,
      env,
      enabledBindings,
      resolvedClock,
      traceId,
      rollbacks,
    );
    const verifierRegistry = new WalletVerifierRegistry(verifierComposition.registrations);
    const finalWriteCoordinator = createWalletAuthenticationFinalWriteCoordinator(
      store.atomicFinalWritePort,
    );
    const runtimeFactory = dependencies.runtimeFactory
      ?? ((options: CreateWalletAuthenticationRuntimeOptions) =>
        new WalletAuthenticationRuntime(options));
    runtime = runtimeFactory({
      ...originBinding,
      clock: resolvedClock,
      config,
      credentialPort,
      finalWriteCoordinator,
      membershipResolver,
      requestSecurity,
      resources: verifierComposition.resources,
      shutdownTimeoutMs: config.limits.shutdownTimeoutMs,
      store,
      verifierRegistry,
    });
    if (!validRuntime(runtime)) {
      runtime = undefined;
      return fail("WALLET_AUTH_COMPOSITION_START_FAILED", "runtime", traceId);
    }

    const ownedRuntime = runtime;
    rollbacks.length = 0;
    const httpController = (dependencies.httpControllerFactory
      ?? createWalletAuthenticationHttpController)({
      adminRevokeExecutor: createAtomicWalletAuthenticationAdminRevokeExecutor({
        env,
        runtime: ownedRuntime,
      }),
      originPolicy: requestSecurity,
      runtime: ownedRuntime,
    });
    if (!httpController || typeof httpController.handle !== "function") {
      return fail("WALLET_AUTH_COMPOSITION_START_FAILED", "httpController", traceId);
    }

    return Object.freeze({ httpController, runtime: ownedRuntime });
  } catch (error) {
    const clean = runtime
      ? await settleWithin(
        runtime.stop(traceId).then((result) => {
          if (result.status !== "drained") {
            throw new Error("Wallet authentication runtime rollback did not drain.");
          }
        }),
        config.limits.shutdownTimeoutMs,
      ) === "fulfilled"
      : await runRollback(rollbacks, config.limits.shutdownTimeoutMs);
    if (!clean) {
      throw new WalletAuthenticationServerCompositionError(
        "WALLET_AUTH_COMPOSITION_ROLLBACK_FAILED",
        "rollback",
        traceId,
      );
    }
    if (error instanceof WalletAuthenticationServerCompositionError) {
      throw error;
    }
    throw new WalletAuthenticationServerCompositionError(
      "WALLET_AUTH_COMPOSITION_START_FAILED",
      "composition",
      traceId,
    );
  }
};
