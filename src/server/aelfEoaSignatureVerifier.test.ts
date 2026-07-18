import AElf from "aelf-sdk";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import type { WalletProofVerificationRequest } from "./walletAuthentication";
import type { WalletVerifierBinding } from "./walletAuthenticationConfig";
import {
  AELF_EOA_HASH_STRATEGY_ID,
  AelfEoaSignatureVerifierConfigurationError,
  createAelfEoaSignatureVerifier,
  decodeAelfRecoverableSignature,
  type AelfEoaCryptoPort,
} from "./aelfEoaSignatureVerifier";
import {
  issueCanonicalWalletAuthenticationChallenge,
  verifyCanonicalWalletAuthenticationChallenge,
} from "./walletAuthenticationChallenge";

const binding = (overrides: Partial<WalletVerifierBinding> = {}): WalletVerifierBinding => ({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: AELF_EOA_HASH_STRATEGY_ID,
  network: "testnet",
  productionApproved: false,
  proofMethod: "AELF_EOA_RECOVERABLE",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_EOA_APP",
  ...overrides,
});

const createEphemeralProof = () => {
  const keyPair = AElf.wallet.ellipticEc.genKeyPair();
  const address = AElf.wallet.getAddressFromPubKey(keyPair.getPublic());
  let randomCall = 0;
  const issued = issueCanonicalWalletAuthenticationChallenge({
    audience: "campaign-os-participant",
    binding: binding(),
    chainId: "AELF",
    clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    domain: "campaign.example",
    random: { randomBytes: () => new Uint8Array(32).fill(++randomCall) },
    requestedWalletAddress: address,
    traceId: "trace-eoa-challenge",
    uri: "https://campaign.example/auth/wallet",
  });
  const verified = verifyCanonicalWalletAuthenticationChallenge({
    clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    clockSkewSeconds: 30,
    message: issued.projection.message,
    nonce: issued.projection.nonce,
    snapshot: issued.snapshot,
    traceId: "trace-eoa-challenge",
  });
  if (verified.status !== "verified") {
    throw new Error("Expected canonical EOA challenge material.");
  }
  const bytes = verified.challenge.exactMessageBytes;
  const signature = Uint8Array.from(AElf.wallet.sign(Buffer.from(bytes).toString("hex"), keyPair));
  const publicKey = Uint8Array.from(keyPair.getPublic().encode("array", false));

  return {
    address,
    bytes,
    challenge: verified.challenge,
    keyPair,
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
  traceId: "trace-eoa-1",
  ...overrides,
});

const verifier = (overrides: Partial<Parameters<typeof createAelfEoaSignatureVerifier>[0]> = {}) =>
  createAelfEoaSignatureVerifier({
    binding: binding(),
    clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    ...overrides,
  });

const secp256k1Order = (): bigint => {
  const runtime = AElf.wallet.ellipticEc as unknown as {
    readonly n: Readonly<{ toString(radix: number): string }>;
  };
  return BigInt(`0x${runtime.n.toString(16)}`);
};

describe("AElf EOA recoverable signature verifier", () => {
  it("signs exact bytes with an ephemeral signer and issues trusted server-owned subject fields", async () => {
    const proof = createEphemeralProof();
    const r = BigInt(`0x${Buffer.from(proof.signature.slice(0, 32)).toString("hex")}`);
    const s = BigInt(`0x${Buffer.from(proof.signature.slice(32, 64)).toString("hex")}`);
    const order = secp256k1Order();
    const halfOrder = order / 2n;
    expect(proof.signature.byteLength).toBe(65);
    expect(proof.bytes.byteLength).toBeGreaterThan(0);
    expect(proof.signature[64]).toBeLessThanOrEqual(3);
    expect(r > 0n && r < order).toBe(true);
    expect(s > 0n).toBe(true);
    expect(s <= halfOrder).toBe(true);
    const result = await verifier().verify(request(proof));

    expect(result.status).toBe("verified");
    if (result.status !== "verified") {
      throw new Error("Expected verified EOA proof.");
    }
    expect(result.subject).toMatchObject({
      accountType: "EOA",
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      proofMethod: "AELF_EOA_RECOVERABLE",
      signerAddress: proof.address,
      verifiedAt: "2026-07-18T04:00:00.000Z",
      walletAddress: proof.address,
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(result.subject.proofDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.subject).not.toHaveProperty("adapterProof");
    expect(result.subject).not.toHaveProperty("publicKey");
    expect(result.subject).not.toHaveProperty("signature");
  });

  it("rejects another message, signer, address, public key, chain and network", async () => {
    const proof = createEphemeralProof();
    const other = createEphemeralProof();
    const differentBytes = new TextEncoder().encode("different challenge bytes");
    const differentMessageSignature = Uint8Array.from(AElf.wallet.sign(
      Buffer.from(differentBytes).toString("hex"),
      proof.keyPair,
    ));
    const variants: WalletProofVerificationRequest[] = [
      request(proof, { signature: differentMessageSignature }),
      request(proof, { signature: other.signature }),
      request(proof, {
        challenge: { ...request(proof).challenge, requestedWalletAddress: other.address },
      }),
      request(proof, { publicKey: other.publicKey }),
      request(proof, { challenge: { ...request(proof).challenge, chainId: "tDVV" } }),
      request(proof, { challenge: { ...request(proof).challenge, network: "mainnet" } }),
    ];

    for (const candidate of variants) {
      expect(await verifier().verify(candidate)).toMatchObject({ status: "rejected" });
    }
  });

  it("rejects an unbranded challenge even when its exact bytes have a valid signature", async () => {
    const proof = createEphemeralProof();
    const crypto: AelfEoaCryptoPort = {
      recover: vi.fn(() => ({
        address: proof.address,
        messageDigest: AElf.utils.sha256(proof.bytes),
        publicKey: proof.publicKey,
      })),
    };
    const forgedChallenge = { ...proof.challenge };

    expect(await verifier({ crypto }).verify(request(proof, { challenge: forgedChallenge })))
      .toMatchObject({ status: "rejected" });
    expect(crypto.recover).not.toHaveBeenCalled();
  });

  it("rejects adapter-incompatible prehashing and accepts a matching compressed public key", async () => {
    const proof = createEphemeralProof();
    const digestHex = AElf.utils.sha256(proof.bytes);
    const prehashedSignature = Uint8Array.from(AElf.wallet.sign(digestHex, proof.keyPair));
    const compressedPublicKey = Uint8Array.from(proof.keyPair.getPublic().encode("array", true));

    expect(await verifier().verify(request(proof, { signature: prehashedSignature })))
      .toMatchObject({ status: "rejected" });
    expect(await verifier().verify(request(proof, { publicKey: compressedPublicKey })))
      .toMatchObject({ status: "verified" });
  });

  it("rejects malformed, odd, alternate encoding and oversized signatures before crypto", () => {
    const cases: unknown[] = [
      "",
      "0",
      "a".repeat(129),
      "a".repeat(131),
      "z".repeat(130),
      Buffer.alloc(65).toString("base64"),
      `a${String.fromCharCode(10)}${"b".repeat(128)}`,
    ];

    for (const encoded of cases) {
      expect(decodeAelfRecoverableSignature(encoded, "trace-decode-1"))
        .toMatchObject({ status: "rejected" });
    }

    const proof = createEphemeralProof();
    const order = secp256k1Order();
    const highSignature = Uint8Array.from(proof.signature);
    const lowS = BigInt(`0x${Buffer.from(highSignature.slice(32, 64)).toString("hex")}`);
    const highSHex = (order - lowS).toString(16).padStart(64, "0");
    highSignature.set(Buffer.from(highSHex, "hex"), 32);
    const invalidRecovery = Uint8Array.from(proof.signature);
    invalidRecovery[64] = 4;
    const variants = [
      new Uint8Array(0),
      new Uint8Array(64),
      new Uint8Array(66),
      invalidRecovery,
      highSignature,
    ];
    return Promise.all(variants.map(async (signature) => {
      expect(await verifier().verify(request(proof, { signature })))
        .toMatchObject({ status: "rejected" });
    }));
  });

  it("decodes only canonical recoverable hex and returns defensive bytes", () => {
    const proof = createEphemeralProof();
    const decoded = decodeAelfRecoverableSignature(
      Buffer.from(proof.signature).toString("hex"),
      "trace-decode-2",
    );
    expect(decoded.status).toBe("decoded");
    if (decoded.status !== "decoded") {
      throw new Error("Expected decoded signature bytes.");
    }
    const first = decoded.signature[0];
    proof.signature.fill(0);
    expect(decoded.signature[0]).toBe(first);
  });

  it("rejects client metadata and extra proof rather than treating it as authority", async () => {
    const proof = createEphemeralProof();
    const result = await verifier().verify(request(proof, {
      adapterProof: {
        accountType: "AA",
        adapterId: "another-adapter",
        walletSource: "NIGHTELF",
      },
    }));

    expect(result).toMatchObject({ status: "rejected" });
  });

  it("copies binding authority before later caller mutation", async () => {
    const proof = createEphemeralProof();
    const mutableBinding = binding();
    const selected = createAelfEoaSignatureVerifier({
      binding: mutableBinding,
      clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
    });

    (mutableBinding as { adapterId: string }).adapterId = "changed-after-factory";
    (mutableBinding.chainIds as Array<"AELF" | "tDVV" | "tDVW">)[0] = "tDVV";
    (mutableBinding as { walletSource: "NIGHTELF" }).walletSource = "NIGHTELF";

    expect(await selected.verify(request(proof))).toMatchObject({ status: "verified" });
  });

  it("rejects unknown hash, encoding, account type and proof method configuration", () => {
    const invalid = [
      binding({ hashStrategyId: "unknown-strategy" }),
      binding({ signatureEncoding: "unknown-encoding" as never }),
      binding({ accountType: "AA" }),
      binding({ proofMethod: "PORTKEY_AA_MANAGER_CA" }),
    ];

    for (const candidate of invalid) {
      expect(() => createAelfEoaSignatureVerifier({
        binding: candidate,
        clock: { now: () => new Date("2026-07-18T04:00:00.000Z") },
      })).toThrowError(AelfEoaSignatureVerifierConfigurationError);
    }
  });

  it("converts crypto and clock failures to diagnostics without raw causes", async () => {
    const proof = createEphemeralProof();
    const unsafeCause = ["provider", "internal", "material"].join("-");
    const crypto: AelfEoaCryptoPort = {
      recover: vi.fn(() => {
        throw new Error(unsafeCause);
      }),
    };
    const cryptoFailure = await verifier({ crypto }).verify(request(proof));
    const clockFailure = await verifier({
      clock: { now: () => { throw new Error(unsafeCause); } },
    }).verify(request(proof));

    for (const result of [cryptoFailure, clockFailure]) {
      expect(result).toMatchObject({ status: "unavailable" });
      const serialized = JSON.stringify(result);
      expect(!serialized.includes(unsafeCause)).toBe(true);
      expect(!/stack|cause|message/i.test(serialized)).toBe(true);
    }
    expect(crypto.recover).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid clock instant created in another realm", async () => {
    const proof = createEphemeralProof();
    const crossRealmNow = runInNewContext(
      "new Date('2026-07-18T04:00:00.000Z')",
    ) as Date;

    expect(await verifier({ clock: { now: () => crossRealmNow } }).verify(request(proof)))
      .toMatchObject({ status: "verified" });
  });

  it("honors an already-aborted signal before invoking crypto", async () => {
    const proof = createEphemeralProof();
    const crypto: AelfEoaCryptoPort = {
      recover: vi.fn(() => ({
        address: proof.address,
        messageDigest: "a".repeat(64),
        publicKey: proof.publicKey,
      })),
    };
    const controller = new AbortController();
    controller.abort();

    expect(await verifier({ crypto }).verify(request(proof), controller.signal))
      .toMatchObject({ status: "unavailable" });
    expect(crypto.recover).not.toHaveBeenCalled();
  });
});
