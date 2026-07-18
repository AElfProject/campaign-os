import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  WalletAuthenticationRandom,
  WalletCredentialCrypto,
} from "./walletAuthentication";
import {
  WALLET_SESSION_CREDENTIAL_BYTES,
  WALLET_SESSION_CSRF_PROTOCOL_VERSION,
  WALLET_SESSION_CSRF_SECRET_MIN_BYTES,
  WalletSessionCredentialError,
  areWalletSessionDigestsEqual,
  createWalletSessionCredentialService,
  createWalletSessionRuntimeCredentialPort,
  createWalletSessionCsrfSecret,
  deriveWalletSessionCsrf,
  digestWalletSessionCredentialCookie,
  digestWalletSessionCsrfToken,
  destroyWalletSessionCredential,
  destroyWalletSessionCsrfSecret,
  destroyWalletSessionCsrfToken,
  issueWalletSessionCredential,
  nodeWalletAuthenticationRandom,
  nodeWalletCredentialCrypto,
  parseWalletSessionCredentialDigest,
  projectWalletSessionCredentialFailure,
  projectWalletSessionCredentialForPersistence,
  projectWalletSessionCsrfForPersistence,
  revealWalletSessionCredentialForCookie,
  revealWalletSessionCsrfTokenForHeader,
  restoreWalletSessionCredentialFromCookie,
  verifyWalletSessionCsrf,
  verifyWalletSessionCsrfToken,
} from "./walletSessionCredential";

const traceId = "trace-wallet-session-credential";

const deterministicRandom = (
  byte = 7,
): WalletAuthenticationRandom & { readonly calls: number[] } => {
  const calls: number[] = [];
  return {
    calls,
    randomBytes: (size) => {
      calls.push(size);
      return new Uint8Array(size).fill(byte);
    },
  };
};

const issue = (byte = 7, crypto: WalletCredentialCrypto = nodeWalletCredentialCrypto) =>
  issueWalletSessionCredential({
    crypto,
    random: deterministicRandom(byte),
    traceId,
  });

const secret = (byte = 11) => createWalletSessionCsrfSecret(
  new Uint8Array(WALLET_SESSION_CSRF_SECRET_MIN_BYTES).fill(byte),
  traceId,
);

describe("wallet session credential", () => {
  it("issues a canonical 256-bit credential through deterministic and production random ports", async () => {
    const random = deterministicRandom(255);
    const issued = await issueWalletSessionCredential({ random, traceId });
    const raw = issued.exposeForCookie(traceId);
    const restored = restoreWalletSessionCredentialFromCookie(raw, traceId);

    expect(random.calls).toEqual([WALLET_SESSION_CREDENTIAL_BYTES]);
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(raw).not.toContain("=");
    expect(revealWalletSessionCredentialForCookie(restored, traceId)).toBe(raw);
    expect(() => issued.exposeForCookie(traceId)).toThrowError(
      expect.objectContaining({ field: "credential" }),
    );
    expect(issued.dispose()).toBe(false);
    expect(await issueWalletSessionCredential({ traceId })).toMatchObject({
      credentialDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(nodeWalletAuthenticationRandom.randomBytes(WALLET_SESSION_CREDENTIAL_BYTES))
      .toHaveLength(WALLET_SESSION_CREDENTIAL_BYTES);
  });

  it("rejects short, empty, all-zero, wrong-type and failed random output", async () => {
    const invalidSources: WalletAuthenticationRandom[] = [
      { randomBytes: () => new Uint8Array(31) },
      { randomBytes: () => new Uint8Array(0) },
      { randomBytes: () => new Uint8Array(WALLET_SESSION_CREDENTIAL_BYTES) },
      { randomBytes: () => "not-bytes" as never },
      { randomBytes: () => { throw new Error("raw-random-failure"); } },
    ];

    for (const random of invalidSources) {
      await expect(issueWalletSessionCredential({ random, traceId })).rejects.toMatchObject({
        code: "WALLET_AUTH_CREDENTIAL_RANDOM_INVALID",
        field: "random",
        traceId,
      });
    }
  });

  it("rejects non-canonical cookie encodings without echoing them", async () => {
    const issued = await issue(255);
    const raw = revealWalletSessionCredentialForCookie(issued.credential, traceId);
    const malformed = [
      "",
      `${raw}=`,
      raw.split("_").join("/"),
      Buffer.from(new Uint8Array(31).fill(1)).toString("base64url"),
      Buffer.from(new Uint8Array(WALLET_SESSION_CREDENTIAL_BYTES)).toString("base64url"),
      42,
    ];

    for (const value of malformed) {
      let captured: unknown;
      try {
        restoreWalletSessionCredentialFromCookie(value, traceId);
      } catch (error) {
        captured = error;
      }

      expect(captured).toBeInstanceOf(WalletSessionCredentialError);
      expect(captured).toMatchObject({
        code: "WALLET_AUTH_CREDENTIAL_INPUT_INVALID",
        field: "credential",
      });
      if (String(value).length > 0) {
        expect(JSON.stringify(captured)).not.toContain(String(value));
      }
    }
  });

  it("hashes the canonical credential to a fixed lowercase SHA-256 digest", async () => {
    const issued = await issue(19);
    const raw = revealWalletSessionCredentialForCookie(issued.credential, traceId);
    const expected = createHash("sha256").update(raw, "utf8").digest("hex");

    expect(issued.credentialDigest).toBe(expected);
    expect(await digestWalletSessionCredentialCookie(raw, { traceId }))
      .toBe(issued.credentialDigest);
    expect(issued.credentialDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(parseWalletSessionCredentialDigest(expected, traceId)).toBe(expected);
    expect(() => parseWalletSessionCredentialDigest(expected.toUpperCase(), traceId))
      .toThrowError(expect.objectContaining({ field: "credentialDigest" }));
  });

  it("keeps raw credentials out of JSON and persistence projections", async () => {
    const issued = await issue(23);
    const raw = revealWalletSessionCredentialForCookie(issued.credential, traceId);
    const projection = projectWalletSessionCredentialForPersistence(issued, traceId);

    expect(projection).toEqual({ credentialDigest: issued.credentialDigest });
    expect(Reflect.ownKeys(projection)).toEqual(["credentialDigest"]);
    expect(JSON.stringify(issued)).not.toContain(raw);
    expect(JSON.stringify(projection)).not.toContain(raw);
    expect(issued.credential).not.toHaveProperty("toJSON");
    expect(Object.isFrozen(projection)).toBe(true);
    expect(issued.dispose()).toBe(true);
  });

  it("invalidates explicit in-memory credential handles", async () => {
    const issued = await issue(29);

    expect(destroyWalletSessionCredential(issued.credential)).toBe(true);
    expect(destroyWalletSessionCredential(issued.credential)).toBe(false);
    expect(() => revealWalletSessionCredentialForCookie(issued.credential, traceId))
      .toThrowError(expect.objectContaining({ field: "credential" }));
  });
});

describe("wallet session CSRF", () => {
  it("constructs only branded shared secrets with at least 32 non-zero bytes", async () => {
    const valid = secret();
    const invalid = [
      undefined,
      "shared-secret",
      new Uint8Array(),
      new Uint8Array(WALLET_SESSION_CSRF_SECRET_MIN_BYTES - 1).fill(1),
      new Uint8Array(WALLET_SESSION_CSRF_SECRET_MIN_BYTES),
    ];

    expect(valid).not.toHaveProperty("toJSON");
    expect(JSON.stringify(valid)).toBe("{}");
    for (const value of invalid) {
      expect(() => createWalletSessionCsrfSecret(value, traceId)).toThrowError(
        expect.objectContaining({
          code: "WALLET_AUTH_CSRF_SECRET_INVALID",
          field: "csrfSecret",
        }),
      );
    }
    await expect(deriveWalletSessionCsrf({
      credentialDigest: "a".repeat(64) as never,
      csrfSecret: {} as never,
      publicSessionId: "wallet-session-public-1",
      sessionVersion: 1,
      traceId,
    })).rejects.toMatchObject({ field: "csrfSecret" });
  });

  it("derives stable versioned HMAC tokens bound to every session input", async () => {
    const credentialA = await issue(31);
    const credentialB = await issue(32);
    const csrfSecret = secret(13);
    const base = {
      credentialDigest: credentialA.credentialDigest,
      csrfSecret,
      publicSessionId: "wallet-session-public-1",
      sessionVersion: 1,
      traceId,
    } as const;
    const baseline = await deriveWalletSessionCsrf(base);
    const repeated = await deriveWalletSessionCsrf(base);
    const changedSession = await deriveWalletSessionCsrf({
      ...base,
      publicSessionId: "wallet-session-public-2",
    });
    const changedCredential = await deriveWalletSessionCsrf({
      ...base,
      credentialDigest: credentialB.credentialDigest,
    });
    const changedVersion = await deriveWalletSessionCsrf({ ...base, sessionVersion: 2 });
    const raw = baseline.exposeForHeader(traceId);

    expect(WALLET_SESSION_CSRF_PROTOCOL_VERSION).toBe("campaign-os-wallet-session-csrf/v1");
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(revealWalletSessionCsrfTokenForHeader(repeated.csrfToken, traceId)).toBe(raw);
    expect(() => baseline.exposeForHeader(traceId)).toThrowError(
      expect.objectContaining({ field: "csrfToken" }),
    );
    expect(baseline.dispose()).toBe(false);
    expect([
      changedSession.csrfTokenDigest,
      changedCredential.csrfTokenDigest,
      changedVersion.csrfTokenDigest,
    ]).not.toContain(baseline.csrfTokenDigest);
  });

  it("projects only the CSRF digest for persistence", async () => {
    const credential = await issue(37);
    const csrf = await deriveWalletSessionCsrf({
      credentialDigest: credential.credentialDigest,
      csrfSecret: secret(17),
      publicSessionId: "wallet-session-public-3",
      sessionVersion: 4,
      traceId,
    });
    const raw = revealWalletSessionCsrfTokenForHeader(csrf.csrfToken, traceId);
    const projection = projectWalletSessionCsrfForPersistence(csrf, traceId);

    expect(projection).toEqual({ csrfTokenDigest: csrf.csrfTokenDigest });
    expect(await digestWalletSessionCsrfToken(raw, { traceId })).toBe(csrf.csrfTokenDigest);
    expect(Reflect.ownKeys(projection)).toEqual(["csrfTokenDigest"]);
    expect(JSON.stringify(csrf)).not.toContain(raw);
    expect(JSON.stringify(projection)).not.toContain(raw);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(csrf.dispose()).toBe(true);
  });

  it("compares only equal-length canonical values with the timing-safe primitive", async () => {
    const credential = await issue(41);
    const csrf = await deriveWalletSessionCsrf({
      credentialDigest: credential.credentialDigest,
      csrfSecret: secret(19),
      publicSessionId: "wallet-session-public-4",
      sessionVersion: 1,
      traceId,
    });
    const raw = revealWalletSessionCsrfTokenForHeader(csrf.csrfToken, traceId);
    const differentRaw = Buffer.from(new Uint8Array(32).fill(99)).toString("base64url");
    const timingSafeEqual = vi.fn<WalletCredentialCrypto["timingSafeEqual"]>(
      (left, right) => Buffer.from(left).equals(Buffer.from(right)),
    );
    const crypto = {
      ...nodeWalletCredentialCrypto,
      timingSafeEqual,
    } satisfies WalletCredentialCrypto;

    expect(verifyWalletSessionCsrfToken(csrf.csrfToken, raw, { crypto, traceId })).toBe(true);
    expect(verifyWalletSessionCsrfToken(csrf.csrfToken, differentRaw, { crypto, traceId })).toBe(false);
    expect(timingSafeEqual).toHaveBeenCalledTimes(2);

    expect(verifyWalletSessionCsrfToken(csrf.csrfToken, `${raw}=`, { crypto, traceId })).toBe(false);
    expect(verifyWalletSessionCsrfToken(csrf.csrfToken, "short", { crypto, traceId })).toBe(false);
    expect(timingSafeEqual).toHaveBeenCalledTimes(2);

    expect(areWalletSessionDigestsEqual(
      credential.credentialDigest,
      credential.credentialDigest,
      { crypto, traceId },
    )).toBe(true);
    expect(areWalletSessionDigestsEqual(
      credential.credentialDigest,
      `${credential.credentialDigest}00`,
      { crypto, traceId },
    )).toBe(false);
    expect(timingSafeEqual).toHaveBeenCalledTimes(3);
  });

  it("offers a narrow injected service for runtime issue, digest, derive and verify", async () => {
    const random = deterministicRandom(53);
    const csrfSecret = secret(25);
    const service = createWalletSessionCredentialService({
      crypto: nodeWalletCredentialCrypto,
      csrfSecret,
      random,
    });
    const credential = await service.issueCredential(traceId);
    const rawCredential = credential.exposeForCookie(traceId);
    const binding = {
      credentialDigest: credential.credentialDigest,
      publicSessionId: "wallet-session-public-service",
      sessionVersion: 3,
    } as const;
    const csrf = await service.deriveCsrf(binding, traceId);
    const rawCsrf = csrf.exposeForHeader(traceId);

    expect(await service.digestCredentialCookie(rawCredential, traceId))
      .toBe(credential.credentialDigest);
    expect(await service.digestCsrfToken(rawCsrf, traceId)).toBe(csrf.csrfTokenDigest);
    expect(await service.verifyCsrf(binding, rawCsrf, traceId)).toBe(true);
    expect(await service.verifyCsrf(binding, `${rawCsrf}=`, traceId)).toBe(false);
    expect(await verifyWalletSessionCsrf({
      ...binding,
      csrfSecret,
      presentedToken: rawCsrf,
      traceId,
    })).toBe(true);
    expect(random.calls).toEqual([WALLET_SESSION_CREDENTIAL_BYTES]);
    expect(Object.isFrozen(service)).toBe(true);
  });

  it("adapts the real crypto service to one-shot runtime material and async binding verification", async () => {
    const service = createWalletSessionCredentialService({
      crypto: nodeWalletCredentialCrypto,
      csrfSecret: secret(27),
      random: deterministicRandom(59),
    });
    const port = createWalletSessionRuntimeCredentialPort(service);
    const binding = {
      sessionId: "wallet-session-runtime-adapter",
      traceId: "trace-wallet-runtime-adapter",
      version: 2,
    } as const;
    const material = await port.issueSessionSecrets(binding);
    const exposed = material.expose();

    expect(exposed.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(exposed.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(material)).not.toContain(exposed.credential);
    expect(JSON.stringify(material)).not.toContain(exposed.csrfToken);
    expect(await port.digestCredential(exposed.credential, binding.traceId))
      .toBe(material.credentialDigest);
    const restored = await port.deriveCsrf({
      credentialDigest: material.credentialDigest,
      ...binding,
    });
    expect(restored.csrfToken).toBe(exposed.csrfToken);
    expect(port.matchesDigest(
      restored.csrfTokenDigest,
      material.csrfTokenDigest,
      binding.traceId,
    )).toBe(true);
    expect(await port.verifyCsrf({
      credentialDigest: material.credentialDigest,
      presentedToken: exposed.csrfToken,
      ...binding,
    })).toBe(true);
    expect(() => material.expose()).toThrowError(
      expect.objectContaining({ field: "credentialMaterial" }),
    );

    await port.close();
    await expect(port.issueSessionSecrets(binding)).rejects.toMatchObject({
      field: "credentialPort",
      traceId: binding.traceId,
    });
  });

  it("destroys secret and token handles without serializing their bytes", async () => {
    const credential = await issue(43);
    const csrfSecret = secret(21);
    const csrf = await deriveWalletSessionCsrf({
      credentialDigest: credential.credentialDigest,
      csrfSecret,
      publicSessionId: "wallet-session-public-5",
      sessionVersion: 1,
      traceId,
    });

    expect(destroyWalletSessionCsrfToken(csrf.csrfToken)).toBe(true);
    expect(destroyWalletSessionCsrfToken(csrf.csrfToken)).toBe(false);
    expect(() => revealWalletSessionCsrfTokenForHeader(csrf.csrfToken, traceId))
      .toThrowError(expect.objectContaining({ field: "csrfToken" }));
    expect(destroyWalletSessionCsrfSecret(csrfSecret)).toBe(true);
    expect(destroyWalletSessionCsrfSecret(csrfSecret)).toBe(false);
  });
});

describe("wallet session credential failures", () => {
  it("fails closed on malformed or throwing crypto ports", async () => {
    const malicious = "raw-input-or-secret-must-not-escape";
    const circular: { cause?: unknown; message: string; stack: string } = {
      message: malicious,
      stack: malicious,
    };
    circular.cause = circular;
    const invalidCrypto: WalletCredentialCrypto[] = [
      {
        ...nodeWalletCredentialCrypto,
        digest: async () => new Uint8Array(31),
      },
      {
        ...nodeWalletCredentialCrypto,
        digest: async () => { throw circular; },
      },
    ];

    for (const crypto of invalidCrypto) {
      let captured: unknown;
      try {
        await issueWalletSessionCredential({
          crypto,
          random: deterministicRandom(47),
          traceId,
        });
      } catch (error) {
        captured = error;
      }
      const failure = projectWalletSessionCredentialFailure(captured, traceId);

      expect(captured).toBeInstanceOf(WalletSessionCredentialError);
      expect(captured).not.toHaveProperty("cause");
      expect(captured).not.toHaveProperty("stack");
      expect((captured as Error).message).toBe("Wallet session credential operation failed.");
      expect(failure).toEqual({
        code: "WALLET_AUTH_CREDENTIAL_CRYPTO_INVALID",
        field: "credentialDigest",
        status: "rejected",
        traceId,
      });
      expect(JSON.stringify(failure)).not.toContain(malicious);
    }
  });

  it("does not leak malicious input through safe failure metadata", () => {
    const malicious = "raw-secret-value";
    let captured: unknown;
    try {
      restoreWalletSessionCredentialFromCookie(malicious, malicious);
    } catch (error) {
      captured = error;
    }
    const failure = projectWalletSessionCredentialFailure(captured, malicious);

    expect(failure).toEqual({
      code: "WALLET_AUTH_CREDENTIAL_INPUT_INVALID",
      field: "credential",
      status: "rejected",
      traceId: "wallet-session-credential",
    });
    expect(JSON.stringify(failure)).not.toContain(malicious);
    expect(Object.isFrozen(failure)).toBe(true);
  });
});
