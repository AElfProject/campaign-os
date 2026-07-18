import AElf from "aelf-sdk";
import { describe, expect, it, vi } from "vitest";
import {
  createWalletAuthenticationDiagnostic,
  issueVerifiedWalletSubject,
  type VerifiedWalletSubject,
  type WalletAuthenticationRandom,
  type WalletProofVerificationResult,
} from "./walletAuthentication";
import type {
  WalletAuthenticationConfig,
  WalletVerifierBinding,
} from "./walletAuthenticationConfig";
import {
  createMemoryWalletAuthenticationStoreForTests,
  type DurableWalletAuthenticationStore,
} from "./walletAuthenticationStore";
import {
  createWalletAuthenticationFinalWriteCoordinator,
  WalletAuthenticationRuntime,
  type VerifyWalletAuthenticationRuntimeProofInput,
  type WalletAuthenticationAtomicFinalWritePort,
  type WalletAuthenticationFinalWriteCoordinator,
  type WalletAuthenticationCredentialMaterial,
  type WalletAuthenticationCredentialPort,
  type WalletAuthenticationMembershipResolver,
  type WalletAuthenticationRequestSecurityPort,
} from "./walletAuthenticationRuntime";
import {
  createWalletSessionCredentialService,
  createWalletSessionCsrfSecret,
  createWalletSessionRuntimeCredentialPort,
} from "./walletSessionCredential";
import {
  createWalletSessionRequestSecurityPolicy,
  createWalletSessionRuntimeRequestSecurityPort,
} from "./walletSessionRequestSecurity";

const NOW = new Date("2026-07-18T08:00:00.000Z");
const ORIGIN = "https://campaign.example";
const WALLET_ADDRESS = AElf.wallet.getAddressFromPubKey(
  AElf.wallet.ellipticEc.genKeyPair().getPublic(),
);

const binding = (overrides: Partial<WalletVerifierBinding> = {}): WalletVerifierBinding => ({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-discover-v1",
  network: "testnet",
  productionApproved: false,
  proofMethod: "AELF_EOA_RECOVERABLE",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_EOA_APP",
  ...overrides,
});

const config = (overrides: Partial<WalletAuthenticationConfig> = {}): WalletAuthenticationConfig => {
  const selected = binding();
  return {
    allowedOrigins: [ORIGIN],
    bindings: [selected],
    caRelationProviders: [],
    cookie: {
      httpOnly: true,
      name: "campaign_os_session",
      path: "/",
      sameSite: "lax",
      secure: true,
    },
    csrf: { configured: true, envKey: "CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET" },
    diagnostics: [],
    enabled: true,
    environment: "stage",
    limits: {
      absoluteTtlSeconds: 8 * 60 * 60,
      challengeRequestMaxBytes: 4_096,
      challengeTtlSeconds: 300,
      clockSkewSeconds: 30,
      idleTtlSeconds: 30 * 60,
      maxActiveChallenges: 5,
      maxSessionsPerSubject: 5,
      maxVerificationAttempts: 20,
      proofMaxBytes: 65_536,
      sessionTouchIntervalSeconds: 60,
      shutdownTimeoutMs: 100,
    },
    productionReady: false,
    resolveBinding: (adapterId) => adapterId === selected.adapterId
      ? { binding: selected, status: "resolved" }
      : { diagnosticCode: "WALLET_AUTH_BINDING_NOT_FOUND", status: "not_found" },
    status: "ready",
    storeMode: "postgres",
    valid: true,
    ...overrides,
  };
};

const verifiedSubject = (): VerifiedWalletSubject => issueVerifiedWalletSubject({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainId: "AELF",
  network: "testnet",
  proofDigest: "e".repeat(64),
  proofMethod: "AELF_EOA_RECOVERABLE",
  signerAddress: WALLET_ADDRESS,
  verifiedAt: NOW.toISOString(),
  walletAddress: WALLET_ADDRESS,
  walletSource: "PORTKEY_EOA_APP",
});

const sequenceRandom = (): WalletAuthenticationRandom => {
  let call = 0;
  return {
    randomBytes: (size) => new Uint8Array(size).fill(++call),
  };
};

interface FakeCredentialState {
  disposed: number;
  exposed: number;
  issueCalls: number;
}

const credentialPort = (): {
  port: WalletAuthenticationCredentialPort;
  state: FakeCredentialState;
} => {
  const state: FakeCredentialState = { disposed: 0, exposed: 0, issueCalls: 0 };
  const digestByCredential = new Map<string, string>();
  const tokenByKey = new Map<string, string>();
  const digest = (value: string) => Buffer.from(value).toString("hex").padEnd(64, "0").slice(0, 64);
  const csrfKey = (sessionId: string, credentialDigest: string, version: number) =>
    `${sessionId}:${credentialDigest}:${version}`;

  const issueSessionSecrets: WalletAuthenticationCredentialPort["issueSessionSecrets"] = async ({
    sessionId,
    version,
  }) => {
    const sequence = ++state.issueCalls;
    const credential = Buffer.from(new Uint8Array(32).fill(sequence)).toString("base64url");
    const credentialDigest = digest(credential);
    const csrfToken = Buffer.from(
      new Uint8Array(32).fill(((sequence + version + 100) % 255) || 1),
    ).toString("base64url");
    const csrfTokenDigest = digest(csrfToken);
    digestByCredential.set(credential, credentialDigest);
    tokenByKey.set(csrfKey(sessionId, credentialDigest, version), csrfToken);
    let disposed = false;
    let exposed = false;
    const material: WalletAuthenticationCredentialMaterial = Object.freeze({
      credentialDigest,
      csrfTokenDigest,
      dispose: () => {
        if (!disposed) {
          disposed = true;
          state.disposed += 1;
        }
      },
      expose: () => {
        if (disposed || exposed) {
          throw new Error("credential material unavailable");
        }
        exposed = true;
        state.exposed += 1;
        return Object.freeze({ credential, csrfToken });
      },
    });
    return material;
  };

  return {
    port: {
      close: () => undefined,
      deriveCsrf: async ({ credentialDigest, sessionId, version }) => {
        const csrfToken = tokenByKey.get(csrfKey(sessionId, credentialDigest, version))
          ?? Buffer.from(new Uint8Array(32).fill((version % 255) || 1)).toString("base64url");
        tokenByKey.set(csrfKey(sessionId, credentialDigest, version), csrfToken);
        return Object.freeze({ csrfToken, csrfTokenDigest: digest(csrfToken) });
      },
      digestCredential: async (credential) => digestByCredential.get(credential) ?? digest(credential),
      issueSessionSecrets,
      kind: "session_credential",
      matchesDigest: (left, right) => left === right,
      verifyCsrf: async ({ credentialDigest, presentedToken, sessionId, version }) =>
        tokenByKey.get(csrfKey(sessionId, credentialDigest, version)) === presentedToken,
    },
    state,
  };
};

const requestSecurity = (): WalletAuthenticationRequestSecurityPort => ({
  clearCookie: () => "campaign_os_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  parseCredentialCookie: (header) => {
    const prefix = "campaign_os_session=";
    if (typeof header !== "string" || !header.startsWith(prefix) || header.includes(";")) {
      return Object.freeze({ status: "rejected" as const });
    }
    return Object.freeze({ credential: header.slice(prefix.length), status: "accepted" as const });
  },
  readCsrfHeader: (header) => typeof header === "string" && header.length > 0
    ? Object.freeze({ status: "accepted" as const, token: header })
    : Object.freeze({ status: "rejected" as const }),
  requireOrigin: (origin) => origin === ORIGIN,
  serializeCredentialCookie: (credential, maxAgeSeconds) =>
    `campaign_os_session=${credential}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
});

const passThroughAtomicCommit: WalletAuthenticationAtomicFinalWritePort["commitIfCurrent"] =
async ({ signal, write }) => signal.aborted
  ? Object.freeze({ status: "stale" as const })
  : Object.freeze({ status: "committed" as const, value: await write() });

const finalWriteCoordinator = (
  atomicPort: WalletAuthenticationAtomicFinalWritePort = {
    commitIfCurrent: passThroughAtomicCommit,
    kind: "wallet_auth_atomic_final_write",
  },
): WalletAuthenticationFinalWriteCoordinator =>
  createWalletAuthenticationFinalWriteCoordinator(atomicPort);

const membershipResolver = (state: { revision: string } = { revision: "membership-v1" }):
WalletAuthenticationMembershipResolver => ({
  resolve: vi.fn(async () => Object.freeze({
    capabilities: Object.freeze(["campaign:read", "task:verify"]),
    membershipRevision: state.revision,
    roleIds: Object.freeze(["participant"]),
    status: "resolved" as const,
  })),
});

const verifierRegistry = (verify = vi.fn(async (): Promise<WalletProofVerificationResult> => ({
  status: "verified",
  subject: verifiedSubject(),
}))) => ({ verify });

const runtime = (overrides: Partial<ConstructorParameters<typeof WalletAuthenticationRuntime>[0]> = {}) => {
  const credentials = credentialPort();
  const store = createMemoryWalletAuthenticationStoreForTests({
    clock: { now: () => new Date(NOW) },
    mode: "unit_test",
  });
  const selectedStore = overrides.store ?? store;
  const authRuntime = new WalletAuthenticationRuntime({
    audience: "campaign-os-participant",
    clock: { now: () => new Date(NOW) },
    config: config(),
    credentialPort: credentials.port,
    domain: "campaign.example",
    finalWriteCoordinator: finalWriteCoordinator(),
    membershipResolver: membershipResolver(),
    random: sequenceRandom(),
    requestSecurity: requestSecurity(),
    store: selectedStore,
    uri: "https://campaign.example/auth/wallet",
    verifierRegistry: verifierRegistry(),
    ...overrides,
  });
  return { credentials, runtime: authRuntime, store: selectedStore };
};

const issue = async (authRuntime: WalletAuthenticationRuntime) => {
  const result = await authRuntime.issueChallenge({
    adapterId: "portkey-discover-eoa",
    chainId: "AELF",
    network: "testnet",
    requestedWalletAddress: WALLET_ADDRESS,
    traceId: "trace-runtime-issue",
  });
  if (result.status !== "issued") {
    throw new Error("Expected issued challenge.");
  }
  return result.challenge;
};

const authenticate = async (
  authRuntime: WalletAuthenticationRuntime,
  challenge?: Awaited<ReturnType<typeof issue>>,
  overrides: Partial<VerifyWalletAuthenticationRuntimeProofInput> = {},
) => {
  const resolvedChallenge = challenge ?? await issue(authRuntime);
  return authRuntime.verifyProof({
  challengeId: resolvedChallenge.id,
  message: resolvedChallenge.message,
  nonce: resolvedChallenge.nonce,
  signature: new Uint8Array(65).fill(7),
  traceId: "trace-runtime-verify",
  ...overrides,
});
};

const cookieFrom = (result: Awaited<ReturnType<typeof authenticate>>): string => {
  if (result.status !== "authenticated") {
    throw new Error("Expected authenticated session.");
  }
  return result.takeSetCookieHeader().split(";", 1)[0]!;
};

describe("wallet authentication runtime", () => {
  it("rejects disabled or unapproved bindings before random, verifier, or store work", async () => {
    const random = { randomBytes: vi.fn(() => new Uint8Array(32)) };
    const store = {
      issueChallengeWithPolicy: vi.fn(),
      close: vi.fn(async () => undefined),
    } as unknown as DurableWalletAuthenticationStore;
    const verify = vi.fn();
    const credentials = credentialPort();
    const authRuntime = new WalletAuthenticationRuntime({
      audience: "campaign-os-participant",
      config: config({ enabled: false, status: "disabled", valid: false }),
      credentialPort: credentials.port,
      domain: "campaign.example",
      finalWriteCoordinator: finalWriteCoordinator(),
      membershipResolver: membershipResolver(),
      random,
      requestSecurity: requestSecurity(),
      store,
      uri: "https://campaign.example/auth/wallet",
      verifierRegistry: verifierRegistry(verify),
    });

    await expect(authRuntime.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: WALLET_ADDRESS,
      traceId: "trace-runtime-disabled",
    })).resolves.toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_DISABLED" },
      status: "blocked",
    });
    expect(random.randomBytes).not.toHaveBeenCalled();
    expect(store.issueChallengeWithPolicy).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("rejects oversized challenge input before random generation or durable writes", async () => {
    const random = { randomBytes: vi.fn(() => new Uint8Array(32).fill(1)) };
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const issueChallengeWithPolicy = vi.fn(baseStore.issueChallengeWithPolicy.bind(baseStore));
    const guardedStore = {
      ...baseStore,
      issueChallengeWithPolicy,
    } as DurableWalletAuthenticationStore;
    const { runtime: authRuntime } = runtime({ random, store: guardedStore });

    expect(await authRuntime.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: "x".repeat(config().limits.challengeRequestMaxBytes + 1),
      traceId: "trace-runtime-oversized-challenge",
    })).toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_INPUT_INVALID" },
      status: "rejected",
    });
    expect(random.randomBytes).not.toHaveBeenCalled();
    expect(issueChallengeWithPolicy).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("issues canonical proof material and exposes raw credential only through Set-Cookie", async () => {
    const { credentials, runtime: authRuntime } = runtime();
    const challenge = await issue(authRuntime);
    const result = await authenticate(authRuntime, challenge);

    expect(result.status).toBe("authenticated");
    if (result.status !== "authenticated") {
      throw new Error("Expected authenticated result.");
    }
    expect(result.response.session).toMatchObject({
      accountType: "EOA",
      roleIds: ["participant"],
      status: "active",
      walletAddress: WALLET_ADDRESS,
    });
    const setCookie = result.takeSetCookieHeader();
    const rawCredential = setCookie.split("=", 2)[1]?.split(";", 1)[0];
    expect(setCookie).toMatch(/^campaign_os_session=[A-Za-z0-9_-]{43};/);
    if (!rawCredential) {
      throw new Error("Expected opaque cookie credential.");
    }
    expect(JSON.stringify(result)).not.toContain(rawCredential);
    expect(JSON.stringify(result)).not.toContain("credentialDigest");
    expect(JSON.stringify(result)).not.toContain("csrfTokenDigest");
    expect(credentials.state).toMatchObject({ disposed: 1, exposed: 1, issueCalls: 1 });
    await authRuntime.stop();
  });

  it("persists an AA subject only from the selected verifier result", async () => {
    const aaBinding = binding({
      accountType: "AA",
      adapterId: "portkey-aa",
      caRelationProviderId: "stage-portkey-ca",
      hashStrategyId: "portkey-aa-manager-ca-v1",
      proofMethod: "PORTKEY_AA_MANAGER_CA",
      walletSource: "PORTKEY_AA",
    });
    const aaSubject = issueVerifiedWalletSubject({
      accountType: "AA",
      adapterId: aaBinding.adapterId,
      caHash: "a".repeat(64),
      chainId: "AELF",
      network: "testnet",
      proofDigest: "b".repeat(64),
      proofMethod: "PORTKEY_AA_MANAGER_CA",
      signerAddress: WALLET_ADDRESS,
      verifiedAt: NOW.toISOString(),
      walletAddress: WALLET_ADDRESS,
      walletSource: "PORTKEY_AA",
    });
    const aaConfig = config({
      bindings: [aaBinding],
      resolveBinding: (adapterId) => adapterId === aaBinding.adapterId
        ? { binding: aaBinding, status: "resolved" }
        : { diagnosticCode: "WALLET_AUTH_BINDING_NOT_FOUND", status: "not_found" },
    });
    const { runtime: authRuntime } = runtime({
      config: aaConfig,
      verifierRegistry: verifierRegistry(vi.fn(async () => ({
        status: "verified" as const,
        subject: aaSubject,
      }))),
    });
    const challenge = await authRuntime.issueChallenge({
      adapterId: aaBinding.adapterId,
      caHash: aaSubject.caHash,
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: aaSubject.walletAddress,
      traceId: "trace-runtime-aa-issue",
    });
    if (challenge.status !== "issued") {
      throw new Error("Expected AA challenge.");
    }
    const authenticated = await authRuntime.verifyProof({
      adapterProof: {
        managerAddress: "forged-client-hint-must-not-be-authority",
      },
      challengeId: challenge.challenge.id,
      message: challenge.challenge.message,
      nonce: challenge.challenge.nonce,
      signature: new Uint8Array(65).fill(9),
      traceId: "trace-runtime-aa-verify",
    });

    expect(authenticated).toMatchObject({
      response: {
        session: {
          accountType: "AA",
          walletAddress: aaSubject.walletAddress,
          walletSource: "PORTKEY_AA",
        },
      },
      status: "authenticated",
    });
    expect(JSON.stringify(authenticated)).not.toContain(
      "forged-client-hint-must-not-be-authority",
    );
    if (authenticated.status === "authenticated") {
      authenticated.takeSetCookieHeader();
    }
    await authRuntime.stop();
  });

  it("records rejected proof without creating credential material or a session", async () => {
    const verify = vi.fn(async (): Promise<WalletProofVerificationResult> => ({
      diagnostic: createWalletAuthenticationDiagnostic({
        code: "WALLET_AUTH_INPUT_INVALID",
        field: "proof",
        traceId: "trace-runtime-invalid-proof",
      }),
      status: "rejected",
    }));
    const { credentials, runtime: authRuntime } = runtime({ verifierRegistry: verifierRegistry(verify) });
    const challenge = await issue(authRuntime);
    const result = await authenticate(authRuntime, challenge);

    expect(result).toMatchObject({ status: "rejected" });
    expect(credentials.state.issueCalls).toBe(0);
    expect(await authRuntime.verifyProof({
      challengeId: challenge.id,
      message: challenge.message,
      nonce: challenge.nonce,
      signature: new Uint8Array(65).fill(7),
      traceId: "trace-runtime-invalid-proof-repeat",
    })).toMatchObject({ status: "rejected" });
    await authRuntime.stop();
  });

  it("does not create a session after membership changes during credential derivation", async () => {
    const membership = { revision: "membership-v1" };
    const credentials = credentialPort();
    const issueSessionSecrets = credentials.port.issueSessionSecrets;
    let releaseCredential: () => void = () => undefined;
    let markCredentialStarted: () => void = () => undefined;
    const credentialStarted = new Promise<void>((resolve) => {
      markCredentialStarted = resolve;
    });
    const credentialGate = new Promise<void>((resolve) => {
      releaseCredential = resolve;
    });
    credentials.port.issueSessionSecrets = async (input) => {
      markCredentialStarted();
      await credentialGate;
      return issueSessionSecrets(input);
    };
    const { runtime: authRuntime } = runtime({
      credentialPort: credentials.port,
      membershipResolver: membershipResolver(membership),
    });
    const challenge = await issue(authRuntime);
    const authenticating = authenticate(authRuntime, challenge);
    await credentialStarted;
    membership.revision = "membership-v2";
    releaseCredential();

    await expect(authenticating).resolves.toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
        field: "membership",
      },
      status: "unauthorized",
    });
    expect(credentials.state.exposed).toBe(0);
    expect(credentials.state.disposed).toBe(1);
    await authRuntime.stop();
  });

  it("exposes one credential and disposes all concurrent consume losers", async () => {
    const { credentials, runtime: authRuntime } = runtime();
    const challenge = await issue(authRuntime);
    const results = await Promise.all(Array.from({ length: 20 }, () =>
      authenticate(authRuntime, challenge)));

    expect(results.filter(({ status }) => status === "authenticated")).toHaveLength(1);
    expect(results.filter(({ status }) => status === "conflict")).toHaveLength(19);
    expect(credentials.state.exposed).toBe(1);
    expect(credentials.state.disposed).toBe(20);
    await authRuntime.stop();
  });

  it("restores current session, rotates once, rejects old cookie, and logs out idempotently", async () => {
    const { runtime: authRuntime } = runtime();
    const authenticated = await authenticate(authRuntime);
    const oldCookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated result.");
    }

    const current = await authRuntime.currentSession({
      cookieHeader: oldCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-current",
    });
    expect(current).toMatchObject({ status: "active" });
    const rotated = await authRuntime.rotateSession({
      cookieHeader: oldCookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-runtime-rotate",
    });
    expect(rotated.status).toBe("rotated");
    expect(await authRuntime.currentSession({
      cookieHeader: oldCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-old-cookie",
    })).toMatchObject({ status: "unauthorized" });
    if (rotated.status !== "rotated") {
      throw new Error("Expected rotated result.");
    }
    const newCookie = rotated.takeSetCookieHeader().split(";", 1)[0]!;
    expect(await authRuntime.logout({
      cookieHeader: newCookie,
      csrfHeader: rotated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-runtime-logout",
    })).toMatchObject({ status: "logged_out" });
    expect(await authRuntime.logout({
      cookieHeader: newCookie,
      csrfHeader: rotated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-runtime-logout-repeat",
    })).toMatchObject({ status: "already_terminal" });
    await authRuntime.stop();
  });

  it("enforces idle and absolute expiry from the durable store at request time", async () => {
    let now = new Date(NOW);
    const clock = { now: () => new Date(now) };
    const idleStore = createMemoryWalletAuthenticationStoreForTests({
      clock,
      mode: "unit_test",
    });
    const { runtime: idleRuntime } = runtime({
      clock,
      config: config({
        limits: {
          ...config().limits,
          absoluteTtlSeconds: 600,
          idleTtlSeconds: 60,
        },
      }),
      store: idleStore,
    });
    const idleSession = await authenticate(idleRuntime);
    const idleCookie = cookieFrom(idleSession);
    now = new Date(NOW.getTime() + 61_000);

    await expect(idleRuntime.currentSession({
      cookieHeader: idleCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-idle-expired",
    })).resolves.toMatchObject({ status: "unauthorized" });
    await idleRuntime.stop();

    now = new Date(NOW);
    const absoluteStore = createMemoryWalletAuthenticationStoreForTests({
      clock,
      mode: "unit_test",
      policy: { touchIntervalMs: 1 },
    });
    const { runtime: absoluteRuntime } = runtime({
      clock,
      config: config({
        limits: {
          ...config().limits,
          absoluteTtlSeconds: 120,
          idleTtlSeconds: 90,
        },
      }),
      store: absoluteStore,
    });
    const absoluteSession = await authenticate(absoluteRuntime);
    const absoluteCookie = cookieFrom(absoluteSession);
    now = new Date(NOW.getTime() + 60_000);
    await expect(absoluteRuntime.currentSession({
      cookieHeader: absoluteCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-absolute-touch",
    })).resolves.toMatchObject({ status: "active" });
    now = new Date(NOW.getTime() + 121_000);

    await expect(absoluteRuntime.currentSession({
      cookieHeader: absoluteCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-absolute-expired",
    })).resolves.toMatchObject({ status: "unauthorized" });
    await absoluteRuntime.stop();
  });

  it("performs only one durable touch write across one hundred reads in a throttle window", async () => {
    let now = new Date(NOW);
    const clock = { now: () => new Date(now) };
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock,
      mode: "unit_test",
      policy: { touchIntervalMs: 60_000 },
    });
    let touchWriteCount = 0;
    const store = {
      ...baseStore,
      touchSession: async (
        input: Parameters<DurableWalletAuthenticationStore["touchSession"]>[0],
      ) => {
        const outcome = await baseStore.touchSession(input);
        if (outcome.status === "touched") {
          touchWriteCount += 1;
        }
        return outcome;
      },
    } as DurableWalletAuthenticationStore;
    const { runtime: authRuntime } = runtime({ clock, store });
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);
    now = new Date(NOW.getTime() + 61_000);

    const reads = await Promise.all(Array.from({ length: 100 }, (_, index) =>
      authRuntime.currentSession({
        cookieHeader: cookie,
        origin: ORIGIN,
        traceId: `trace-runtime-touch-${index}`,
      })));

    expect(reads.every(({ status }) => status === "active")).toBe(true);
    expect(touchWriteCount).toBe(1);
    await authRuntime.stop();
  });

  it("honors the durable store subject session cap across independent authentications", async () => {
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
      policy: {
        maxActiveSessionsPerSubject: 1,
        sessionCapStrategy: "revoke_oldest",
      },
    });
    const { runtime: authRuntime } = runtime({ store });
    const first = await authenticate(authRuntime);
    const firstCookie = cookieFrom(first);
    const second = await authenticate(authRuntime);
    const secondCookie = cookieFrom(second);

    await expect(authRuntime.currentSession({
      cookieHeader: firstCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-cap-oldest",
    })).resolves.toMatchObject({ status: "unauthorized" });
    await expect(authRuntime.currentSession({
      cookieHeader: secondCookie,
      origin: ORIGIN,
      traceId: "trace-runtime-cap-current",
    })).resolves.toMatchObject({ status: "active" });
    await authRuntime.stop();
  });

  it("rejects wrong Origin and CSRF before session mutation", async () => {
    const { runtime: authRuntime } = runtime();
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);

    expect(await authRuntime.currentSession({
      cookieHeader: cookie,
      origin: "https://evil.invalid",
      traceId: "trace-runtime-origin",
    })).toMatchObject({ status: "forbidden" });
    expect(await authRuntime.rotateSession({
      cookieHeader: cookie,
      csrfHeader: "wrong-token",
      origin: ORIGIN,
      traceId: "trace-runtime-csrf",
    })).toMatchObject({ status: "forbidden" });
    await authRuntime.stop();
  });

  it("revalidates an immutable authorization fence immediately before final write", async () => {
    const membership = { revision: "membership-v1" };
    const { runtime: authRuntime } = runtime({ membershipResolver: membershipResolver(membership) });
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);
    const authorization = await authRuntime.resolveAuthorization({
      cookieHeader: cookie,
      csrfHeader: authenticated.status === "authenticated"
        ? authenticated.response.csrfToken
        : undefined,
      origin: ORIGIN,
      traceId: "trace-runtime-fence",
    });
    expect(authorization.status).toBe("authorized");
    if (authorization.status !== "authorized") {
      throw new Error("Expected authorization fence.");
    }
    const write = vi.fn(async () => "written");
    expect(await authRuntime.revalidateFenceBeforeWrite({
      fence: authorization.fence,
      traceId: "trace-runtime-fence-write",
      write,
    })).toEqual({ status: "committed", value: "written" });
    expect(Object.isFrozen(authorization.fence)).toBe(true);

    membership.revision = "membership-v2";
    expect(await authRuntime.revalidateFenceBeforeWrite({
      fence: authorization.fence,
      traceId: "trace-runtime-fence-stale",
      write,
    })).toMatchObject({ status: "stale" });
    expect(write).toHaveBeenCalledTimes(1);
    await authRuntime.stop();
  });

  it("accepts only the branded atomic transaction result and blocks an interleaved revoke", async () => {
    let markCommitEntered: () => void = () => undefined;
    let releaseCommit: () => void = () => undefined;
    const commitEntered = new Promise<void>((resolve) => {
      markCommitEntered = resolve;
    });
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const store = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    let commitCount = 0;
    let fenceCurrent = true;
    const commitIfCurrent: WalletAuthenticationAtomicFinalWritePort["commitIfCurrent"] =
      async ({ signal, write }) => {
        commitCount += 1;
        markCommitEntered();
        await commitGate;
        if (!fenceCurrent || signal.aborted) {
          return Object.freeze({ status: "stale" as const });
        }
        return Object.freeze({ status: "committed" as const, value: await write() });
      };
    const coordinator = finalWriteCoordinator({
      commitIfCurrent,
      kind: "wallet_auth_atomic_final_write",
    });
    const { runtime: authRuntime } = runtime({ finalWriteCoordinator: coordinator, store });
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated session.");
    }
    const authorization = await authRuntime.resolveAuthorization({
      cookieHeader: cookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-atomic-fence",
    });
    if (authorization.status !== "authorized") {
      throw new Error("Expected authorization fence.");
    }
    const write = vi.fn(async () => "must-not-write");
    const committing = authRuntime.revalidateFenceBeforeWrite({
      fence: authorization.fence,
      traceId: "trace-atomic-fence-write",
      write,
    });
    await commitEntered;
    await store.revokeSession({
      reasonCode: "CROSS_INSTANCE_REVOKE",
      sessionId: authorization.fence.sessionId,
      traceId: "trace-atomic-fence-revoke",
    });
    fenceCurrent = false;
    releaseCommit();

    await expect(committing).resolves.toMatchObject({ status: "stale" });
    expect(commitCount).toBe(1);
    expect(write).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("fails closed when a caller forges a check-then-write coordinator", async () => {
    const commit = vi.fn(async () => Object.freeze({
      status: "committed" as const,
      value: "unsafe-write",
    }));
    const forged = {
      commit,
      kind: "wallet_auth_final_write" as const,
    } as WalletAuthenticationFinalWriteCoordinator;
    const { runtime: authRuntime } = runtime({ finalWriteCoordinator: forged });

    await expect(authRuntime.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: WALLET_ADDRESS,
      traceId: "trace-forged-final-write",
    })).resolves.toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_RUNTIME_CONFIG_INVALID",
        field: "config",
      },
      status: "blocked",
    });
    expect(commit).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("aborts active work, bounds cleanup, and rejects every operation after stop begins", async () => {
    let verifyStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      verifyStarted = resolve;
    });
    const verify = vi.fn(async () => {
      verifyStarted();
      return new Promise<WalletProofVerificationResult>(() => undefined);
    });
    const resource = { close: vi.fn(async () => undefined), kind: "ca_provider" };
    const { runtime: authRuntime } = runtime({
      resources: [resource],
      shutdownTimeoutMs: 20,
      verifierRegistry: verifierRegistry(verify),
    });
    const challenge = await issue(authRuntime);
    const externalController = new AbortController();
    const removeAbortListener = vi.spyOn(externalController.signal, "removeEventListener");
    void authenticate(authRuntime, challenge, { signal: externalController.signal });
    await started;

    const before = Date.now();
    const stopped = await authRuntime.stop();
    expect(Date.now() - before).toBeLessThan(250);
    expect(stopped).toMatchObject({ status: "timed_out" });
    expect(stopped.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "WALLET_AUTH_RUNTIME_SHUTDOWN_TIMEOUT",
        field: "operations",
        traceId: "wallet-auth-runtime",
      }),
    ]));
    expect(resource.close).toHaveBeenCalledOnce();
    expect(authRuntime.state()).toEqual({
      accepting: false,
      activeOperationCount: 1,
      controllerCount: 0,
    });
    expect(removeAbortListener).toHaveBeenCalledWith("abort", expect.any(Function));
    await expect(authRuntime.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: WALLET_ADDRESS,
      traceId: "trace-runtime-after-stop",
    })).resolves.toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_STOPPED" },
      status: "blocked",
    });
    expect(await authRuntime.stop()).toBe(stopped);
  });

  it("revokes a session committed by an in-flight transaction after shutdown abort", async () => {
    let markConsumeStarted: () => void = () => undefined;
    let releaseConsume: () => void = () => undefined;
    const consumeStarted = new Promise<void>((resolve) => {
      markConsumeStarted = resolve;
    });
    const consumeGate = new Promise<void>((resolve) => {
      releaseConsume = resolve;
    });
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const consumeChallengeAndCreateSession = vi.fn(async (
      input: Parameters<DurableWalletAuthenticationStore["consumeChallengeAndCreateSession"]>[0],
    ) => {
      markConsumeStarted();
      await consumeGate;
      return baseStore.consumeChallengeAndCreateSession(input);
    });
    const revokeSession = vi.fn(baseStore.revokeSession.bind(baseStore));
    const delayedStore = {
      ...baseStore,
      consumeChallengeAndCreateSession,
      revokeSession,
    } as DurableWalletAuthenticationStore;
    const { credentials, runtime: authRuntime } = runtime({
      shutdownTimeoutMs: 100,
      store: delayedStore,
    });
    const challenge = await issue(authRuntime);
    const verifying = authenticate(authRuntime, challenge);
    await consumeStarted;

    const stopping = authRuntime.stop("trace-stop-during-consume");
    releaseConsume();
    await expect(verifying).resolves.toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_ABORTED" },
      status: "unavailable",
    });
    await expect(stopping).resolves.toMatchObject({ status: "drained" });
    expect(credentials.state.exposed).toBe(0);
    expect(credentials.state.disposed).toBe(1);
    expect(revokeSession).toHaveBeenCalledWith(expect.objectContaining({
      reasonCode: "SESSION_DELIVERY_FAILED",
      traceId: "trace-runtime-verify",
    }));
  });

  it("closes provider resources, credential secret and store in composition order", async () => {
    const closed: string[] = [];
    const credentials = credentialPort();
    credentials.port.close = () => {
      closed.push("credential");
    };
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const orderedStore = {
      ...baseStore,
      close: async () => {
        closed.push("store");
        await baseStore.close();
      },
    } as DurableWalletAuthenticationStore;
    const authRuntime = new WalletAuthenticationRuntime({
      audience: "campaign-os-participant",
      clock: { now: () => new Date(NOW) },
      config: config(),
      credentialPort: credentials.port,
      domain: "campaign.example",
      finalWriteCoordinator: finalWriteCoordinator(),
      membershipResolver: membershipResolver(),
      random: sequenceRandom(),
      requestSecurity: requestSecurity(),
      resources: [
        { close: async () => { closed.push("provider"); }, kind: "provider" },
        { close: async () => { closed.push("listener"); }, kind: "listener" },
      ],
      store: orderedStore,
      uri: "https://campaign.example/auth/wallet",
      verifierRegistry: verifierRegistry(),
    });

    expect(await authRuntime.stop("trace-runtime-close-order")).toMatchObject({
      diagnostics: [],
      status: "drained",
    });
    expect(closed).toEqual(["provider", "listener", "credential", "store"]);
    expect(authRuntime.state()).toEqual({
      accepting: false,
      activeOperationCount: 0,
      controllerCount: 0,
    });
  });

  it("aggregates safe cleanup diagnostics without skipping later resources", async () => {
    const closed: string[] = [];
    const credentials = credentialPort();
    credentials.port.close = () => {
      closed.push("credential");
      throw new Error("private-csrf-secret");
    };
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const finalStore = {
      ...baseStore,
      close: async () => {
        closed.push("store");
        await baseStore.close();
      },
    } as DurableWalletAuthenticationStore;
    const authRuntime = new WalletAuthenticationRuntime({
      audience: "campaign-os-participant",
      config: config(),
      credentialPort: credentials.port,
      domain: "campaign.example",
      finalWriteCoordinator: finalWriteCoordinator(),
      membershipResolver: membershipResolver(),
      requestSecurity: requestSecurity(),
      resources: [{
        close: async () => {
          closed.push("provider");
          throw new Error("https://private-provider.invalid");
        },
        kind: "provider",
      }],
      store: finalStore,
      uri: "https://campaign.example/auth/wallet",
      verifierRegistry: verifierRegistry(),
    });

    const result = await authRuntime.stop("trace-runtime-cleanup-errors");
    expect(result).toMatchObject({ status: "cleanup_failed" });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "WALLET_AUTH_RUNTIME_CLEANUP_FAILED",
        field: "provider",
        traceId: "trace-runtime-cleanup-errors",
      }),
      expect.objectContaining({
        code: "WALLET_AUTH_RUNTIME_CLEANUP_FAILED",
        field: "session_credential",
        traceId: "trace-runtime-cleanup-errors",
      }),
    ]));
    expect(closed).toEqual(["provider", "credential", "store"]);
    expect(JSON.stringify(result)).not.toContain("private-provider");
    expect(JSON.stringify(result)).not.toContain("private-csrf-secret");
  });

  it("runs the real credential and request-security adapters across authenticate, current and rotate", async () => {
    const credentialService = createWalletSessionCredentialService({
      csrfSecret: createWalletSessionCsrfSecret(new Uint8Array(32).fill(91)),
      random: sequenceRandom(),
    });
    const realCredentialPort = createWalletSessionRuntimeCredentialPort(credentialService);
    const realRequestSecurity = createWalletSessionRuntimeRequestSecurityPort(
      createWalletSessionRequestSecurityPolicy({
        allowedOrigins: [ORIGIN],
        cookie: {
          ...config().cookie,
          maxAgeSeconds: config().limits.absoluteTtlSeconds,
        },
        disposableEnvironment: false,
        environment: "stage",
        traceId: "trace-real-runtime-policy",
      }),
      () => new Date(NOW),
    );
    const { runtime: authRuntime } = runtime({
      credentialPort: realCredentialPort,
      requestSecurity: realRequestSecurity,
    });

    const authenticated = await authenticate(authRuntime);
    expect(authenticated.status).toBe("authenticated");
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected real credential authentication.");
    }
    const setCookie = authenticated.takeSetCookieHeader();
    const cookie = setCookie.split(";", 1)[0]!;
    expect(setCookie).toMatch(/campaign_os_session=[A-Za-z0-9_-]{43};/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("Max-Age=28800");
    expect(JSON.stringify(authenticated)).not.toContain(cookie.split("=", 2)[1]);

    const current = await authRuntime.currentSession({
      cookieHeader: cookie,
      origin: ORIGIN,
      traceId: "trace-real-runtime-current",
    });
    expect(current).toMatchObject({ status: "active" });
    const rotated = await authRuntime.rotateSession({
      cookieHeader: cookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-real-runtime-rotate",
    });
    expect(rotated.status).toBe("rotated");
    if (rotated.status !== "rotated") {
      throw new Error("Expected real credential rotation.");
    }
    expect(rotated.takeSetCookieHeader()).toContain("Max-Age=28800");
    expect(await authRuntime.currentSession({
      cookieHeader: cookie,
      origin: ORIGIN,
      traceId: "trace-real-runtime-old-cookie",
    })).toMatchObject({ status: "unauthorized" });
    await authRuntime.stop("trace-real-runtime-stop");
    await expect(realCredentialPort.issueSessionSecrets({
      sessionId: "closed-runtime-session",
      traceId: "trace-real-runtime-closed",
      version: 1,
    })).rejects.toMatchObject({ field: "credentialPort" });
  });

  it("restores one durable session in a fresh runtime without process-local credential authority", async () => {
    const sharedStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const requestPort = createWalletSessionRuntimeRequestSecurityPort(
      createWalletSessionRequestSecurityPolicy({
        allowedOrigins: [ORIGIN],
        cookie: {
          ...config().cookie,
          maxAgeSeconds: config().limits.absoluteTtlSeconds,
        },
        disposableEnvironment: false,
        environment: "stage",
      }),
      () => new Date(NOW),
    );
    const createCredentialPort = () => createWalletSessionRuntimeCredentialPort(
      createWalletSessionCredentialService({
        csrfSecret: createWalletSessionCsrfSecret(new Uint8Array(32).fill(93)),
        random: sequenceRandom(),
      }),
    );
    const firstStore = {
      ...sharedStore,
      close: async () => undefined,
    } as DurableWalletAuthenticationStore;
    const first = runtime({
      credentialPort: createCredentialPort(),
      requestSecurity: requestPort,
      store: firstStore,
    }).runtime;
    const authenticated = await authenticate(first);
    const cookie = cookieFrom(authenticated);
    await first.stop("trace-restart-first-stop");

    const secondStore = {
      ...sharedStore,
      close: sharedStore.close.bind(sharedStore),
    } as DurableWalletAuthenticationStore;
    const second = runtime({
      credentialPort: createCredentialPort(),
      requestSecurity: requestPort,
      store: secondStore,
    }).runtime;
    const startedAt = Date.now();
    const current = await second.currentSession({
      cookieHeader: cookie,
      origin: ORIGIN,
      traceId: "trace-restart-second-current",
    });

    expect(current).toMatchObject({ status: "active" });
    expect(Date.now() - startedAt).toBeLessThan(1_000);
    await second.stop("trace-restart-second-stop");
  });

  it("fails closed before store work when production is not backed by the PostgreSQL store", async () => {
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const issueChallengeWithPolicy = vi.fn(baseStore.issueChallengeWithPolicy.bind(baseStore));
    const memoryStore = {
      ...baseStore,
      issueChallengeWithPolicy,
    } as DurableWalletAuthenticationStore;
    const { runtime: authRuntime } = runtime({
      config: config({
        environment: "production",
        productionReady: true,
        storeMode: "postgres",
      }),
      store: memoryStore,
    });

    expect(await authRuntime.issueChallenge({
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      requestedWalletAddress: WALLET_ADDRESS,
      traceId: "trace-production-memory-denied",
    })).toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_CONFIG_INVALID" },
      status: "blocked",
    });
    expect(issueChallengeWithPolicy).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("rejects accessor and oversized adapter proof data before verifier work", async () => {
    const verify = vi.fn(async (): Promise<WalletProofVerificationResult> => ({
      status: "verified",
      subject: verifiedSubject(),
    }));
    const { runtime: authRuntime } = runtime({ verifierRegistry: verifierRegistry(verify) });
    const challenge = await issue(authRuntime);
    const accessorProof = {} as Record<string, unknown>;
    Object.defineProperty(accessorProof, "managerAddress", {
      enumerable: true,
      get: () => { throw new Error("private-provider-payload"); },
    });

    for (const adapterProof of [
      accessorProof,
      { hint: "x".repeat(16_385) },
    ]) {
      expect(await authRuntime.verifyProof({
        adapterProof,
        challengeId: challenge.id,
        message: challenge.message,
        nonce: challenge.nonce,
        signature: new Uint8Array(65).fill(7),
        traceId: "trace-adapter-proof-rejected",
      })).toMatchObject({
        diagnostic: { code: "WALLET_AUTH_RUNTIME_INPUT_INVALID" },
        status: "rejected",
      });
    }
    const accessorRequest = {
      challengeId: challenge.id,
      message: challenge.message,
      nonce: challenge.nonce,
      signature: new Uint8Array(65).fill(7),
      traceId: "trace-adapter-proof-accessor-rejected",
    } as VerifyWalletAuthenticationRuntimeProofInput;
    Object.defineProperty(accessorRequest, "adapterProof", {
      enumerable: true,
      get: () => { throw new Error("private-adapter-proof-getter"); },
    });
    await expect(authRuntime.verifyProof(accessorRequest)).resolves.toMatchObject({
      diagnostic: { code: "WALLET_AUTH_RUNTIME_INPUT_INVALID" },
      status: "rejected",
    });
    expect(verify).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("surfaces proof-attempt persistence failure instead of silently returning rejection", async () => {
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const recordChallengeFailureWithPolicy = vi.fn(async () => {
      throw new Error("postgres://private.invalid/session");
    });
    const failingStore = {
      ...baseStore,
      recordChallengeFailureWithPolicy,
    } as DurableWalletAuthenticationStore;
    const verify = vi.fn(async (): Promise<WalletProofVerificationResult> => ({
      diagnostic: createWalletAuthenticationDiagnostic({
        code: "WALLET_AUTH_INPUT_INVALID",
        field: "proof",
        traceId: "trace-proof-store-failure",
      }),
      status: "rejected",
    }));
    const { runtime: authRuntime } = runtime({
      store: failingStore,
      verifierRegistry: verifierRegistry(verify),
    });

    expect(await authenticate(authRuntime)).toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_RUNTIME_STORE_UNAVAILABLE",
        field: "challenge",
      },
      status: "unavailable",
    });
    expect(recordChallengeFailureWithPolicy).toHaveBeenCalledOnce();
    await authRuntime.stop();
  });

  it("allows only one concurrent rotation and invalidates every old proof", async () => {
    const { runtime: authRuntime } = runtime();
    const authenticated = await authenticate(authRuntime);
    const oldCookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated session.");
    }

    const results = await Promise.all(Array.from({ length: 16 }, (_, index) =>
      authRuntime.rotateSession({
        cookieHeader: oldCookie,
        csrfHeader: authenticated.response.csrfToken,
        origin: ORIGIN,
        traceId: `trace-rotate-race-${index}`,
      })));

    expect(results.filter(({ status }) => status === "rotated")).toHaveLength(1);
    expect(results.filter(({ status }) => status !== "rotated")).toHaveLength(15);
    expect(await authRuntime.currentSession({
      cookieHeader: oldCookie,
      origin: ORIGIN,
      traceId: "trace-rotate-race-old-cookie",
    })).toMatchObject({ status: "unauthorized" });
    for (const result of results) {
      if (result.status === "rotated") {
        result.takeSetCookieHeader();
      }
    }
    await authRuntime.stop();
  });

  it("revokes the rotated session when logout and rotation race", async () => {
    let markLogoutMutationStarted: () => void = () => undefined;
    let releaseLogoutMutation: () => void = () => undefined;
    const logoutMutationStarted = new Promise<void>((resolve) => {
      markLogoutMutationStarted = resolve;
    });
    const logoutMutationGate = new Promise<void>((resolve) => {
      releaseLogoutMutation = resolve;
    });
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const logoutSession = vi.fn(async (
      input: Parameters<DurableWalletAuthenticationStore["logoutSession"]>[0],
    ) => {
      markLogoutMutationStarted();
      await logoutMutationGate;
      return baseStore.logoutSession(input);
    });
    const revokeSession = vi.fn(async (
      input: Parameters<DurableWalletAuthenticationStore["revokeSession"]>[0],
    ) => {
      if (input.reasonCode === "PARTICIPANT_LOGOUT") {
        markLogoutMutationStarted();
        await logoutMutationGate;
      }
      return baseStore.revokeSession(input);
    });
    const racingStore = {
      ...baseStore,
      logoutSession,
      revokeSession,
    } as DurableWalletAuthenticationStore;
    const { runtime: authRuntime } = runtime({ store: racingStore });
    const authenticated = await authenticate(authRuntime);
    const oldCookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated session.");
    }
    const loggingOut = authRuntime.logout({
      cookieHeader: oldCookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-logout-rotation-race",
    });
    await logoutMutationStarted;
    const rotated = await authRuntime.rotateSession({
      cookieHeader: oldCookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-logout-rotation-race-rotate",
    });
    if (rotated.status !== "rotated") {
      throw new Error("Expected concurrent rotation to commit first.");
    }
    const newCookie = rotated.takeSetCookieHeader().split(";", 1)[0]!;
    releaseLogoutMutation();

    await expect(loggingOut).resolves.toMatchObject({ status: "logged_out" });
    await expect(authRuntime.currentSession({
      cookieHeader: newCookie,
      origin: ORIGIN,
      traceId: "trace-logout-rotation-race-current",
    })).resolves.toMatchObject({ status: "unauthorized" });
    await authRuntime.stop();
  });

  it("does not rotate after membership changes during credential derivation", async () => {
    const membership = { revision: "membership-v1" };
    const credentials = credentialPort();
    const issueSessionSecrets = credentials.port.issueSessionSecrets;
    let releaseRotation: () => void = () => undefined;
    let markRotationStarted: () => void = () => undefined;
    const rotationStarted = new Promise<void>((resolve) => {
      markRotationStarted = resolve;
    });
    const rotationGate = new Promise<void>((resolve) => {
      releaseRotation = resolve;
    });
    let issueCount = 0;
    credentials.port.issueSessionSecrets = async (input) => {
      issueCount += 1;
      if (issueCount > 1) {
        markRotationStarted();
        await rotationGate;
      }
      return issueSessionSecrets(input);
    };
    const { runtime: authRuntime } = runtime({
      credentialPort: credentials.port,
      membershipResolver: membershipResolver(membership),
    });
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated session.");
    }

    const rotating = authRuntime.rotateSession({
      cookieHeader: cookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-rotation-membership-race",
    });
    await rotationStarted;
    membership.revision = "membership-v2";
    releaseRotation();

    await expect(rotating).resolves.toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED",
        field: "membership",
      },
      status: "unauthorized",
    });
    await authRuntime.stop();
  });

  it("blocks the final write after trusted revocation invalidates the authorization fence", async () => {
    const { runtime: authRuntime } = runtime();
    const authenticated = await authenticate(authRuntime);
    const cookie = cookieFrom(authenticated);
    if (authenticated.status !== "authenticated") {
      throw new Error("Expected authenticated session.");
    }
    const authorization = await authRuntime.resolveAuthorization({
      cookieHeader: cookie,
      csrfHeader: authenticated.response.csrfToken,
      origin: ORIGIN,
      traceId: "trace-fence-before-revoke",
    });
    if (authorization.status !== "authorized") {
      throw new Error("Expected authorization fence.");
    }
    expect(await authRuntime.revokeSession({
      reasonCode: "TRUSTED_POLICY_REVOKE",
      sessionId: authorization.authority.sessionId,
      traceId: "trace-fence-revoke",
    })).toMatchObject({ status: "revoked" });
    const write = vi.fn(async () => "must-not-write");

    expect(await authRuntime.revalidateFenceBeforeWrite({
      fence: authorization.fence,
      traceId: "trace-fence-after-revoke",
      write,
    })).toMatchObject({ status: "stale" });
    expect(write).not.toHaveBeenCalled();
    await authRuntime.stop();
  });

  it("reports safe cleanup failure when post-commit credential delivery cannot be revoked", async () => {
    const baseStore = createMemoryWalletAuthenticationStoreForTests({
      clock: { now: () => new Date(NOW) },
      mode: "unit_test",
    });
    const revokeSession = vi.fn(async () => {
      throw new Error("postgres://private.invalid/revoke");
    });
    const failingStore = { ...baseStore, revokeSession } as DurableWalletAuthenticationStore;
    const unsafeDelivery = {
      ...requestSecurity(),
      serializeCredentialCookie: () => {
        throw new Error("raw-cookie-delivery-failed");
      },
    } satisfies WalletAuthenticationRequestSecurityPort;
    const { runtime: authRuntime } = runtime({
      requestSecurity: unsafeDelivery,
      store: failingStore,
    });

    const result = await authenticate(authRuntime);
    expect(result).toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_RUNTIME_CLEANUP_FAILED",
        field: "session",
      },
      status: "unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("private.invalid");
    expect(JSON.stringify(result)).not.toContain("raw-cookie-delivery-failed");
    expect(revokeSession).toHaveBeenCalledOnce();
    await authRuntime.stop();
  });
});
