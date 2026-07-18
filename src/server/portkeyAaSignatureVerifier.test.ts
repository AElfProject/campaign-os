import { createHash, randomBytes } from "node:crypto";
import AElf from "aelf-sdk";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type {
  PortkeyCaRelationProvider,
  PortkeyCaRelationResult,
  WalletProofVerificationRequest,
} from "./walletAuthentication";
import type { WalletVerifierBinding } from "./walletAuthenticationConfig";
import {
  issueCanonicalWalletAuthenticationChallenge,
  verifyCanonicalWalletAuthenticationChallenge,
} from "./walletAuthenticationChallenge";
import {
  createPortkeyCaRelationProvider,
  type PortkeyCaRelationProviderAdapter,
  type PortkeyCaRelationTransport,
} from "./portkeyCaRelationProvider";
import {
  PORTKEY_AA_HASH_STRATEGY_ID,
  PortkeyAaSignatureVerifierConfigurationError,
  createPortkeyAaSignatureVerifier,
  decodePortkeyAaManagerSignature,
  type PortkeyAaCryptoPort,
} from "./portkeyAaSignatureVerifier";

const NOW = new Date("2026-07-18T06:00:00.000Z");

const binding = (overrides: Partial<WalletVerifierBinding> = {}): WalletVerifierBinding => ({
  accountType: "AA",
  adapterId: "portkey-aa",
  caRelationProviderId: "stage-portkey-ca",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: PORTKEY_AA_HASH_STRATEGY_ID,
  network: "testnet",
  productionApproved: false,
  proofMethod: "PORTKEY_AA_MANAGER_CA",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_AA",
  ...overrides,
});

const createEphemeralProof = () => {
  const managerKey = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  const caKey = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  const managerAddress = AElf.wallet.getAddressFromPubKey(managerKey.getPublic());
  const caAddress = AElf.wallet.getAddressFromPubKey(caKey.getPublic());
  const caHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  let randomCall = 0;
  const issued = issueCanonicalWalletAuthenticationChallenge({
    audience: "campaign-os-participant",
    binding: binding(),
    caHash,
    chainId: "AELF",
    clock: { now: () => new Date(NOW) },
    domain: "campaign.example",
    random: { randomBytes: () => randomBytes(32).map((value) => value ^ ++randomCall) },
    requestedWalletAddress: caAddress,
    traceId: "trace-aa-challenge",
    uri: "https://campaign.example/auth/wallet",
  });
  const verified = verifyCanonicalWalletAuthenticationChallenge({
    clock: { now: () => new Date(NOW) },
    clockSkewSeconds: 30,
    message: issued.projection.message,
    nonce: issued.projection.nonce,
    snapshot: issued.snapshot,
    traceId: "trace-aa-challenge",
  });
  if (verified.status !== "verified") {
    throw new Error("Expected canonical AA challenge material.");
  }
  const messageBytes = verified.challenge.exactMessageBytes;
  const signature = Uint8Array.from(AElf.wallet.sign(
    Buffer.from(messageBytes).toString("hex"),
    managerKey,
  ));
  const publicKey = Uint8Array.from(managerKey.getPublic().encode("array", false));

  return {
    caAddress,
    caHash,
    challenge: verified.challenge,
    issued,
    managerAddress,
    managerKey,
    messageBytes,
    publicKey,
    signature,
  };
};

const request = (
  proof: ReturnType<typeof createEphemeralProof>,
  overrides: Partial<WalletProofVerificationRequest> = {},
): WalletProofVerificationRequest => ({
  challenge: proof.challenge,
  publicKey: proof.publicKey,
  signature: proof.signature,
  traceId: "trace-aa-verifier-1",
  ...overrides,
});

const relationProvider = (
  proof: ReturnType<typeof createEphemeralProof>,
  result?: PortkeyCaRelationResult | (() => PortkeyCaRelationResult | Promise<PortkeyCaRelationResult>),
): PortkeyCaRelationProvider => ({
  close: vi.fn(async () => undefined),
  id: "stage-portkey-ca",
  verifyRelation: vi.fn<PortkeyCaRelationProvider["verifyRelation"]>(async () => {
    if (typeof result === "function") {
      return result();
    }
    return result ?? {
      caAddress: proof.caAddress,
      caHash: proof.caHash,
      chainId: "AELF" as const,
      managerAddress: proof.managerAddress,
      relationDigest: createHash("sha256").update(randomBytes(32)).digest("hex"),
      relationRevision: `revision-${randomBytes(8).toString("hex")}`,
      status: "verified" as const,
    };
  }),
});

const verifier = (
  proof: ReturnType<typeof createEphemeralProof>,
  overrides: Partial<Parameters<typeof createPortkeyAaSignatureVerifier>[0]> = {},
) => createPortkeyAaSignatureVerifier({
  binding: binding(),
  clock: { now: () => new Date(NOW) },
  environment: "stage",
  relationProvider: relationProvider(proof),
  ...overrides,
});

const concreteRelationProvider = (
  environment: "stage" | "production",
): PortkeyCaRelationProviderAdapter => createPortkeyCaRelationProvider({
  approvedProductionHosts: environment === "production" ? ["provider.example"] : undefined,
  clock: { now: () => new Date(NOW) },
  config: {
    enabled: true,
    endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
    id: "stage-portkey-ca",
    productionApproved: environment === "production",
    timeoutMs: 100,
  },
  dnsResolver: async () => [{ address: "93.184.216.34", family: 4 }],
  endpointResolver: async () => environment === "production"
    ? "https://provider.example/relation"
    : "http://127.0.0.1:5195/relation",
  environment,
  transport: {
    close: vi.fn(async () => undefined),
    execute: vi.fn<PortkeyCaRelationTransport["execute"]>(async () => {
      throw new Error("Readiness test transport must not execute.");
    }),
  },
});

describe("Portkey AA manager and CA relation verifier", () => {
  it("decodes only canonical lowercase recoverable hex into defensive bytes", () => {
    const proof = createEphemeralProof();
    const encoded = Buffer.from(proof.signature).toString("hex");
    const decoded = decodePortkeyAaManagerSignature(encoded, "trace-aa-decode");
    expect(decoded.status).toBe("decoded");
    if (decoded.status !== "decoded") {
      throw new Error("Expected canonical manager signature bytes.");
    }
    const first = decoded.signature[0];
    proof.signature.fill(0);
    expect(decoded.signature[0]).toBe(first);

    for (const invalid of [
      "",
      "0",
      "a".repeat(129),
      "a".repeat(131),
      "A".repeat(130),
      "z".repeat(130),
      Buffer.alloc(65).toString("base64"),
    ]) {
      expect(decodePortkeyAaManagerSignature(invalid, "trace-aa-decode"))
        .toMatchObject({ status: "rejected" });
    }
  });

  it("recovers an ephemeral manager over exact challenge bytes and issues the CA subject", async () => {
    const proof = createEphemeralProof();
    const provider = relationProvider(proof);
    const selected = verifier(proof, { relationProvider: provider });

    const result = await selected.verify(request(proof));

    expect(result.status).toBe("verified");
    if (result.status !== "verified") {
      throw new Error("Expected verified AA proof.");
    }
    expect(result.subject).toMatchObject({
      accountType: "AA",
      adapterId: "portkey-aa",
      caHash: proof.caHash,
      chainId: "AELF",
      network: "testnet",
      proofMethod: "PORTKEY_AA_MANAGER_CA",
      signerAddress: proof.managerAddress,
      verifiedAt: NOW.toISOString(),
      walletAddress: proof.caAddress,
      walletSource: "PORTKEY_AA",
    });
    expect(result.subject.proofDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(provider.verifyRelation).toHaveBeenCalledTimes(1);
    expect(provider.verifyRelation).toHaveBeenCalledWith({
      caAddressHint: proof.caAddress,
      caHash: proof.caHash,
      chainId: "AELF",
      managerAddress: proof.managerAddress,
      traceId: "trace-aa-verifier-1",
    }, undefined);
    expect(JSON.stringify(result)).not.toMatch(/signature|publicKey|extraInfo|relationRevision/i);
  });

  it("does not call CA relation before a canonical manager proof passes", async () => {
    const proof = createEphemeralProof();
    const other = createEphemeralProof();
    const malformed = [
      request(proof, { signature: new Uint8Array(0) }),
      request(proof, { signature: new Uint8Array(64) }),
      request(proof, { signature: new Uint8Array(66) }),
      request(proof, { publicKey: new Uint8Array(34) }),
      request(proof, { publicKey: other.publicKey }),
      request(proof, { challenge: { ...proof.challenge } }),
      request(proof, { challenge: { ...proof.challenge, chainId: "tDVV" } }),
      request(proof, { challenge: { ...proof.challenge, network: "mainnet" } }),
    ];

    for (const candidate of malformed) {
      const provider = relationProvider(proof);
      expect(await verifier(proof, { relationProvider: provider }).verify(candidate))
        .toMatchObject({ status: "rejected" });
      expect(provider.verifyRelation).not.toHaveBeenCalled();
    }
  });

  it("rejects wrong message signer and every invalid current relation without authority fallback", async () => {
    const proof = createEphemeralProof();
    const wrongMessageSignature = Uint8Array.from(AElf.wallet.sign(
      Buffer.from(randomBytes(64)).toString("hex"),
      proof.managerKey,
    ));
    const wrongMessageProvider = relationProvider(proof);
    expect(await verifier(proof, { relationProvider: wrongMessageProvider }).verify(
      request(proof, { publicKey: undefined, signature: wrongMessageSignature }),
    )).toMatchObject({ status: "rejected" });
    expect(wrongMessageProvider.verifyRelation).toHaveBeenCalledTimes(1);

    const invalidRelations: PortkeyCaRelationResult[] = [
      {
        caAddress: createEphemeralProof().caAddress,
        caHash: proof.caHash,
        chainId: "AELF",
        managerAddress: proof.managerAddress,
        relationDigest: "a".repeat(64),
        relationRevision: "revision-wrong-ca",
        status: "verified",
      },
      {
        caAddress: proof.caAddress,
        caHash: "0".repeat(64),
        chainId: "AELF",
        managerAddress: proof.managerAddress,
        relationDigest: "b".repeat(64),
        relationRevision: "revision-wrong-hash",
        status: "verified",
      },
      {
        caAddress: proof.caAddress,
        caHash: proof.caHash,
        chainId: "tDVV",
        managerAddress: proof.managerAddress,
        relationDigest: "c".repeat(64),
        relationRevision: "revision-wrong-chain",
        status: "verified",
      },
      {
        caAddress: proof.caAddress,
        caHash: proof.caHash,
        chainId: "AELF",
        managerAddress: createEphemeralProof().managerAddress,
        relationDigest: "d".repeat(64),
        relationRevision: "revision-rotated",
        status: "verified",
      },
      {
        diagnostic: {
          code: "WALLET_AUTH_CA_RELATION_STALE",
          field: "relation",
          severity: "error",
          traceId: "trace-unsafe-provider",
        },
        retryable: false,
        status: "rejected",
      },
    ];
    for (const relation of invalidRelations) {
      const provider = relationProvider(proof, relation);
      const result = await verifier(proof, { relationProvider: provider }).verify(request(proof));
      expect(result).toMatchObject({ status: "rejected" });
      expect(result).not.toHaveProperty("subject");
      expect(provider.verifyRelation).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects conflicting CA/manager hints but ignores account/source/extraInfo authority claims", async () => {
    const proof = createEphemeralProof();
    const provider = relationProvider(proof);
    const selected = verifier(proof, { relationProvider: provider });

    expect(await selected.verify(request(proof, {
      adapterProof: { caAddress: createEphemeralProof().caAddress },
    }))).toMatchObject({ status: "rejected" });
    expect(await selected.verify(request(proof, {
      adapterProof: { managerAddress: createEphemeralProof().managerAddress },
    }))).toMatchObject({ status: "rejected" });
    expect(provider.verifyRelation).not.toHaveBeenCalled();

    const result = await selected.verify(request(proof, {
      adapterProof: {
        accountType: "EOA",
        adapterId: "client-selected-adapter",
        extraInfo: { caAddress: createEphemeralProof().caAddress, relation: "claimed" },
        walletSource: "NIGHTELF",
      },
    }));
    expect(result).toMatchObject({ status: "verified" });
    expect(provider.verifyRelation).toHaveBeenCalledTimes(1);
    if (result.status === "verified") {
      expect(result.subject).toMatchObject({
        accountType: "AA",
        adapterId: "portkey-aa",
        walletAddress: proof.caAddress,
        walletSource: "PORTKEY_AA",
      });
    }
  });

  it("still requires exactly one relation lookup when manager and CA addresses coincide", async () => {
    const proof = createEphemeralProof();
    let randomCall = 0;
    const issued = issueCanonicalWalletAuthenticationChallenge({
      audience: "campaign-os-participant",
      binding: binding(),
      caHash: proof.caHash,
      chainId: "AELF",
      clock: { now: () => new Date(NOW) },
      domain: "campaign.example",
      random: { randomBytes: () => randomBytes(32).map((value) => value ^ ++randomCall) },
      requestedWalletAddress: proof.managerAddress,
      traceId: "trace-aa-coincident",
      uri: "https://campaign.example/auth/wallet",
    });
    const verified = verifyCanonicalWalletAuthenticationChallenge({
      clock: { now: () => new Date(NOW) },
      clockSkewSeconds: 30,
      message: issued.projection.message,
      nonce: issued.projection.nonce,
      snapshot: issued.snapshot,
      traceId: "trace-aa-coincident",
    });
    if (verified.status !== "verified") {
      throw new Error("Expected coincident canonical challenge.");
    }
    const coincident = {
      ...proof,
      caAddress: proof.managerAddress,
      challenge: verified.challenge,
      signature: Uint8Array.from(AElf.wallet.sign(
      Buffer.from(verified.challenge.exactMessageBytes).toString("hex"),
      proof.managerKey,
      )),
    };
    const provider = relationProvider(coincident);

    const result = await verifier(coincident, { relationProvider: provider }).verify(request(coincident));
    expect(result).toMatchObject({ status: "verified" });
    expect(provider.verifyRelation).toHaveBeenCalledTimes(1);
  });

  it("sanitizes crypto, provider and circular error causes without raw material", async () => {
    const proof = createEphemeralProof();
    const unsafe = `${Buffer.from(proof.signature).toString("hex")}-${randomBytes(32).toString("hex")}`;
    const circular: { cause?: unknown } = {};
    circular.cause = circular;
    const crypto: PortkeyAaCryptoPort = {
      recover: vi.fn(() => { throw Object.assign(new Error(unsafe), circular); }),
    };
    const cryptoProvider = relationProvider(proof);
    const cryptoFailure = await verifier(proof, { crypto, relationProvider: cryptoProvider })
      .verify(request(proof));
    expect(cryptoProvider.verifyRelation).not.toHaveBeenCalled();

    const outageProvider = relationProvider(proof, () => {
      throw Object.assign(new Error(unsafe), circular);
    });
    const providerFailure = await verifier(proof, { relationProvider: outageProvider })
      .verify(request(proof));

    for (const result of [cryptoFailure, providerFailure]) {
      const serialized = JSON.stringify(result);
      expect(result).toMatchObject({ status: "unavailable" });
      expect(serialized).not.toContain(unsafe);
      expect(serialized).not.toMatch(/stack|cause|message|signature|publicKey|endpoint/i);
      expect(serialized.length).toBeLessThan(512);
    }
  });

  it("propagates abort at async boundaries and never falls back to EOA or stale authority", async () => {
    const proof = createEphemeralProof();
    const before = new AbortController();
    before.abort();
    const beforeProvider = relationProvider(proof);
    expect(await verifier(proof, { relationProvider: beforeProvider }).verify(
      request(proof),
      before.signal,
    )).toMatchObject({ status: "unavailable" });
    expect(beforeProvider.verifyRelation).not.toHaveBeenCalled();

    const during = new AbortController();
    const duringProvider: PortkeyCaRelationProvider = {
      close: vi.fn(async () => undefined),
      id: "stage-portkey-ca",
      verifyRelation: vi.fn<PortkeyCaRelationProvider["verifyRelation"]>(
        (_relationRequest, signal) => new Promise<PortkeyCaRelationResult>((resolve) => {
        signal?.addEventListener("abort", () => resolve({
          diagnostic: {
            code: "WALLET_AUTH_CA_RELATION_UNAVAILABLE",
            field: "relation",
            severity: "error",
            traceId: "trace-aa-abort",
          },
          retryable: false,
          status: "unavailable",
        }), { once: true });
      })),
    };
    const pending = verifier(proof, { relationProvider: duringProvider }).verify(
      request(proof),
      during.signal,
    );
    await vi.waitFor(() => expect(duringProvider.verifyRelation).toHaveBeenCalledTimes(1));
    during.abort();
    const result = await pending;
    expect(result).toMatchObject({ status: "unavailable" });
    expect(result).not.toHaveProperty("subject");
  });

  it("requires independent binding approval and a ready branded production provider", async () => {
    const proof = createEphemeralProof();
    expect(verifier(proof).readiness()).toEqual({
      environment: "stage",
      productionApproved: false,
      status: "stage_only",
    });

    expect(() => verifier(proof, {
      binding: binding({ productionApproved: false }),
      environment: "production",
    })).toThrowError(PortkeyAaSignatureVerifierConfigurationError);

    const forgedAuthority = Object.freeze({
      accepting: true,
      environment: "production" as const,
      productionApproved: true,
    });
    const unbrandedProvider = {
      authority: forgedAuthority,
      close: vi.fn(async () => undefined),
      id: "stage-portkey-ca",
      state: () => ({ ...forgedAuthority, activeCallCount: 0 }),
      verifyRelation: relationProvider(proof).verifyRelation,
    } as PortkeyCaRelationProvider;
    expect(() => verifier(proof, {
      binding: binding({ productionApproved: true }),
      environment: "production",
      relationProvider: unbrandedProvider,
    })).toThrowError(PortkeyAaSignatureVerifierConfigurationError);

    const stageProvider = concreteRelationProvider("stage");
    const forgedStageCopy = {
      ...stageProvider,
      authority: forgedAuthority,
      state: () => ({ ...forgedAuthority, activeCallCount: 0 }),
    };
    expect(() => verifier(proof, {
      binding: binding({ productionApproved: true }),
      environment: "production",
      relationProvider: forgedStageCopy,
    })).toThrowError(PortkeyAaSignatureVerifierConfigurationError);
    expect(() => verifier(proof, {
      binding: binding({ productionApproved: true }),
      environment: "production",
      relationProvider: stageProvider,
    })).toThrowError(PortkeyAaSignatureVerifierConfigurationError);
    await stageProvider.close();

    const productionProvider = concreteRelationProvider("production");
    const productionVerifier = verifier(proof, {
      binding: binding({ productionApproved: true }),
      environment: "production",
      relationProvider: productionProvider,
    });
    expect(productionVerifier.readiness()).toEqual({
      environment: "production",
      productionApproved: true,
      status: "production_ready",
    });
    await productionProvider.close();
    expect(productionVerifier.readiness()).toEqual({
      environment: "production",
      productionApproved: false,
      status: "stage_only",
    });
    expect(await productionVerifier.verify(request(proof)))
      .toMatchObject({ status: "unavailable" });
  });

  it("rejects unknown binding semantics, provider identity and an expired canonical challenge", async () => {
    const proof = createEphemeralProof();
    const invalidBindings = [
      binding({ hashStrategyId: "unknown-hash" }),
      binding({ proofMethod: "AELF_EOA_RECOVERABLE" }),
      binding({ accountType: "EOA" }),
      binding({ walletSource: "NIGHTELF" }),
    ];
    for (const candidate of invalidBindings) {
      expect(() => verifier(proof, { binding: candidate }))
        .toThrowError(PortkeyAaSignatureVerifierConfigurationError);
    }
    expect(() => verifier(proof, {
      relationProvider: { ...relationProvider(proof), id: "another-provider" },
    })).toThrowError(PortkeyAaSignatureVerifierConfigurationError);

    const expired = verifyCanonicalWalletAuthenticationChallenge({
      clock: { now: () => new Date(NOW.getTime() + 10 * 60_000) },
      clockSkewSeconds: 0,
      message: proof.issued.projection.message,
      nonce: proof.issued.projection.nonce,
      snapshot: proof.issued.snapshot,
      traceId: "trace-aa-expired",
    });
    expect(expired).toMatchObject({ status: "rejected" });
  });

  it("accepts a valid cross-realm clock without exposing clock implementation detail", async () => {
    const proof = createEphemeralProof();
    const crossRealmNow = runInNewContext(
      `new Date('${NOW.toISOString()}')`,
    ) as Date;
    expect(await verifier(proof, { clock: { now: () => crossRealmNow } }).verify(request(proof)))
      .toMatchObject({ status: "verified" });
  });
});
