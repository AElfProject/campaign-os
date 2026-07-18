import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import AElf from "aelf-sdk";
import { describe, expect, it } from "vitest";
import type { WalletVerifierBinding } from "./walletAuthenticationConfig";
import {
  WALLET_AUTHENTICATION_PROTOCOL_VERSION,
  WalletAuthenticationChallengeError,
  isCanonicalAelfWalletAddress,
  isVerifiedWalletProofChallengeMaterial,
  issueCanonicalWalletAuthenticationChallenge,
  verifyCanonicalWalletAuthenticationChallenge,
  type IssueCanonicalWalletAuthenticationChallengeInput,
} from "./walletAuthenticationChallenge";

const NOW = "2026-07-18T04:00:00.000Z";
const WALLET_ADDRESS = AElf.wallet.getAddressFromPubKey(
  AElf.wallet.ellipticEc.genKeyPair().getPublic(),
);

const eoaBinding = (overrides: Partial<WalletVerifierBinding> = {}): WalletVerifierBinding => ({
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

const sequenceRandom = () => {
  const generated = [
    new Uint8Array(32).fill(1),
    new Uint8Array(32).fill(2),
    new Uint8Array(32).fill(3),
  ];
  let index = 0;

  return {
    generated,
    random: {
      randomBytes: (size: number) => {
        const value = generated[index++];
        return value?.byteLength === size ? value : new Uint8Array(0);
      },
    },
  };
};

const baseInput = (): IssueCanonicalWalletAuthenticationChallengeInput => ({
  audience: "campaign-os-participant",
  binding: eoaBinding(),
  chainId: "AELF",
  clock: { now: () => new Date(NOW) },
  domain: "campaign.example",
  random: sequenceRandom().random,
  requestedWalletAddress: WALLET_ADDRESS,
  traceId: "trace-challenge-1",
  uri: "https://campaign.example/auth/wallet",
});

const issue = (overrides: Partial<IssueCanonicalWalletAuthenticationChallengeInput> = {}) => {
  const random = sequenceRandom();
  return issueCanonicalWalletAuthenticationChallenge({
    ...baseInput(),
    random: random.random,
    ...overrides,
  });
};

const verify = (
  issued: ReturnType<typeof issue>,
  overrides: Partial<Parameters<typeof verifyCanonicalWalletAuthenticationChallenge>[0]> = {},
) => verifyCanonicalWalletAuthenticationChallenge({
  clock: { now: () => new Date(NOW) },
  clockSkewSeconds: 30,
  message: issued.projection.message,
  nonce: issued.projection.nonce,
  snapshot: issued.snapshot,
  traceId: "trace-verify-1",
  ...overrides,
});

describe("canonical wallet authentication challenge", () => {
  it("builds exact UTF-8 bytes with fixed LF labels and order", () => {
    const issued = issue();
    const nonce = Buffer.from(new Uint8Array(32).fill(3)).toString("base64url");
    const requestId = `war_${Buffer.from(new Uint8Array(32).fill(2)).toString("base64url")}`;
    const expected = [
      "aelf Campaign OS Wallet Authentication",
      `Version: ${WALLET_AUTHENTICATION_PROTOCOL_VERSION}`,
      "Domain: campaign.example",
      "URI: https://campaign.example/auth/wallet",
      "Audience: campaign-os-participant",
      `Wallet Address: ${WALLET_ADDRESS}`,
      "Adapter: portkey-discover-eoa",
      "Chain ID: AELF",
      "Network: testnet",
      "CA Hash: -",
      `Nonce: ${nonce}`,
      `Issued At: ${NOW}`,
      "Expires At: 2026-07-18T04:05:00.000Z",
      `Request ID: ${requestId}`,
    ].join("\n");

    expect(issued.projection.message === expected).toBe(true);
    expect(!issued.projection.message.includes("\r")).toBe(true);
    expect(issued.snapshot.messageDigest).toBe(
      createHash("sha256").update(expected, "utf8").digest("hex"),
    );
    expect(issued.snapshot.nonceDigest).toBe(
      createHash("sha256").update(nonce, "utf8").digest("hex"),
    );
    expect(Object.isFrozen(issued)).toBe(true);
    expect(Object.isFrozen(issued.projection)).toBe(true);
    expect(Object.isFrozen(issued.snapshot)).toBe(true);
  });

  it("rejects CRLF, reordered fields, whitespace drift, label drift and every field tamper", () => {
    const issued = issue();
    const lines = issued.projection.message.split("\n");
    const variants = [
      issued.projection.message.split("\n").join("\r\n"),
      [...lines.slice(0, 2), lines[3], lines[2], ...lines.slice(4)].join("\n"),
      issued.projection.message.replace("Domain: ", "Domain:  "),
      issued.projection.message.replace("Audience:", "Audience :"),
      ...lines.slice(1).map((line) => issued.projection.message.replace(line, `${line}x`)),
    ];

    for (const message of variants) {
      expect(verify(issued, { message })).toMatchObject({ status: "rejected" });
    }
  });

  it("validates bounded canonical fields without exposing rejected values", () => {
    const decomposed = `cafe${String.fromCharCode(0x301)}.example`;
    const cases: Array<[
      Partial<IssueCanonicalWalletAuthenticationChallengeInput>,
      string,
    ]> = [
      [{ domain: "" }, "domain"],
      [{ domain: `campaign${String.fromCharCode(10)}.example` }, "domain"],
      [{ domain: decomposed }, "domain"],
      [{ audience: "a".repeat(257) }, "audience"],
      [{ uri: "ftp://campaign.example/auth" }, "uri"],
      [{ uri: "https://other.example/auth" }, "uri"],
      [{ requestedWalletAddress: "not-an-aelf-address" }, "requestedWalletAddress"],
      [{
        requestedWalletAddress: `${WALLET_ADDRESS.slice(0, -1)}${WALLET_ADDRESS.endsWith("1") ? "2" : "1"}`,
      }, "requestedWalletAddress"],
      [{ chainId: "OTHER" as never }, "chainId"],
      [{ binding: eoaBinding({ network: "unknown" as never }) }, "binding.network"],
      [{ caHash: "a".repeat(64) }, "caHash"],
    ];

    for (const [overrides, field] of cases) {
      let captured: unknown;
      try {
        issue(overrides);
      } catch (error) {
        captured = error;
      }

      expect(captured).toBeInstanceOf(WalletAuthenticationChallengeError);
      expect(captured).toMatchObject({ field, traceId: "trace-challenge-1" });
      expect(!JSON.stringify(captured).includes(decomposed)).toBe(true);
      expect((captured as Error).message).toBe("Wallet authentication challenge input is invalid.");
    }
  });

  it("uses three independent 256-bit random values and rejects short random output", () => {
    const source = sequenceRandom();
    const issued = issueCanonicalWalletAuthenticationChallenge({
      ...baseInput(),
      random: source.random,
    });

    source.generated.forEach((bytes) => bytes.fill(9));

    expect(issued.snapshot.id).toMatch(/^wac_[A-Za-z0-9_-]{43}$/);
    expect(issued.snapshot.requestId).toMatch(/^war_[A-Za-z0-9_-]{43}$/);
    expect(/^[A-Za-z0-9_-]{43}$/.test(issued.projection.nonce)).toBe(true);
    expect(
      issued.projection.nonce
      === Buffer.from(new Uint8Array(32).fill(3)).toString("base64url"),
    ).toBe(true);

    expect(() => issue({
      random: { randomBytes: () => new Uint8Array(31) },
    })).toThrowError(expect.objectContaining({ field: "random" }));
    expect(() => issue({
      random: { randomBytes: () => new Uint8Array(32).fill(4) },
    })).toThrowError(expect.objectContaining({ field: "random" }));
  });

  it("enforces default, minimum and maximum TTL with deterministic injected time", () => {
    expect(issue().snapshot.expiresAt).toBe("2026-07-18T04:05:00.000Z");
    expect(issue({ ttlSeconds: 30 }).snapshot.expiresAt).toBe("2026-07-18T04:00:30.000Z");
    expect(issue({ ttlSeconds: 600 }).snapshot.expiresAt).toBe("2026-07-18T04:10:00.000Z");
    expect(() => issue({ ttlSeconds: 29 })).toThrowError(
      expect.objectContaining({ field: "ttlSeconds" }),
    );
    expect(() => issue({ ttlSeconds: 601 })).toThrowError(
      expect.objectContaining({ field: "ttlSeconds" }),
    );
  });

  it("accepts bounded skew and rejects expiry, future issuance and invalid time ordering", () => {
    const issued = issue({ ttlSeconds: 30 });
    expect(verify(issued, {
      clock: { now: () => new Date("2026-07-18T04:01:00.000Z") },
    })).toMatchObject({ status: "verified" });
    expect(verify(issued, {
      clock: { now: () => new Date("2026-07-18T04:01:00.001Z") },
    })).toMatchObject({ status: "rejected" });

    const future = issue({
      clock: { now: () => new Date("2026-07-18T04:01:00.001Z") },
    });
    expect(verify(future)).toMatchObject({ status: "rejected" });

    expect(verify(issued, {
      snapshot: {
        ...issued.snapshot,
        expiresAt: issued.snapshot.issuedAt,
      },
    })).toMatchObject({ status: "rejected" });
  });

  it("uses canonical dash for EOA and a canonical hash for AA", () => {
    expect(issue().projection.message.includes("\nCA Hash: -\n")).toBe(true);

    const aa = issue({
      binding: eoaBinding({
        accountType: "AA",
        caRelationProviderId: "stage-ca-provider",
        proofMethod: "PORTKEY_AA_MANAGER_CA",
        walletSource: "PORTKEY_AA",
      }),
      caHash: "a".repeat(64),
    });
    expect(aa.projection.message.includes(`\nCA Hash: ${"a".repeat(64)}\n`)).toBe(true);
  });

  it("returns defensive verifier bytes after exact message and nonce digest checks", () => {
    const issued = issue();
    const verified = verify(issued);
    expect(verified.status).toBe("verified");
    if (verified.status !== "verified") {
      throw new Error("Expected verified challenge material.");
    }

    const first = verified.challenge.exactMessageBytes;
    const expectedFirstByte = first[0];
    first.fill(0);

    expect(verified.challenge.exactMessageBytes[0]).toBe(expectedFirstByte);
    expect(
      new TextDecoder().decode(verified.challenge.exactMessageBytes)
      === issued.projection.message,
    ).toBe(true);
    expect(verify(issued, { nonce: `${issued.projection.nonce.slice(0, -1)}A` }))
      .toMatchObject({ status: "rejected" });
  });

  it("brands only verifier material created after exact canonical verification", () => {
    const issued = issue();
    const verified = verify(issued);
    expect(verified.status).toBe("verified");
    if (verified.status !== "verified") {
      throw new Error("Expected verified challenge material.");
    }

    expect(isVerifiedWalletProofChallengeMaterial(verified.challenge)).toBe(true);
    expect(isVerifiedWalletProofChallengeMaterial({ ...verified.challenge })).toBe(false);
  });

  it("accepts valid clock instants from another realm", () => {
    const crossRealmNow = runInNewContext(
      "new Date('2026-07-18T04:00:00.000Z')",
    ) as Date;
    const issued = issue({ clock: { now: () => crossRealmNow } });

    expect(verify(issued, { clock: { now: () => crossRealmNow } }))
      .toMatchObject({ status: "verified" });
  });

  it("rejects accessors without invoking them or exposing their thrown values", () => {
    const unsafeCause = ["private", "challenge", "material"].join("-");
    let issueGetterCalls = 0;
    const issueInput = { ...baseInput() };
    Object.defineProperty(issueInput, "domain", {
      enumerable: true,
      get: () => {
        issueGetterCalls += 1;
        throw new Error(unsafeCause);
      },
    });

    let captured: unknown;
    try {
      issueCanonicalWalletAuthenticationChallenge(issueInput);
    } catch (error) {
      captured = error;
    }
    expect(issueGetterCalls).toBe(0);
    expect(captured).toMatchObject({ field: "domain" });
    expect(!JSON.stringify(captured).includes(unsafeCause)).toBe(true);

    const issued = issue();
    let snapshotGetterCalls = 0;
    const snapshot = { ...issued.snapshot };
    Object.defineProperty(snapshot, "audience", {
      enumerable: true,
      get: () => {
        snapshotGetterCalls += 1;
        throw new Error(unsafeCause);
      },
    });
    const result = verify(issued, { snapshot });
    expect(snapshotGetterCalls).toBe(0);
    expect(result).toMatchObject({ status: "rejected" });
    expect(!JSON.stringify(result).includes(unsafeCause)).toBe(true);
  });

  it("validates the SDK checksum and 32-byte address round trip", () => {
    const invalidChecksum = `${WALLET_ADDRESS.slice(0, -1)}${WALLET_ADDRESS.endsWith("1") ? "2" : "1"}`;
    expect(isCanonicalAelfWalletAddress(WALLET_ADDRESS)).toBe(true);
    expect(isCanonicalAelfWalletAddress(invalidChecksum)).toBe(false);
  });
});
