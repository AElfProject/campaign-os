import { describe, expect, it, vi } from "vitest";
import {
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
} from "./walletAuthentication";
import { resolveCampaignOsWalletAuthenticationConfig } from "./config";
import type { PostgresWalletAuthenticationPool } from "./postgresWalletAuthenticationStore";
import type {
  RevalidateWalletAuthenticationFenceInput,
} from "./walletAuthenticationRuntime";
import { WalletAuthenticationRuntime } from "./walletAuthenticationRuntime";
import {
  WalletAuthenticationServerCompositionError,
  createAtomicWalletAuthenticationAdminRevokeExecutor,
  createCurrentWalletAuthenticationMembershipResolver,
  createDefaultWalletAuthenticationServerComposition,
} from "./walletAuthenticationServerComposition";

const walletAddress = "2YVwDefaultCompositionParticipant";

const eoaBinding = (productionApproved: boolean) => ({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-discover-v1",
  network: "testnet",
  productionApproved,
  proofMethod: "AELF_EOA_RECOVERABLE",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_EOA_APP",
});

const stageEnv = (
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> => ({
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "http://127.0.0.1:5193",
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding(false)]),
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "s".repeat(32),
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
  ...overrides,
});

const productionEnv = (): Record<string, string | undefined> => ({
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://database.example:5432/campaign_os",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://wallet.campaign-os.example",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding(true)]),
  CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "p".repeat(32),
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "production",
});

const fakePool = () => {
  const client = {
    query: vi.fn(async () => ({ rows: [] })),
    release: vi.fn(),
  };
  const pool: PostgresWalletAuthenticationPool = {
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
    query: vi.fn(async () => ({ rows: [] })),
  };

  return { client, pool };
};

const resolveConfig = (env: Record<string, string | undefined>) =>
  resolveCampaignOsWalletAuthenticationConfig({
    env,
    traceId: "trace-default-wallet-composition",
  });

const subject = () => issueVerifiedWalletSubject({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainId: "AELF",
  network: "testnet",
  proofDigest: "a".repeat(64),
  proofMethod: "AELF_EOA_RECOVERABLE",
  signerAddress: walletAddress,
  verifiedAt: "2026-07-18T00:00:00.000Z",
  walletAddress,
  walletSource: "PORTKEY_EOA_APP",
});

describe("default wallet-auth server composition", () => {
  it("assembles the real PostgreSQL runtime from exact stage origin and owns its pool", async () => {
    const env = stageEnv();
    const { pool } = fakePool();
    const poolFactory = vi.fn(() => pool);
    const runtimeFactory = vi.fn((options) => new WalletAuthenticationRuntime(options));

    const composition = await createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(env),
      dependencies: { poolFactory, runtimeFactory },
      env,
      traceId: "trace-default-stage-composition",
    });

    expect(poolFactory).toHaveBeenCalledWith(env.CAMPAIGN_OS_DATABASE_URL);
    expect(runtimeFactory).toHaveBeenCalledWith(expect.objectContaining({
      audience: "campaign-os-wallet-auth:stage:http://127.0.0.1:5193",
      domain: "127.0.0.1:5193",
      finalWriteCoordinator: expect.objectContaining({ kind: "wallet_auth_final_write" }),
      uri: "http://127.0.0.1:5193/",
    }));
    expect(composition.runtime.state().accepting).toBe(true);
    expect(composition.httpController.handle).toEqual(expect.any(Function));

    await composition.runtime.stop("trace-default-stage-stop");

    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("fails closed before pool construction when more than one origin cannot be challenge-bound", async () => {
    const env = stageEnv({
      CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS:
        "http://127.0.0.1:5193,http://127.0.0.1:5194",
    });
    const poolFactory = vi.fn(() => fakePool().pool);

    await expect(createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(env),
      dependencies: { poolFactory },
      env,
      traceId: "trace-ambiguous-origin",
    })).rejects.toMatchObject({
      code: "WALLET_AUTH_ORIGIN_BINDING_AMBIGUOUS",
      field: "allowedOrigins",
    });
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it("keeps stage approval local and independently enforces production approval", async () => {
    const stage = stageEnv();
    const stagePool = fakePool().pool;
    const stageComposition = await createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(stage),
      dependencies: { poolFactory: () => stagePool },
      env: stage,
      traceId: "trace-stage-unapproved-binding",
    });
    await stageComposition.runtime.stop("trace-stage-unapproved-stop");

    const production = productionEnv();
    const productionPool = fakePool().pool;
    const productionComposition = await createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(production),
      dependencies: { poolFactory: () => productionPool },
      env: production,
      traceId: "trace-production-approved-binding",
    });
    await productionComposition.runtime.stop("trace-production-approved-stop");

    const forgedProductionConfig = Object.freeze({
      ...resolveConfig(stageEnv({
        CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: "https://wallet.campaign-os.example",
        CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "1",
      })),
      environment: "production" as const,
      productionReady: true,
    });
    const forgedPoolFactory = vi.fn(() => fakePool().pool);

    await expect(createDefaultWalletAuthenticationServerComposition({
      config: forgedProductionConfig,
      dependencies: { poolFactory: forgedPoolFactory },
      env: stage,
      traceId: "trace-forged-production-approval",
    })).rejects.toMatchObject({
      code: "WALLET_AUTH_PRODUCTION_APPROVAL_REQUIRED",
      field: "bindings",
    });
    expect(forgedPoolFactory).not.toHaveBeenCalled();
  });

  it("performs bounded owned-resource rollback when controller construction fails", async () => {
    const env = stageEnv();
    const { pool } = fakePool();

    await expect(createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(env),
      dependencies: {
        httpControllerFactory: () => {
          throw new Error("synthetic controller construction failure");
        },
        poolFactory: () => pool,
      },
      env,
      traceId: "trace-controller-rollback",
    })).rejects.toBeInstanceOf(WalletAuthenticationServerCompositionError);

    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("closes a created pool when the durable store rejects the low-level dependency", async () => {
    const env = stageEnv();
    const end = vi.fn(async () => undefined);
    const malformedPool = {
      connect: undefined,
      end,
      query: vi.fn(async () => ({ rows: [] })),
    } as unknown as PostgresWalletAuthenticationPool;

    await expect(createDefaultWalletAuthenticationServerComposition({
      config: resolveConfig(env),
      dependencies: { poolFactory: () => malformedPool },
      env,
      traceId: "trace-store-construction-rollback",
    })).rejects.toBeInstanceOf(WalletAuthenticationServerCompositionError);

    expect(end).toHaveBeenCalledTimes(1);
  });
});

describe("current wallet-auth membership", () => {
  it("derives Participant and owner-candidate policy plus current Admin registry revision", async () => {
    const env = stageEnv({
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: JSON.stringify([{
        active: true,
        campaignIds: ["campaign-membership-a"],
        roleIds: ["review_operator"],
        subjectAddress: walletAddress,
      }]),
      CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "1",
    });
    const resolver = createCurrentWalletAuthenticationMembershipResolver({ env });

    const first = await resolver.resolve(subject());
    expect(first).toMatchObject({
      capabilities: expect.arrayContaining([
        "campaign:read",
        "campaign:write",
        "task:verify",
        "admin:review",
      ]),
      roleIds: ["participant", "project_owner", "review_operator"],
      status: "resolved",
    });
    if (first.status !== "resolved") {
      throw new Error("Expected current membership resolution.");
    }

    env.CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON = "[]";
    const second = await resolver.resolve(subject());

    expect(second).toMatchObject({
      roleIds: ["participant", "project_owner"],
      status: "resolved",
    });
    if (second.status !== "resolved") {
      throw new Error("Expected current membership resolution after registry change.");
    }
    expect(second.membershipRevision).not.toBe(first.membershipRevision);
  });

  it("fails closed when current Admin membership config cannot be resolved", async () => {
    const env = stageEnv({
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: "not-json",
      CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "1",
    });
    const resolver = createCurrentWalletAuthenticationMembershipResolver({ env });

    await expect(resolver.resolve(subject())).resolves.toEqual({ status: "unavailable" });
  });
});

describe("atomic Admin wallet-session revoke", () => {
  const createAuthority = (membershipRevision: string) => issueResolvedWalletSessionAuthority({
    absoluteExpiresAt: "2099-07-18T04:00:00.000Z",
    capabilities: ["admin:review"],
    credentialBoundary: "wallet-auth-cookie/v1",
    idleExpiresAt: "2099-07-18T03:00:00.000Z",
    membershipRevision,
    roleIds: ["participant", "project_owner", "review_operator"],
    sessionId: "wallet-session-actor",
    subject: subject(),
    version: 1,
  });

  const adminEnv = () => stageEnv({
    CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: JSON.stringify([{
      active: true,
      campaignIds: null,
      roleIds: ["review_operator"],
      subjectAddress: walletAddress,
    }]),
    CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "1",
  });

  const createFence = (authority: ReturnType<typeof createAuthority>) => ({
    capabilityDigest: "b".repeat(64),
    membershipRevision: authority.membershipRevision,
    sessionId: authority.sessionId,
    subjectKey: "c".repeat(64),
    version: authority.version,
  });

  const revokeRequest = (targetSessionId: string, traceId: string) => ({
    cookieHeader: "campaign_os_wallet_session=credential",
    csrfHeader: "csrf",
    origin: "http://127.0.0.1:5193",
    reasonCode: "ADMIN_REVOKED",
    signal: undefined,
    targetSessionId,
    traceId,
  });

  it("executes target revoke inside the actor final-write transaction", async () => {
    const env = adminEnv();
    const membership = await createCurrentWalletAuthenticationMembershipResolver({ env })
      .resolve(subject());
    if (membership.status !== "resolved") {
      throw new Error("Expected Admin membership.");
    }
    const authority = createAuthority(membership.membershipRevision);
    const fence = createFence(authority);
    let insideFinalWrite = false;
    const runtime = {
      resolveAuthorization: vi.fn(async () => ({
        authority,
        fence,
        status: "authorized" as const,
      })),
      revalidateFenceBeforeWrite: vi.fn(async <TValue>(
        input: RevalidateWalletAuthenticationFenceInput<TValue>,
      ) => {
        insideFinalWrite = true;
        try {
          return {
            status: "committed" as const,
            value: await input.write({
              authority,
              signal: new AbortController().signal,
            }),
          };
        } finally {
          insideFinalWrite = false;
        }
      }),
      revokeSession: vi.fn(async () => {
        expect(insideFinalWrite).toBe(true);
        return { status: "revoked" as const };
      }),
    };
    const executor = createAtomicWalletAuthenticationAdminRevokeExecutor({
      env,
      runtime: runtime as unknown as Pick<
        WalletAuthenticationRuntime,
        "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
      >,
    });

    await expect(executor.revoke(revokeRequest(
      "wallet-session-target",
      "trace-admin-target-revoke",
    ))).resolves.toEqual({ status: "revoked" });
    expect(runtime.revalidateFenceBeforeWrite).toHaveBeenCalledTimes(1);
    expect(runtime.revokeSession).toHaveBeenCalledWith({
      reasonCode: "ADMIN_REVOKED",
      sessionId: "wallet-session-target",
      signal: expect.any(AbortSignal),
      traceId: "trace-admin-target-revoke",
    });
  });

  it("allows self-revoke through the same actor final-write transaction", async () => {
    const env = adminEnv();
    const membership = await createCurrentWalletAuthenticationMembershipResolver({ env })
      .resolve(subject());
    if (membership.status !== "resolved") {
      throw new Error("Expected Admin membership.");
    }
    const authority = createAuthority(membership.membershipRevision);
    const fence = createFence(authority);
    let insideFinalWrite = false;
    const runtime = {
      resolveAuthorization: vi.fn(async () => ({ authority, fence, status: "authorized" as const })),
      revalidateFenceBeforeWrite: vi.fn(async <TValue>(
        input: RevalidateWalletAuthenticationFenceInput<TValue>,
      ) => {
        insideFinalWrite = true;
        try {
          return {
            status: "committed" as const,
            value: await input.write({
              authority,
              signal: new AbortController().signal,
            }),
          };
        } finally {
          insideFinalWrite = false;
        }
      }),
      revokeSession: vi.fn(async () => {
        expect(insideFinalWrite).toBe(true);
        return { status: "revoked" as const };
      }),
    };
    const executor = createAtomicWalletAuthenticationAdminRevokeExecutor({
      env,
      runtime: runtime as unknown as Pick<
        WalletAuthenticationRuntime,
        "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
      >,
    });

    await expect(executor.revoke(revokeRequest(
      authority.sessionId,
      "trace-admin-self-revoke",
    ))).resolves.toEqual({ status: "revoked" });
    expect(runtime.revalidateFenceBeforeWrite).toHaveBeenCalledTimes(1);
    expect(runtime.revokeSession).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: authority.sessionId,
    }));
  });

  it("preserves already-terminal target outcome from the atomic callback", async () => {
    const env = adminEnv();
    const membership = await createCurrentWalletAuthenticationMembershipResolver({ env })
      .resolve(subject());
    if (membership.status !== "resolved") {
      throw new Error("Expected Admin membership.");
    }
    const authority = createAuthority(membership.membershipRevision);
    const fence = createFence(authority);
    const runtime = {
      resolveAuthorization: vi.fn(async () => ({ authority, fence, status: "authorized" as const })),
      revalidateFenceBeforeWrite: vi.fn(async <TValue>(
        input: RevalidateWalletAuthenticationFenceInput<TValue>,
      ) => ({
        status: "committed" as const,
        value: await input.write({ authority, signal: new AbortController().signal }),
      })),
      revokeSession: vi.fn(async () => ({ status: "already_terminal" as const })),
    };
    const executor = createAtomicWalletAuthenticationAdminRevokeExecutor({
      env,
      runtime: runtime as unknown as Pick<
        WalletAuthenticationRuntime,
        "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
      >,
    });

    await expect(executor.revoke(revokeRequest(
      "wallet-session-terminal",
      "trace-admin-already-terminal",
    ))).resolves.toEqual({ status: "already_terminal" });
  });

  it("keeps target writes at zero when the actor fence is stale after revoke or rotation", async () => {
    const env = adminEnv();
    const membership = await createCurrentWalletAuthenticationMembershipResolver({ env })
      .resolve(subject());
    if (membership.status !== "resolved") {
      throw new Error("Expected Admin membership.");
    }
    const authority = createAuthority(membership.membershipRevision);
    const runtime = {
      resolveAuthorization: vi.fn(async () => ({
        authority,
        fence: createFence(authority),
        status: "authorized" as const,
      })),
      revalidateFenceBeforeWrite: vi.fn(async () => ({
        diagnostic: {
          code: "WALLET_AUTH_RUNTIME_FENCE_STALE",
          field: "fence",
          retryable: false,
          traceId: "trace-admin-actor-stale",
        },
        status: "stale" as const,
      })),
      revokeSession: vi.fn(),
    };
    const executor = createAtomicWalletAuthenticationAdminRevokeExecutor({
      env,
      runtime: runtime as unknown as Pick<
        WalletAuthenticationRuntime,
        "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
      >,
    });

    await expect(executor.revoke(revokeRequest(
      "wallet-session-target",
      "trace-admin-actor-stale",
    ))).resolves.toMatchObject({
      diagnosticCode: "WALLET_AUTH_ADMIN_ACTOR_FENCE_STALE",
      status: "unauthorized",
    });
    expect(runtime.revokeSession).not.toHaveBeenCalled();
  });

  it("keeps target writes at zero when current Admin membership changes in the callback", async () => {
    const env = adminEnv();
    const membership = await createCurrentWalletAuthenticationMembershipResolver({ env })
      .resolve(subject());
    if (membership.status !== "resolved") {
      throw new Error("Expected Admin membership.");
    }
    const authority = createAuthority(membership.membershipRevision);
    const runtime = {
      resolveAuthorization: vi.fn(async () => ({
        authority,
        fence: createFence(authority),
        status: "authorized" as const,
      })),
      revalidateFenceBeforeWrite: vi.fn(async <TValue>(
        input: RevalidateWalletAuthenticationFenceInput<TValue>,
      ) => {
        env.CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON = "[]";
        return {
          status: "committed" as const,
          value: await input.write({ authority, signal: new AbortController().signal }),
        };
      }),
      revokeSession: vi.fn(),
    };
    const executor = createAtomicWalletAuthenticationAdminRevokeExecutor({
      env,
      runtime: runtime as unknown as Pick<
        WalletAuthenticationRuntime,
        "resolveAuthorization" | "revalidateFenceBeforeWrite" | "revokeSession"
      >,
    });

    await expect(executor.revoke(revokeRequest(
      "wallet-session-target",
      "trace-admin-membership-race",
    ))).resolves.toMatchObject({
      diagnosticCode: "WALLET_AUTH_ADMIN_MEMBERSHIP_STALE",
      status: "forbidden",
    });
    expect(runtime.revokeSession).not.toHaveBeenCalled();
  });
});
