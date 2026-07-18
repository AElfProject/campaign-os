import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  WALLET_SESSION_CSRF_HEADER_NAME,
  WALLET_SESSION_MAX_COOKIE_HEADER_BYTES,
  WALLET_SESSION_MAX_CSRF_HEADER_BYTES,
  WalletSessionRequestSecurityError,
  authorizeWalletCurrentSessionRequest,
  authorizeWalletSessionMutationRequest,
  createWalletSessionRuntimeRequestSecurityPort,
  createWalletSessionRequestSecurityPolicy,
  evaluateWalletSessionPreflight,
  serializeWalletSessionClearCookie,
  serializeWalletSessionCookie,
  type CreateWalletSessionRequestSecurityPolicyInput,
} from "./walletSessionRequestSecurity";

const LOOPBACK_ORIGIN = "http://127.0.0.1:5193";
const COOKIE_NAME = "campaign_os_wallet_session";
const ephemeralOpaqueValue = () => randomBytes(32).toString("base64url");
const CREDENTIAL = ephemeralOpaqueValue();
const CSRF_TOKEN = ephemeralOpaqueValue();
const NOW = new Date("2026-07-18T08:00:00.000Z");

const redactSecrets = (value: string) => value
  .split(CREDENTIAL).join("<credential>")
  .split(CSRF_TOKEN).join("<csrf>");

const policyInput = (): CreateWalletSessionRequestSecurityPolicyInput => ({
  allowedOrigins: [LOOPBACK_ORIGIN],
  cookie: {
    httpOnly: true,
    maxAgeSeconds: 1_800,
    name: COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: false,
  },
  disposableEnvironment: true,
  environment: "stage",
  traceId: "trace-policy",
});

const createPolicy = (
  overrides: Partial<CreateWalletSessionRequestSecurityPolicyInput> = {},
) => {
  const base = policyInput();

  return createWalletSessionRequestSecurityPolicy({
    ...base,
    ...overrides,
    cookie: {
      ...base.cookie,
      ...(overrides.cookie ?? {}),
    },
  });
};

const currentSessionRequest = (
  headers: Record<string, string | readonly string[] | undefined>,
  overrides: {
    readonly deriveCsrf?: ReturnType<typeof vi.fn>;
    readonly resolveActiveSession?: ReturnType<typeof vi.fn>;
    readonly traceId?: string;
  } = {},
) => {
  const resolveActiveSession = overrides.resolveActiveSession ?? vi.fn(async () => ({
    sessionId: "session-public-1",
    status: "active" as const,
  }));
  const deriveCsrf = overrides.deriveCsrf ?? vi.fn(async () => CSRF_TOKEN);

  return {
    deriveCsrf,
    promise: authorizeWalletCurrentSessionRequest({
      callbacks: {
        deriveCsrf,
        resolveActiveSession,
      },
      headers,
      policy: createPolicy(),
      traceId: overrides.traceId ?? "trace-current-session",
    }),
    resolveActiveSession,
  };
};

describe("wallet session request security", () => {
  describe("configured cookie parsing", () => {
    it("adapts the exact policy to the runtime's narrow header port", () => {
      const port = createWalletSessionRuntimeRequestSecurityPort(
        createPolicy(),
        () => new Date(NOW),
      );

      expect(port.requireOrigin(LOOPBACK_ORIGIN)).toBe(true);
      expect(port.requireOrigin("http://127.0.0.1:5194")).toBe(false);
      expect(port.parseCredentialCookie(
        `analytics=value; ${COOKIE_NAME}=${CREDENTIAL}`,
      )).toEqual({ credential: CREDENTIAL, status: "accepted" });
      expect(port.parseCredentialCookie(
        `${COOKIE_NAME}=${CREDENTIAL}; ${COOKIE_NAME}=${CREDENTIAL}`,
      )).toEqual({ status: "rejected" });
      expect(port.readCsrfHeader(CSRF_TOKEN)).toEqual({
        status: "accepted",
        token: CSRF_TOKEN,
      });
      expect(port.serializeCredentialCookie(CREDENTIAL, 1_800)).toContain(
        `${COOKIE_NAME}=${CREDENTIAL};`,
      );
      expect(port.serializeCredentialCookie(
        CREDENTIAL,
        900,
        "trace-cookie-remaining-lifetime",
      )).toContain("Max-Age=900");
      expect(() => port.serializeCredentialCookie(
        CREDENTIAL,
        1_801,
        "trace-cookie-too-long",
      )).toThrowError(expect.objectContaining({
        code: "WALLET_SESSION_COOKIE_SERIALIZATION_INVALID",
        traceId: "trace-cookie-too-long",
      }));
      expect(port.clearCookie()).toContain("Max-Age=0");
    });

    it("accepts exactly one configured cookie without projecting the raw credential", async () => {
      const request = currentSessionRequest({
        Cookie: `analytics=percent%20encoded; ${COOKIE_NAME}=${CREDENTIAL}; theme=dark`,
        Origin: LOOPBACK_ORIGIN,
      });

      const result = await request.promise;

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("Expected current-session authorization.");
      }
      expect(result.csrfToken === CSRF_TOKEN).toBe(true);
      expect(result.session).toEqual({
        sessionId: "session-public-1",
        status: "active",
      });

      const resolveInput = request.resolveActiveSession.mock.calls[0]?.[0];
      const deriveInput = request.deriveCsrf.mock.calls[0]?.[0];
      expect(resolveInput?.credential === CREDENTIAL).toBe(true);
      expect(resolveInput?.traceId).toBe("trace-current-session");
      expect(deriveInput?.credential === CREDENTIAL).toBe(true);
      expect(deriveInput?.traceId).toBe("trace-current-session");
      expect(deriveInput?.session).toEqual({
        sessionId: "session-public-1",
        status: "active",
      });
      expect(JSON.stringify(result).includes(CREDENTIAL)).toBe(false);
    });

    it.each([
      ["missing", "analytics=value"],
      ["duplicate", `${COOKIE_NAME}=${CREDENTIAL}; ${COOKIE_NAME}=${CREDENTIAL}`],
      ["case ambiguity", `Campaign_os_wallet_session=${CREDENTIAL}`],
      ["percent-encoded name ambiguity", `campaign%5fos_wallet_session=${CREDENTIAL}`],
      ["percent-encoded credential", `${COOKIE_NAME}=c%63${"c".repeat(41)}`],
      ["empty credential", `${COOKIE_NAME}=`],
      ["padded credential", `${COOKIE_NAME}=${CREDENTIAL}=`],
      ["malformed unrelated segment", `malformed; ${COOKIE_NAME}=${CREDENTIAL}`],
      ["combined cookie headers", `other=value, second=value; ${COOKIE_NAME}=${CREDENTIAL}`],
      ["oversized credential", `${COOKIE_NAME}=${"c".repeat(513)}`],
    ])("rejects a %s configured cookie as the same safe unauthorized result", async (
      _name,
      cookie,
    ) => {
      const request = currentSessionRequest({
        cookie,
        origin: LOOPBACK_ORIGIN,
      });

      const result = await request.promise;

      expect(result).toEqual({
        code: "WALLET_SESSION_UNAUTHORIZED",
        ok: false,
        status: 401,
        traceId: "trace-current-session",
      });
      expect(request.resolveActiveSession).not.toHaveBeenCalled();
      expect(request.deriveCsrf).not.toHaveBeenCalled();
      expect(JSON.stringify(result).includes(CREDENTIAL)).toBe(false);
    });

    it("rejects duplicate cookie headers and oversized cookie input before session lookup", async () => {
      const duplicateHeader = currentSessionRequest({
        Cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
        cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
        origin: LOOPBACK_ORIGIN,
      });
      const arrayHeader = currentSessionRequest({
        cookie: [`${COOKIE_NAME}=${CREDENTIAL}`],
        origin: LOOPBACK_ORIGIN,
      });
      const oversizedHeader = currentSessionRequest({
        cookie: `unrelated=${"x".repeat(WALLET_SESSION_MAX_COOKIE_HEADER_BYTES)}; ${COOKIE_NAME}=${CREDENTIAL}`,
        origin: LOOPBACK_ORIGIN,
      });

      for (const request of [duplicateHeader, arrayHeader, oversizedHeader]) {
        await expect(request.promise).resolves.toMatchObject({
          code: "WALLET_SESSION_UNAUTHORIZED",
          ok: false,
          status: 401,
        });
        expect(request.resolveActiveSession).not.toHaveBeenCalled();
      }
    });
  });

  describe("cookie policy and serialization", () => {
    it("serializes host-only set and clear cookies with identical explicit scope", () => {
      const policy = createPolicy({
        allowedOrigins: ["https://campaign.example"],
        cookie: {
          ...policyInput().cookie,
          maxAgeSeconds: 3_600,
          path: "/api/wallet",
          sameSite: "strict",
          secure: true,
        },
        disposableEnvironment: false,
        environment: "production",
      });

      const setCookie = serializeWalletSessionCookie({
        credential: CREDENTIAL,
        now: NOW,
        policy,
        traceId: "trace-set-cookie",
      });
      const clearCookie = serializeWalletSessionClearCookie({
        policy,
        traceId: "trace-clear-cookie",
      });

      expect(setCookie.split(";", 1)[0] === `${COOKIE_NAME}=${CREDENTIAL}`).toBe(true);
      const redactedSetCookie = redactSecrets(setCookie);
      expect(redactedSetCookie).toContain("HttpOnly");
      expect(redactedSetCookie).toContain("Secure");
      expect(redactedSetCookie).toContain("SameSite=Strict");
      expect(redactedSetCookie).toContain("Path=/api/wallet");
      expect(redactedSetCookie).toContain("Max-Age=3600");
      expect(redactedSetCookie).toContain("Expires=Sat, 18 Jul 2026 09:00:00 GMT");
      expect(redactedSetCookie).not.toContain("Domain=");

      expect(clearCookie).toBe(
        `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/api/wallet; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      );
      expect(serializeWalletSessionClearCookie({
        policy,
        traceId: "trace-repeat-logout",
      })).toBe(clearCookie);
    });

    it("honors an explicitly configured insecure disposable loopback cookie", () => {
      const serialized = serializeWalletSessionCookie({
        credential: CREDENTIAL,
        now: NOW,
        policy: createPolicy(),
        traceId: "trace-loopback-cookie",
      });

      const redacted = redactSecrets(serialized);
      expect(redacted).toContain("HttpOnly");
      expect(redacted).toContain("SameSite=Lax");
      expect(redacted).not.toContain("; Secure");
    });

    it("accepts safe cookie prefixes only when their browser invariants hold", () => {
      const hostPolicy = createPolicy({
        allowedOrigins: ["https://campaign.example"],
        cookie: {
          ...policyInput().cookie,
          name: "__Host-wallet_session",
          path: "/",
          secure: true,
        },
        disposableEnvironment: false,
        environment: "production",
      });
      const securePolicy = createPolicy({
        allowedOrigins: ["https://campaign.example"],
        cookie: {
          ...policyInput().cookie,
          name: "__Secure-wallet_session",
          secure: true,
        },
        disposableEnvironment: false,
        environment: "production",
      });

      expect(serializeWalletSessionClearCookie({
        policy: hostPolicy,
        traceId: "trace-host-prefix",
      })).toContain("__Host-wallet_session=");
      expect(serializeWalletSessionClearCookie({
        policy: securePolicy,
        traceId: "trace-secure-prefix",
      })).toContain("__Secure-wallet_session=");
    });

    it.each([
      {
        name: "control character in name",
        overrides: { cookie: { ...policyInput().cookie, name: `wallet${String.fromCharCode(10)}session` } },
      },
      {
        name: "encoded path",
        overrides: { cookie: { ...policyInput().cookie, path: "/api/%2e%2e/admin" } },
      },
      {
        name: "attribute injection in path",
        overrides: { cookie: { ...policyInput().cookie, path: "/; Secure" } },
      },
      {
        name: "public suffix domain",
        overrides: { cookie: { ...policyInput().cookie, domain: "co.uk" } },
      },
      {
        name: "broad parent domain",
        overrides: { cookie: { ...policyInput().cookie, domain: "campaign.example" } },
      },
      {
        name: "unsafe Host prefix",
        overrides: { cookie: { ...policyInput().cookie, name: "__Host-wallet_session" } },
      },
      {
        name: "ambiguous lowercase Host prefix",
        overrides: {
          cookie: {
            ...policyInput().cookie,
            name: "__host-wallet_session",
            path: "/",
            secure: true,
          },
        },
      },
      {
        name: "unsafe Secure prefix",
        overrides: { cookie: { ...policyInput().cookie, name: "__Secure-wallet_session" } },
      },
      {
        name: "SameSite None without Secure",
        overrides: { cookie: { ...policyInput().cookie, sameSite: "none" as const } },
      },
    ])("rejects $name without retaining hostile config", ({ overrides }) => {
      let captured: unknown;

      try {
        createPolicy(overrides as Partial<CreateWalletSessionRequestSecurityPolicyInput>);
      } catch (error) {
        captured = error;
      }

      expect(captured).toBeInstanceOf(WalletSessionRequestSecurityError);
      expect(captured).toMatchObject({
        code: "WALLET_SESSION_SECURITY_CONFIG_INVALID",
        traceId: "trace-policy",
      });
      expect((captured as Error).message).toBe("Wallet session request security configuration is invalid.");
      expect(JSON.stringify(captured)).not.toContain("campaign.example");
      expect((captured as Error).stack).toBeUndefined();
    });

    it.each([
      {
        name: "missing disposable flag",
        overrides: { disposableEnvironment: false },
      },
      {
        name: "production",
        overrides: { environment: "production" as const },
      },
      {
        name: "hostname suffix spoof",
        overrides: { allowedOrigins: ["http://localhost.evil.example:5193"] },
      },
      {
        name: "mixed non-loopback origin",
        overrides: { allowedOrigins: [LOOPBACK_ORIGIN, "http://192.0.2.1:5193"] },
      },
      {
        name: "non-canonical loopback origin",
        overrides: { allowedOrigins: ["http://LOCALHOST:5193"] },
      },
      {
        name: "HTTPS origin for a non-Secure exception",
        overrides: { allowedOrigins: ["https://localhost:5193"] },
      },
    ])("rejects an insecure cookie for $name", ({ overrides }) => {
      expect(() => createPolicy(overrides)).toThrow(WalletSessionRequestSecurityError);
    });
  });

  describe("exact Origin policy", () => {
    it.each([
      ["missing", undefined],
      ["null", "null"],
      ["wildcard", "*"],
      ["credentialed", "http://user:password@127.0.0.1:5193"],
      ["wrong scheme", "https://127.0.0.1:5193"],
      ["wrong host", "http://localhost:5193"],
      ["hostname suffix spoof", "http://127.0.0.1.evil.example:5193"],
      ["wrong port", "http://127.0.0.1:5194"],
      ["path ambiguity", "http://127.0.0.1:5193/path"],
      ["trailing slash ambiguity", "http://127.0.0.1:5193/"],
      ["case normalization ambiguity", "HTTP://127.0.0.1:5193"],
    ])("rejects a %s Origin before active-session or CSRF work", async (_name, origin) => {
      const order: string[] = [];
      const resolveActiveSession = vi.fn(async () => {
        order.push("resolve");
        return { sessionId: "session-public-1" };
      });
      const deriveCsrf = vi.fn(async () => {
        order.push("derive");
        return CSRF_TOKEN;
      });
      const headers = {
        cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
        ...(origin === undefined ? {} : { origin }),
      };

      const result = await currentSessionRequest(headers, {
        deriveCsrf,
        resolveActiveSession,
      }).promise;

      expect(result).toEqual({
        code: "WALLET_SESSION_ORIGIN_FORBIDDEN",
        ok: false,
        status: 403,
        traceId: "trace-current-session",
      });
      expect(order).toEqual([]);
    });

    it("rejects duplicate Origin headers rather than choosing one", async () => {
      const request = currentSessionRequest({
        Origin: LOOPBACK_ORIGIN,
        cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
        origin: LOOPBACK_ORIGIN,
      });

      await expect(request.promise).resolves.toMatchObject({
        code: "WALLET_SESSION_ORIGIN_FORBIDDEN",
        ok: false,
      });
      expect(request.resolveActiveSession).not.toHaveBeenCalled();
    });

    it("resolves the active session before deriving current-session CSRF", async () => {
      const order: string[] = [];
      const resolveActiveSession = vi.fn(async () => {
        order.push("resolve");
        return { sessionId: "session-public-1" };
      });
      const deriveCsrf = vi.fn(async () => {
        order.push("derive");
        return CSRF_TOKEN;
      });

      const result = await currentSessionRequest({
        cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
        origin: LOOPBACK_ORIGIN,
      }, {
        deriveCsrf,
        resolveActiveSession,
      }).promise;

      expect(result.ok).toBe(true);
      expect(order).toEqual(["resolve", "derive"]);
    });
  });

  describe("authenticated mutation policy", () => {
    const authorizeMutation = (options: {
      readonly csrfHeader?: string | readonly string[] | undefined;
      readonly headers?: Record<string, string | readonly string[] | undefined>;
      readonly resolveActiveSession?: ReturnType<typeof vi.fn>;
      readonly traceId?: string;
      readonly verifyCsrf?: ReturnType<typeof vi.fn>;
    } = {}) => {
      const csrfHeader = Object.prototype.hasOwnProperty.call(options, "csrfHeader")
        ? options.csrfHeader
        : CSRF_TOKEN;
      const headers = options.headers ?? {};
      const resolveActiveSession = options.resolveActiveSession
        ?? vi.fn(async () => ({ sessionId: "session-public-1" }));
      const traceId = options.traceId ?? "trace-mutation";
      const verifyCsrf = options.verifyCsrf ?? vi.fn(async () => true);

      return {
        promise: authorizeWalletSessionMutationRequest({
          callbacks: {
            resolveActiveSession,
            verifyCsrf,
          },
          headers: {
            cookie: `${COOKIE_NAME}=${CREDENTIAL}`,
            origin: LOOPBACK_ORIGIN,
            ...(csrfHeader === undefined ? {} : { [WALLET_SESSION_CSRF_HEADER_NAME]: csrfHeader }),
            ...headers,
          },
          policy: createPolicy(),
          traceId,
        }),
        resolveActiveSession,
        verifyCsrf,
      };
    };

    it("requires an active session and a narrow session-bound CSRF verifier callback", async () => {
      const request = authorizeMutation();

      const result = await request.promise;

      expect(result).toEqual({
        ok: true,
        session: { sessionId: "session-public-1" },
      });
      const resolveInput = request.resolveActiveSession.mock.calls[0]?.[0];
      const verifyInput = request.verifyCsrf.mock.calls[0]?.[0];
      expect(resolveInput?.credential === CREDENTIAL).toBe(true);
      expect(resolveInput?.traceId).toBe("trace-mutation");
      expect(verifyInput?.credential === CREDENTIAL).toBe(true);
      expect(verifyInput?.csrfToken === CSRF_TOKEN).toBe(true);
      expect(verifyInput?.traceId).toBe("trace-mutation");
      expect(verifyInput?.session).toEqual({ sessionId: "session-public-1" });
      expect(JSON.stringify(result).includes(CREDENTIAL)).toBe(false);
      expect(JSON.stringify(result).includes(CSRF_TOKEN)).toBe(false);
    });

    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["percent encoded", `s%73${"s".repeat(41)}`],
      ["padded", `${CSRF_TOKEN}=`],
      ["oversized", "s".repeat(WALLET_SESSION_MAX_CSRF_HEADER_BYTES + 1)],
      ["combined duplicate", `${CSRF_TOKEN},${CSRF_TOKEN}`],
    ])("rejects a %s CSRF header before authority callbacks", async (_name, csrfHeader) => {
      const request = authorizeMutation({ csrfHeader });

      const result = await request.promise;

      expect(result).toEqual({
        code: "WALLET_SESSION_REQUEST_UNAUTHORIZED",
        ok: false,
        status: 403,
        traceId: "trace-mutation",
      });
      expect(request.resolveActiveSession).not.toHaveBeenCalled();
      expect(request.verifyCsrf).not.toHaveBeenCalled();
      expect(JSON.stringify(result).includes(CSRF_TOKEN)).toBe(false);
    });

    it("rejects duplicate case-varied CSRF headers", async () => {
      const request = authorizeMutation({
        headers: { "X-Campaign-OS-CSRF": CSRF_TOKEN },
      });

      await expect(request.promise).resolves.toMatchObject({
        code: "WALLET_SESSION_REQUEST_UNAUTHORIZED",
        ok: false,
      });
      expect(request.resolveActiveSession).not.toHaveBeenCalled();
    });

    it("does not call the verifier when the active-session callback denies authority", async () => {
      const request = authorizeMutation({
        resolveActiveSession: vi.fn(async () => null),
      });

      await expect(request.promise).resolves.toEqual({
        code: "WALLET_SESSION_UNAUTHORIZED",
        ok: false,
        status: 401,
        traceId: "trace-mutation",
      });
      expect(request.verifyCsrf).not.toHaveBeenCalled();
    });

    it("uses one indistinguishable result for wrong, replayed and pre-rotation CSRF", async () => {
      const outcomes = [];
      const rejectedTokens = Array.from({ length: 3 }, ephemeralOpaqueValue);

      for (const token of rejectedTokens) {
        const request = authorizeMutation({
          csrfHeader: token,
          traceId: "trace-csrf-denied",
          verifyCsrf: vi.fn(async () => false),
        });
        outcomes.push(await request.promise);
      }

      expect(outcomes).toEqual(Array.from({ length: 3 }, () => ({
        code: "WALLET_SESSION_REQUEST_UNAUTHORIZED",
        ok: false,
        status: 403,
        traceId: "trace-csrf-denied",
      })));
      for (const token of rejectedTokens) {
        expect(JSON.stringify(outcomes).includes(token)).toBe(false);
      }
    });

    it("converts callback exceptions to a safe unavailable result", async () => {
      const hostile = `${CREDENTIAL}:${CSRF_TOKEN}:private-stack`;
      const request = authorizeMutation({
        resolveActiveSession: vi.fn(async () => {
          throw new Error(hostile);
        }),
      });

      const result = await request.promise;

      expect(result).toEqual({
        code: "WALLET_SESSION_SECURITY_UNAVAILABLE",
        ok: false,
        status: 503,
        traceId: "trace-mutation",
      });
      expect(JSON.stringify(result).includes(hostile)).toBe(false);
      expect(request.verifyCsrf).not.toHaveBeenCalled();
    });
  });

  describe("credentialed preflight", () => {
    it("reflects only the configured exact Origin and never uses wildcard", () => {
      const result = evaluateWalletSessionPreflight({
        headers: {
          "access-control-request-headers": `content-type, ${WALLET_SESSION_CSRF_HEADER_NAME}`,
          "access-control-request-method": "POST",
          origin: LOOPBACK_ORIGIN,
        },
        policy: createPolicy(),
        traceId: "trace-preflight",
      });

      expect(result).toEqual({
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": `content-type, ${WALLET_SESSION_CSRF_HEADER_NAME}`,
          "access-control-allow-methods": "GET, POST",
          "access-control-allow-origin": LOOPBACK_ORIGIN,
          "access-control-max-age": "600",
          vary: "Origin",
        },
        ok: true,
        status: 204,
      });
      expect(Object.values(result.ok ? result.headers : {})).not.toContain("*");
    });

    it.each([
      ["missing", undefined],
      ["null", "null"],
      ["wildcard", "*"],
      ["wrong", "http://127.0.0.1:5194"],
      ["credentialed", "http://user:password@127.0.0.1:5193"],
    ])("rejects a %s preflight Origin without CORS reflection", (_name, origin) => {
      const result = evaluateWalletSessionPreflight({
        headers: {
          "access-control-request-method": "POST",
          ...(origin === undefined ? {} : { origin }),
        },
        policy: createPolicy(),
        traceId: "trace-preflight-rejected",
      });

      expect(result).toEqual({
        code: "WALLET_SESSION_ORIGIN_FORBIDDEN",
        ok: false,
        status: 403,
        traceId: "trace-preflight-rejected",
      });
      expect("headers" in result).toBe(false);
    });

    it("rejects unsupported methods, unconfigured headers and duplicate preflight headers", () => {
      const badMethod = evaluateWalletSessionPreflight({
        headers: {
          "access-control-request-method": "DELETE",
          origin: LOOPBACK_ORIGIN,
        },
        policy: createPolicy(),
        traceId: "trace-preflight-method",
      });
      const badHeaders = evaluateWalletSessionPreflight({
        headers: {
          "access-control-request-headers": "authorization",
          "access-control-request-method": "POST",
          origin: LOOPBACK_ORIGIN,
        },
        policy: createPolicy(),
        traceId: "trace-preflight-headers",
      });
      const duplicateMethod = evaluateWalletSessionPreflight({
        headers: {
          "Access-Control-Request-Method": "POST",
          "access-control-request-method": "POST",
          origin: LOOPBACK_ORIGIN,
        },
        policy: createPolicy(),
        traceId: "trace-preflight-duplicate",
      });

      for (const result of [badMethod, badHeaders, duplicateMethod]) {
        expect(result).toMatchObject({
          code: "WALLET_SESSION_REQUEST_INVALID",
          ok: false,
          status: 400,
        });
      }
    });
  });
});
