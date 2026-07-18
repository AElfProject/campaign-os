import AElf from "aelf-sdk";
import { describe, expect, it, vi } from "vitest";
import {
  issueVerifiedWalletSubject,
  type WalletProofVerificationRequest,
  type WalletProofVerifier,
} from "./walletAuthentication";
import type {
  WalletAuthenticationEnvironment,
  WalletVerifierBinding,
} from "./walletAuthenticationConfig";
import {
  WalletVerifierRegistry,
  WalletVerifierRegistryError,
} from "./walletVerifierRegistry";
import {
  issueCanonicalWalletAuthenticationChallenge,
  verifyCanonicalWalletAuthenticationChallenge,
} from "./walletAuthenticationChallenge";

const TEST_ADDRESS = AElf.wallet.getAddressFromPubKey(
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

const verifiedChallenge = (() => {
  let randomCall = 0;
  const issued = issueCanonicalWalletAuthenticationChallenge({
    audience: "campaign-os-participant",
    binding: binding(),
    chainId: "AELF",
    clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    domain: "campaign.example",
    random: { randomBytes: () => new Uint8Array(32).fill(++randomCall) },
    requestedWalletAddress: TEST_ADDRESS,
    traceId: "trace-registry-challenge",
    uri: "https://campaign.example/auth/wallet",
  });
  const verified = verifyCanonicalWalletAuthenticationChallenge({
    clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    clockSkewSeconds: 30,
    message: issued.projection.message,
    nonce: issued.projection.nonce,
    snapshot: issued.snapshot,
    traceId: "trace-registry-challenge",
  });
  if (verified.status !== "verified") {
    throw new Error("Expected canonical registry challenge material.");
  }
  return verified.challenge;
})();

const challenge = (overrides: Partial<WalletProofVerificationRequest["challenge"]> = {}) =>
  Object.keys(overrides).length === 0
    ? verifiedChallenge
    : { ...verifiedChallenge, ...overrides };

const request = (overrides: Partial<WalletProofVerificationRequest> = {}): WalletProofVerificationRequest => ({
  challenge: challenge(),
  signature: new Uint8Array(65).fill(1),
  traceId: "trace-registry-1",
  ...overrides,
});

const verifiedSubject = (overrides: Parameters<typeof issueVerifiedWalletSubject>[0] extends infer T ? Partial<T> : never = {}) =>
  issueVerifiedWalletSubject({
    accountType: "EOA",
    adapterId: "portkey-discover-eoa",
    chainId: "AELF",
    network: "testnet",
    proofDigest: "a".repeat(64),
    proofMethod: "AELF_EOA_RECOVERABLE",
    signerAddress: TEST_ADDRESS,
    verifiedAt: "2026-07-18T04:00:00.000Z",
    walletAddress: TEST_ADDRESS,
    walletSource: "PORTKEY_EOA_APP",
    ...overrides,
  });

const verifier = (subject = verifiedSubject()) => ({
  id: "aelf-web-login-discover-v1",
  proofMethod: "AELF_EOA_RECOVERABLE" as const,
  verify: vi.fn<WalletProofVerifier["verify"]>(async () => ({ status: "verified", subject })),
});

const execute = (
  registry: WalletVerifierRegistry,
  options: {
    environment?: WalletAuthenticationEnvironment;
    resolvedBinding?: WalletVerifierBinding;
    verificationRequest?: WalletProofVerificationRequest;
  } = {},
  signal?: AbortSignal,
) => registry.verify({
  binding: options.resolvedBinding ?? binding(),
  environment: options.environment ?? "stage",
  request: options.verificationRequest ?? request(),
}, signal);

describe("WalletVerifierRegistry", () => {
  it("selects one immutable O(1) binding entry and calls only its strategy", async () => {
    const selected = verifier();
    const other = verifier(verifiedSubject({
      adapterId: "nightelf-eoa",
      walletSource: "NIGHTELF",
    }));
    const registry = new WalletVerifierRegistry([
      { binding: binding(), verifier: selected },
      {
        binding: binding({
          adapterId: "nightelf-eoa",
          hashStrategyId: "nightelf-sha256-recoverable-v1",
          walletSource: "NIGHTELF",
        }),
        verifier: { ...other, id: "nightelf-sha256-recoverable-v1" },
      },
    ]);

    const result = await execute(registry, {
      verificationRequest: request({ adapterProof: { strategy: "nightelf-eoa" } }),
    });

    expect(result.status).toBe("verified");
    expect(Object.isFrozen(result)).toBe(true);
    expect(selected.verify).toHaveBeenCalledTimes(1);
    expect(other.verify).not.toHaveBeenCalled();
    expect(registry.size).toBe(2);
  });

  it("strips verifier-owned extras from a successful result", async () => {
    const subject = verifiedSubject();
    const selected = {
      ...verifier(subject),
      verify: vi.fn<WalletProofVerifier["verify"]>(async () => ({
        message: new Uint8Array([1]),
        publicKey: new Uint8Array([2]),
        signature: new Uint8Array([3]),
        status: "verified",
        subject,
      } as never)),
    };
    const result = await execute(new WalletVerifierRegistry([
      { binding: binding(), verifier: selected },
    ]));

    expect(result).toEqual({ status: "verified", subject });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects duplicate adapter registrations deterministically", () => {
    const selected = verifier();
    expect(() => new WalletVerifierRegistry([
      { binding: binding(), verifier: selected },
      { binding: binding(), verifier: selected },
    ])).toThrowError(WalletVerifierRegistryError);
    expect(() => new WalletVerifierRegistry([
      { binding: binding(), verifier: selected },
      { binding: binding(), verifier: selected },
    ])).toThrowError(expect.objectContaining({
      code: "WALLET_AUTH_VERIFIER_REGISTRATION_CONFLICT",
      field: "bindings",
    }));
  });

  it("fails closed before crypto for missing, disabled, unapproved and wrong-method bindings", async () => {
    const selected = verifier();
    const missing = new WalletVerifierRegistry([]);
    const disabled = new WalletVerifierRegistry([
      { binding: binding({ enabled: false }), verifier: selected },
    ]);
    const unapproved = new WalletVerifierRegistry([
      { binding: binding(), verifier: selected },
    ]);
    const wrongMethod = binding({ proofMethod: "PORTKEY_AA_MANAGER_CA" });

    expect(await execute(missing)).toMatchObject({ status: "unavailable" });
    expect(await execute(disabled, { resolvedBinding: binding({ enabled: false }) }))
      .toMatchObject({ status: "unavailable" });
    expect(await execute(unapproved, { environment: "production" }))
      .toMatchObject({ status: "unavailable" });
    expect(await execute(unapproved, { resolvedBinding: wrongMethod }))
      .toMatchObject({ status: "unavailable" });
    expect(selected.verify).not.toHaveBeenCalled();
  });

  it("keeps stage enablement independent from production approval", async () => {
    const selected = verifier();
    const registry = new WalletVerifierRegistry([{ binding: binding(), verifier: selected }]);

    expect(await execute(registry, { environment: "stage" })).toMatchObject({ status: "verified" });
    expect(await execute(registry, { environment: "production" }))
      .toMatchObject({ status: "unavailable" });
    expect(selected.verify).toHaveBeenCalledTimes(1);
  });

  it("copies registration metadata so later caller mutation cannot redirect verification", async () => {
    const mutableBinding = binding();
    const selected = verifier();
    const registry = new WalletVerifierRegistry([{ binding: mutableBinding, verifier: selected }]);

    (mutableBinding as { enabled: boolean }).enabled = false;
    (mutableBinding.chainIds as Array<"AELF" | "tDVV" | "tDVW">)[0] = "tDVV";
    (selected as { id: string }).id = "changed-after-registration";

    expect(await execute(registry)).toMatchObject({ status: "verified" });
    expect(selected.verify).toHaveBeenCalledTimes(1);
  });

  it("rejects binding/challenge drift and forged verifier subject authority", async () => {
    const selected = verifier(verifiedSubject({ walletSource: "NIGHTELF" }));
    const registry = new WalletVerifierRegistry([{ binding: binding(), verifier: selected }]);
    const drifts = [
      request({ challenge: challenge({ adapterId: "nightelf-eoa" }) }),
      request({ challenge: challenge({ chainId: "tDVV" }) }),
      request({ challenge: challenge({ network: "mainnet" }) }),
    ];

    for (const verificationRequest of drifts) {
      expect(await execute(registry, { verificationRequest }))
        .toMatchObject({ status: "rejected" });
    }
    expect(selected.verify).not.toHaveBeenCalled();

    expect(await execute(registry)).toMatchObject({ status: "rejected" });
    expect(selected.verify).toHaveBeenCalledTimes(1);
  });

  it("rejects a structurally identical but unbranded challenge before strategy dispatch", async () => {
    const selected = verifier();
    const registry = new WalletVerifierRegistry([{ binding: binding(), verifier: selected }]);
    const forgedChallenge = { ...verifiedChallenge };

    expect(await execute(registry, {
      verificationRequest: request({ challenge: forgedChallenge }),
    })).toMatchObject({ status: "rejected" });
    expect(selected.verify).not.toHaveBeenCalled();
  });

  it("converts verifier throws into safe typed diagnostics", async () => {
    const unsafeCause = ["internal", "credential", "material"].join("-");
    const throwing = {
      ...verifier(),
      verify: vi.fn<WalletProofVerifier["verify"]>(async () => {
        throw new Error(unsafeCause);
      }),
    };
    const result = await execute(new WalletVerifierRegistry([
      { binding: binding(), verifier: throwing },
    ]));
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_VERIFIER_UNAVAILABLE",
        traceId: "trace-registry-1",
      },
      status: "unavailable",
    });
    expect(!serialized.includes(unsafeCause)).toBe(true);
    expect(!/stack|cause|message/i.test(serialized)).toBe(true);
  });

  it("sanitizes an untrusted verifier diagnostic before returning it", async () => {
    const unsafe = ["internal", "authorization", "material"].join("-");
    const untrusted = {
      ...verifier(),
      verify: vi.fn<WalletProofVerifier["verify"]>(async () => ({
        diagnostic: {
          code: unsafe,
          field: unsafe,
          message: unsafe,
          severity: "error",
          traceId: unsafe,
        },
        status: "unavailable",
      } as never)),
    };
    const result = await execute(new WalletVerifierRegistry([
      { binding: binding(), verifier: untrusted },
    ]));
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      diagnostic: {
        code: "WALLET_AUTH_VERIFIER_UNAVAILABLE",
        field: "verifier",
        traceId: "trace-registry-1",
      },
      status: "unavailable",
    });
    expect(!serialized.includes(unsafe)).toBe(true);
    expect(!/stack|cause|message/i.test(serialized)).toBe(true);
  });

  it("supports bounded timeout and abort without calling an already-aborted strategy", async () => {
    let observedSignal: AbortSignal | undefined;
    const waiting = {
      ...verifier(),
      verify: vi.fn<WalletProofVerifier["verify"]>((_request, signal) => {
        observedSignal = signal;
        return new Promise(() => undefined);
      }),
    };
    const registry = new WalletVerifierRegistry([
      { binding: binding(), verifier: waiting },
    ], { timeoutMs: 5 });

    expect(await execute(registry)).toMatchObject({ status: "unavailable" });
    expect(observedSignal?.aborted).toBe(true);

    const controller = new AbortController();
    controller.abort();
    expect(await execute(registry, {}, controller.signal)).toMatchObject({ status: "unavailable" });
    expect(waiting.verify).toHaveBeenCalledTimes(1);
  });

  it("closes the missed-abort window before dispatching a strategy", async () => {
    const selected = verifier();
    let abortedReads = 0;
    const racingSignal = {
      addEventListener: vi.fn(),
      get aborted() {
        abortedReads += 1;
        return abortedReads > 1;
      },
      removeEventListener: vi.fn(),
    } as unknown as AbortSignal;

    expect(await execute(
      new WalletVerifierRegistry([{ binding: binding(), verifier: selected }]),
      {},
      racingSignal,
    )).toMatchObject({ status: "unavailable" });
    expect(selected.verify).not.toHaveBeenCalled();
  });
});
