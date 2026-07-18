import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  isWalletAdapterInstallCandidatePackageName,
  loadWalletAdapterModule,
  resolveWalletAdapterConfig,
  summarizeWalletAdapterConfig,
  walletAdapterInstallCandidatePackageNames,
  walletAdapterPackageGates,
} from "./walletAdapterConfig";

const candidateVersion = "0.4.0-alpha.21";
const walletAdapterConfigSource = readFileSync(
  resolve(process.cwd(), "src/wallet/walletAdapterConfig.ts"),
  "utf8",
);
const expectedRuntimePackages = {
  "@aelf-web-login/wallet-adapter-base": candidateVersion,
  "@aelf-web-login/wallet-adapter-night-elf": candidateVersion,
  "@aelf-web-login/wallet-adapter-portkey-discover": candidateVersion,
  "aelf-sdk": "3.5.1-beta.0",
} as const;

const browserEntries = [
  {
    adapterId: "portkey-discover-eoa",
    enabled: true,
    label: "Portkey EOA",
    recommended: true,
  },
  { adapterId: "nightelf", enabled: true, label: "NightElf", recommended: false },
];

const runtimeAvailability = {
  nightelf: "available",
  "portkey-discover-eoa": "available",
} as const;

describe("browser wallet adapter config", () => {
  it("is disabled by default and does not construct browser packages during import", () => {
    const config = resolveWalletAdapterConfig({
      env: {},
      serverBindingIds: ["portkey-aa"],
    });

    expect(config).toMatchObject({ adapters: [], enabled: false, status: "disabled", valid: true });
    expect(walletAdapterConfigSource).not.toMatch(
      /(?:from\s+|import\s*\()\s*["']@aelf-web-login\//,
    );
    expect(typeof window === "undefined" || typeof window === "object").toBe(true);
  });

  it("invokes a candidate package only through the explicit injected loader", async () => {
    const loadedModule = Object.freeze({ adapter: "nightelf" });
    const loader = vi.fn(async () => loadedModule);

    expect(loader).not.toHaveBeenCalled();

    const result = await loadWalletAdapterModule({ adapterId: "nightelf", loader });

    expect(loader).toHaveBeenCalledOnce();
    expect(result).toEqual({
      adapterId: "nightelf",
      module: loadedModule,
      status: "available",
    });
  });

  it("records raw Node ESM and isolated Vite gates without exposing the React wrapper", () => {
    const gateByPackageName = new Map(
      walletAdapterPackageGates.map((gate) => [gate.packageName, gate]),
    );
    const baseGate = gateByPackageName.get("@aelf-web-login/wallet-adapter-base");
    const reactGate = gateByPackageName.get("@aelf-web-login/wallet-adapter-react");

    expect(baseGate).toMatchObject({
      code: "WALLET_ADAPTER_NODE_ESM_IMPORT_UNSUPPORTED",
      nodeEsmImport: "failed",
      role: "foundation",
      status: "candidate",
      viteBundle: "passed",
    });
    expect(baseGate).not.toHaveProperty("adapterId");
    expect(reactGate).toMatchObject({
      code: "WALLET_ADAPTER_VITE_BUNDLE_FAILED",
      nodeEsmImport: "failed",
      role: "react_wrapper",
      status: "unavailable",
      viteBundle: "failed",
    });
    expect(reactGate).not.toHaveProperty("adapterId");
    expect(gateByPackageName.get("@aelf-web-login/wallet-adapter-portkey-discover")).toMatchObject({
      adapterId: "portkey-discover-eoa",
      nodeEsmImport: "failed",
      role: "adapter",
      status: "candidate",
      viteBundle: "passed",
    });
    expect(gateByPackageName.get("@aelf-web-login/wallet-adapter-night-elf")).toMatchObject({
      adapterId: "nightelf",
      nodeEsmImport: "failed",
      role: "adapter",
      status: "candidate",
      viteBundle: "passed",
    });
    expect(walletAdapterInstallCandidatePackageNames).toEqual([
      "@aelf-web-login/wallet-adapter-base",
      "@aelf-web-login/wallet-adapter-portkey-discover",
      "@aelf-web-login/wallet-adapter-night-elf",
    ]);
    expect(isWalletAdapterInstallCandidatePackageName(
      "@aelf-web-login/wallet-adapter-react",
    )).toBe(false);
  });

  it("accepts only the browser-safe subset aligned to server binding IDs", () => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify(browserEntries),
      },
      runtimeAvailability,
      serverBindingIds: ["portkey-discover-eoa", "nightelf"],
    });

    expect(config).toMatchObject({ enabled: true, status: "ready", valid: true });
    expect(config.adapters).toEqual([
      {
        adapterId: "nightelf",
        enabled: true,
        label: "NightElf",
        packageName: "@aelf-web-login/wallet-adapter-night-elf",
        recommended: false,
        status: "available",
      },
      {
        adapterId: "portkey-discover-eoa",
        enabled: true,
        label: "Portkey EOA",
        packageName: "@aelf-web-login/wallet-adapter-portkey-discover",
        recommended: true,
        status: "available",
      },
    ]);
    expect(JSON.stringify(config)).not.toMatch(/accountType|proofMethod|walletSource|hashStrategy/i);
    expect(Object.isFrozen(config.adapters)).toBe(true);
  });

  it("keeps unavailable Portkey AA visible without invalidating available Portkey EOA", () => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([
          {
            adapterId: "portkey-aa",
            enabled: true,
            label: "Portkey AA",
            recommended: false,
          },
          browserEntries[0],
        ]),
      },
      runtimeAvailability: {
        "portkey-aa": "unavailable",
        "portkey-discover-eoa": "available",
      },
      serverBindingIds: ["portkey-discover-eoa"],
    });

    expect(config).toMatchObject({ enabled: true, status: "ready", valid: true });
    expect(config.diagnostics).toEqual([]);
    expect(config.adapters).toEqual([
      {
        adapterId: "portkey-aa",
        enabled: true,
        label: "Portkey AA",
        packageName: "@aelf-web-login/wallet-adapter-portkey-aa",
        recommended: false,
        status: "unavailable",
      },
      {
        adapterId: "portkey-discover-eoa",
        enabled: true,
        label: "Portkey EOA",
        packageName: "@aelf-web-login/wallet-adapter-portkey-discover",
        recommended: true,
        status: "available",
      },
    ]);
  });

  it.each(["accountType", "proofMethod", "walletSource", "hashStrategyId", "productionApproved"])(
    "rejects server authority field %s from Vite config",
    (field) => {
      const config = resolveWalletAdapterConfig({
        env: {
          VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
          VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([
            { ...browserEntries[0], [field]: "forged" },
          ]),
        },
        runtimeAvailability,
        serverBindingIds: ["portkey-discover-eoa"],
      });

      expect(config).toMatchObject({ adapters: [], enabled: false, status: "invalid", valid: false });
      expect(config.diagnostics.map(({ code }) => code)).toContain("WALLET_ADAPTER_UNKNOWN_FIELD");
    },
  );

  it("projects a known enabled adapter without a concrete binding as unavailable", () => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify(browserEntries),
      },
      runtimeAvailability,
      serverBindingIds: ["portkey-discover-eoa"],
    });

    expect(config).toMatchObject({ enabled: true, status: "ready", valid: true });
    expect(config.diagnostics).toEqual([]);
    expect(config.adapters).toEqual([
      expect.objectContaining({
        adapterId: "nightelf",
        enabled: true,
        status: "unavailable",
      }),
      expect.objectContaining({
        adapterId: "portkey-discover-eoa",
        enabled: true,
        status: "available",
      }),
    ]);
  });

  it("projects a candidate as unavailable before injected provider detection", () => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([browserEntries[0]]),
      },
      serverBindingIds: ["portkey-discover-eoa"],
    });

    expect(config).toMatchObject({ enabled: true, status: "ready", valid: true });
    expect(config.diagnostics).toEqual([]);
    expect(config.adapters).toEqual([
      expect.objectContaining({
        adapterId: "portkey-discover-eoa",
        enabled: true,
        status: "unavailable",
      }),
    ]);
  });

  it.each([
    ["portkey-aa", "@aelf-web-login/wallet-adapter-portkey-aa", "WALLET_ADAPTER_PEER_GRAPH_INVALID"],
    [
      "portkey-eoa-extension",
      "@aelf-web-login/wallet-adapter-portkey-extension",
      "WALLET_ADAPTER_PACKAGE_MISSING",
    ],
  ])("keeps %s explicitly unavailable without invalidating the registry", (adapterId, packageName, gateCode) => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([
          {
            adapterId,
            enabled: true,
            label: "Unavailable wallet",
            recommended: false,
          },
        ]),
      },
      runtimeAvailability: { [adapterId]: "available" },
      serverBindingIds: [adapterId],
    });

    expect(config).toMatchObject({ enabled: true, status: "ready", valid: true });
    expect(config.diagnostics).toEqual([]);
    expect(config.adapters).toEqual([
      {
        adapterId,
        enabled: true,
        label: "Unavailable wallet",
        packageName,
        recommended: false,
        status: "unavailable",
      },
    ]);
    expect(walletAdapterPackageGates.find((gate) => gate.adapterId === adapterId)).toMatchObject({
      adapterId,
      code: gateCode,
      packageName,
      status: "unavailable",
      version: candidateVersion,
    });
  });

  it("keeps an unknown enabled adapter as a whole-config failure", () => {
    const config = resolveWalletAdapterConfig({
      env: {
        VITE_CAMPAIGN_OS_LIVE_WALLET_AUTH_ENABLED: "1",
        VITE_CAMPAIGN_OS_WALLET_ADAPTERS_JSON: JSON.stringify([{
          adapterId: "unknown-wallet",
          enabled: true,
          label: "Unknown wallet",
          recommended: false,
        }]),
      },
      runtimeAvailability: { "unknown-wallet": "available" },
      serverBindingIds: ["unknown-wallet"],
    });

    expect(config).toMatchObject({ adapters: [], enabled: false, status: "invalid", valid: false });
    expect(config.diagnostics).toEqual([
      expect.objectContaining({
        adapterId: "unknown-wallet",
        code: "WALLET_ADAPTER_PACKAGE_UNAVAILABLE",
      }),
    ]);
  });

  it("maps dynamic import/provider failure to unavailable without a seeded fallback", async () => {
    const result = await loadWalletAdapterModule({
      adapterId: "nightelf",
      loader: async () => {
        throw new Error("provider internal path /Users/alice/private-extension");
      },
      traceId: "trace-wallet-import",
    });

    expect(result).toEqual({
      adapterId: "nightelf",
      code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE",
      status: "unavailable",
      traceId: "trace-wallet-import",
    });
    expect(JSON.stringify(result)).not.toContain("private-extension");
    expect(JSON.stringify(result)).not.toContain("seeded");
  });

  it.each(["portkey-aa", "portkey-eoa-extension", "wallet-adapter-react", "unknown"])(
    "does not invoke an injected loader for gated package %s",
    async (adapterId) => {
      const loader = vi.fn(async () => ({ unsafe: true }));
      const result = await loadWalletAdapterModule({ adapterId, loader });

      expect(result).toMatchObject({
        adapterId,
        code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE",
        status: "unavailable",
      });
      expect(loader).not.toHaveBeenCalled();
    },
  );

  it("redacts an unsafe adapter ID before returning an unavailable result", async () => {
    const unsafeAdapterId = "/Users/alice/private/wallet?token=raw-wallet-token";
    const loader = vi.fn(async () => ({ unsafe: true }));

    const result = await loadWalletAdapterModule({ adapterId: unsafeAdapterId, loader });
    const serialized = JSON.stringify(result);

    expect(loader).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      adapterId: "unknown",
      code: "WALLET_ADAPTER_IMPORT_UNAVAILABLE",
      status: "unavailable",
    });
    expect(serialized).not.toContain(unsafeAdapterId);
    expect(serialized).not.toContain("raw-wallet-token");
    expect(serialized).not.toContain("/Users/alice/private");
  });

  it("returns a safe frozen summary", () => {
    const config = resolveWalletAdapterConfig({ env: {} });
    const summary = summarizeWalletAdapterConfig(config);

    expect(summary).toEqual({
      adapterCount: 0,
      enabledAdapterIds: [],
      recommendedAdapterId: undefined,
      status: "disabled",
      unavailableAdapterIds: [],
    });
    expect(Object.isFrozen(summary)).toBe(true);
  });
});

describe("wallet dependency contract", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; scripts?: Record<string, string> };
  const packageLock = JSON.parse(
    readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8"),
  ) as { packages?: Record<string, { version?: string }> };

  it("exact-pins only the approved wallet and server crypto candidates", () => {
    for (const [packageName, version] of Object.entries(expectedRuntimePackages)) {
      expect(packageJson.dependencies?.[packageName]).toBe(version);
      expect(packageJson.dependencies?.[packageName]).not.toMatch(/^[~^]/);
      expect(packageLock.packages?.[`node_modules/${packageName}`]?.version).toBe(version);
    }

    expect(packageJson.dependencies).not.toHaveProperty("aelf-web-login");
    expect(packageJson.dependencies).not.toHaveProperty(
      "@aelf-web-login/wallet-adapter-portkey-aa",
    );
    expect(packageJson.dependencies).not.toHaveProperty("@portkey/did-ui-react");
    expect(packageJson.dependencies).not.toHaveProperty(
      "@aelf-web-login/wallet-adapter-portkey-extension",
    );
    expect(packageJson.dependencies).not.toHaveProperty(
      "@aelf-web-login/wallet-adapter-react",
    );
  });

  it("reserves future auth launchers and required test commands without secret values", () => {
    expect(packageJson.scripts).toMatchObject({
      "server:wallet-auth-stage": "vite-node --script src/server/walletAuthenticationStageRuntime.ts --listen",
      "server:wallet-ca-sandbox": "vite-node --script src/server/portkeyCaRelationSandbox.ts --listen",
      "test:postgres:required": expect.any(String),
      "test:server:smoke": "npm run server:smoke",
    });
    expect(JSON.stringify(packageJson.scripts)).not.toMatch(/password|private.?key|csrf.?secret|credential=/i);
  });
});
