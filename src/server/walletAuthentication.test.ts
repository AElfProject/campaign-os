import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createWalletAuthenticationDiagnostic,
  isResolvedWalletSessionAuthority,
  isVerifiedWalletSubject,
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
  projectVerifiedWalletSubjectForPersistence,
  projectResolvedWalletSession,
  projectVerifiedWalletSubject,
  restoreVerifiedWalletSubjectFromPersistence,
  type DurableWalletSessionRecord,
  type PersistedVerifiedWalletSubject,
  type PortkeyCaRelationProvider,
  type WalletAuthenticationClock,
  type WalletAuthenticationRandom,
  type WalletAuthenticationStore,
  type WalletCredentialCrypto,
  type WalletProofVerifier,
} from "./walletAuthentication";

const verifiedSubjectInput = () => ({
  accountType: "EOA" as const,
  adapterId: "portkey-discover-eoa",
  chainId: "AELF" as const,
  network: "testnet" as const,
  proofDigest: "a".repeat(64),
  proofMethod: "AELF_EOA_RECOVERABLE" as const,
  signerAddress: "ELF_verified_signer",
  verifiedAt: "2026-07-18T00:00:00.000Z",
  walletAddress: "ELF_verified_signer",
  walletSource: "PORTKEY_EOA_APP" as const,
});

describe("wallet authentication authority contracts", () => {
  it("issues a runtime-branded verified subject and rejects plain-object forgery", () => {
    const input = verifiedSubjectInput();
    const subject = issueVerifiedWalletSubject(input);
    const forged = { ...subject };

    input.walletAddress = "ELF_mutated_after_issue";

    expect(isVerifiedWalletSubject(subject)).toBe(true);
    expect(isVerifiedWalletSubject(forged)).toBe(false);
    expect(subject.walletAddress).toBe("ELF_verified_signer");
    expect(Object.isFrozen(subject)).toBe(true);
    expect(subject).not.toHaveProperty("roleIds");
    expect(subject).not.toHaveProperty("capabilities");
  });

  it("does not accept UNKNOWN or non-live sources as verified subject authority", () => {
    expect(() => issueVerifiedWalletSubject({
      ...verifiedSubjectInput(),
      accountType: "UNKNOWN" as never,
    })).toThrowError(expect.objectContaining({ code: "WALLET_AUTH_SUBJECT_ACCOUNT_TYPE_INVALID" }));
    expect(() => issueVerifiedWalletSubject({
      ...verifiedSubjectInput(),
      walletSource: "AGENT_SKILL" as never,
    })).toThrowError(expect.objectContaining({ code: "WALLET_AUTH_SUBJECT_SOURCE_INVALID" }));
    expect(() => issueVerifiedWalletSubject({
      ...verifiedSubjectInput(),
      network: "unknown" as never,
    })).toThrowError(expect.objectContaining({ code: "WALLET_AUTH_SUBJECT_NETWORK_INVALID" }));
  });

  it("keeps signer and proof lineage out of the public verified projection", () => {
    const projection = projectVerifiedWalletSubject(
      issueVerifiedWalletSubject(verifiedSubjectInput()),
    );

    expect(projection).toEqual({
      accountType: "EOA",
      adapterId: "portkey-discover-eoa",
      chainId: "AELF",
      network: "testnet",
      walletAddress: "ELF_verified_signer",
      walletSource: "PORTKEY_EOA_APP",
    });
    expect(projection).not.toHaveProperty("proofDigest");
    expect(projection).not.toHaveProperty("signerAddress");
    expect(Object.isFrozen(projection)).toBe(true);
  });

  it("persists safe proof lineage and reconstructs trusted authority after restart", () => {
    const subject = issueVerifiedWalletSubject(verifiedSubjectInput());
    const persisted = projectVerifiedWalletSubjectForPersistence(subject);
    const serialized = JSON.stringify(persisted);
    const restartedInput = JSON.parse(serialized) as ReturnType<typeof verifiedSubjectInput>;
    const restored = restoreVerifiedWalletSubjectFromPersistence(restartedInput);

    restartedInput.walletAddress = "ELF_mutated_after_restore";

    expectTypeOf<DurableWalletSessionRecord["subject"]>()
      .toEqualTypeOf<PersistedVerifiedWalletSubject>();
    expect(persisted).toEqual(verifiedSubjectInput());
    expect(Object.isFrozen(persisted)).toBe(true);
    expect(isVerifiedWalletSubject(restored)).toBe(true);
    expect(restored).toMatchObject({
      proofDigest: "a".repeat(64),
      proofMethod: "AELF_EOA_RECOVERABLE",
      signerAddress: "ELF_verified_signer",
      verifiedAt: "2026-07-18T00:00:00.000Z",
      walletAddress: "ELF_verified_signer",
    });
    expect(projectVerifiedWalletSubject(restored)).not.toHaveProperty("proofDigest");
  });

  it("issues trusted session authority only from a branded subject", () => {
    const subject = issueVerifiedWalletSubject(verifiedSubjectInput());
    const roleIds = ["participant"] as const;
    const capabilities = ["campaign:read", "task:verify"];
    const authority = issueResolvedWalletSessionAuthority({
      absoluteExpiresAt: "2026-07-18T08:00:00.000Z",
      capabilities,
      credentialBoundary: "wallet-auth-cookie/v1",
      idleExpiresAt: "2026-07-18T00:30:00.000Z",
      membershipRevision: "membership-revision-1",
      roleIds,
      sessionId: "wallet-session-public-1",
      subject,
      version: 1,
    });

    capabilities.push("admin:review");

    expect(isResolvedWalletSessionAuthority(authority)).toBe(true);
    expect(isResolvedWalletSessionAuthority({ ...authority })).toBe(false);
    expect(authority.capabilities).toEqual(["campaign:read", "task:verify"]);
    expect(Object.isFrozen(authority.capabilities)).toBe(true);
    expect(projectResolvedWalletSession(authority)).toEqual({
      absoluteExpiresAt: "2026-07-18T08:00:00.000Z",
      accountType: "EOA",
      capabilities: ["campaign:read", "task:verify"],
      idleExpiresAt: "2026-07-18T00:30:00.000Z",
      roleIds: ["participant"],
      sessionId: "wallet-session-public-1",
      status: "active",
      walletAddress: "ELF_verified_signer",
      walletSource: "PORTKEY_EOA_APP",
    });

    expect(() => issueResolvedWalletSessionAuthority({
      absoluteExpiresAt: "2026-07-18T08:00:00.000Z",
      capabilities: [],
      credentialBoundary: "wallet-auth-cookie/v1",
      idleExpiresAt: "2026-07-18T00:30:00.000Z",
      membershipRevision: "membership-revision-1",
      roleIds: ["participant"],
      sessionId: "wallet-session-public-2",
      subject: { ...subject } as never,
      version: 1,
    })).toThrowError(expect.objectContaining({ code: "WALLET_AUTH_TRUSTED_SUBJECT_REQUIRED" }));
  });

  it("provides narrow verifier, CA, store, clock, random and credential crypto ports", async () => {
    const subject = issueVerifiedWalletSubject(verifiedSubjectInput());
    const verifier = {
      id: "eoa-recovery-v1",
      proofMethod: "AELF_EOA_RECOVERABLE",
      verify: vi.fn<WalletProofVerifier["verify"]>(
        async () => ({ status: "verified" as const, subject }),
      ),
    } satisfies WalletProofVerifier;
    const caRelationProvider = {
      close: vi.fn(async () => undefined),
      id: "stage-portkey-ca",
      verifyRelation: vi.fn<PortkeyCaRelationProvider["verifyRelation"]>(async () => ({
        caAddress: "ELF_ca",
        caHash: "ca-hash",
        chainId: "AELF" as const,
        managerAddress: "ELF_manager",
        relationDigest: "b".repeat(64),
        relationRevision: "relation-revision-1",
        status: "verified" as const,
      })),
    } satisfies PortkeyCaRelationProvider;
    const clock = { now: () => new Date("2026-07-18T00:00:00.000Z") } satisfies WalletAuthenticationClock;
    const random = { randomBytes: (size: number) => new Uint8Array(size).fill(7) } satisfies WalletAuthenticationRandom;
    const credentialCrypto = {
      digest: async () => new Uint8Array(32).fill(1),
      hmac: async () => new Uint8Array(32).fill(2),
      timingSafeEqual: vi.fn<WalletCredentialCrypto["timingSafeEqual"]>(() => true),
    } satisfies WalletCredentialCrypto;
    const store = {
      close: vi.fn(async () => undefined),
      consumeChallengeAndCreateSession: vi.fn(async () => ({ status: "created" as const })),
      expireChallenges: vi.fn(async () => 0),
      expireSessions: vi.fn(async () => 0),
      issueChallenge: vi.fn(async (challenge) => challenge),
      loadChallenge: vi.fn(async () => undefined),
      recordChallengeFailure: vi.fn(async () => ({ status: "recorded" as const })),
      resolveActiveSession: vi.fn(async () => undefined),
      revokeSession: vi.fn(async () => ({ status: "not_found" as const })),
      revokeSubjectSessions: vi.fn(async () => 0),
      rotateSession: vi.fn(async () => ({ status: "not_found" as const })),
      touchSession: vi.fn(async () => ({ status: "not_found" as const })),
    } satisfies WalletAuthenticationStore;

    expect((await verifier.verify({
      adapterProof: undefined,
      challenge: {
        adapterId: "portkey-discover-eoa",
        caHash: undefined,
        chainId: "AELF",
        exactMessageBytes: new Uint8Array([1]),
        network: "testnet",
        requestedWalletAddress: "ELF_verified_signer",
      },
      publicKey: undefined,
      signature: new Uint8Array([2]),
      traceId: "trace-proof",
    })).status).toBe("verified");
    expect((await caRelationProvider.verifyRelation({
      caAddressHint: "ELF_ca",
      caHash: "ca-hash",
      chainId: "AELF",
      managerAddress: "ELF_manager",
      traceId: "trace-ca",
    })).status).toBe("verified");
    expect(clock.now().toISOString()).toBe("2026-07-18T00:00:00.000Z");
    expect(random.randomBytes(32)).toHaveLength(32);
    expect(await credentialCrypto.timingSafeEqual(new Uint8Array([1]), new Uint8Array([1]))).toBe(true);
    expect(store.close).not.toHaveBeenCalled();
  });

  it("creates bounded diagnostics without rejected values or internal causes", () => {
    const diagnostic = createWalletAuthenticationDiagnostic({
      adapterId: "portkey-aa",
      code: "WALLET_AUTH_VERIFIER_UNAVAILABLE",
      field: "verifier",
      traceId: "trace-safe-diagnostic",
    });

    expect(diagnostic).toEqual({
      adapterId: "portkey-aa",
      code: "WALLET_AUTH_VERIFIER_UNAVAILABLE",
      field: "verifier",
      severity: "error",
      traceId: "trace-safe-diagnostic",
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(/message|cause|stack|url|signature|cookie/i);
    expect(Object.isFrozen(diagnostic)).toBe(true);
  });

  it("replaces unsafe runtime diagnostic metadata with safe fallbacks", () => {
    const unsafeAdapterId = "/Users/alice/private/wallet?token=raw-adapter-token";
    const unsafeCode = "WALLET_AUTH_/private?token=raw-code-token";
    const unsafeField = "Authorization: Bearer raw-field-token";
    const unsafeTraceId = "/private/trace?token=raw-trace-token";
    const diagnostic = createWalletAuthenticationDiagnostic({
      adapterId: unsafeAdapterId,
      code: unsafeCode,
      field: unsafeField,
      severity: "warning",
      traceId: unsafeTraceId,
    } as never);
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic).toEqual({
      code: "WALLET_AUTH_INPUT_INVALID",
      field: "diagnostic",
      severity: "warning",
      traceId: "wallet-auth-diagnostic",
    });
    expect(diagnostic).not.toHaveProperty("adapterId");
    for (const rejectedValue of [unsafeAdapterId, unsafeCode, unsafeField, unsafeTraceId]) {
      expect(serialized).not.toContain(rejectedValue);
    }
  });
});
