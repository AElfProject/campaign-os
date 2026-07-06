export type CampaignOsPersistenceMode = "memory" | "local_json";

export interface CampaignOsPersistenceConfig {
  adapterLabel: string;
  localDataDir?: string;
  mode: CampaignOsPersistenceMode;
}

export interface CampaignOsRuntimeConfig {
  persistence: CampaignOsPersistenceConfig;
  version: string;
}

export interface CampaignOsRuntimeConfigOptions {
  env?: Record<string, string | undefined>;
  persistence?: Partial<CampaignOsPersistenceConfig>;
  version?: string;
}

const DEFAULT_VERSION = "0.2.0-local";

const isPersistenceMode = (value: string | undefined): value is CampaignOsPersistenceMode =>
  value === "memory" || value === "local_json";

const sanitizeAdapterLabel = (mode: CampaignOsPersistenceMode, localDataDir?: string) => {
  if (mode === "memory") {
    return "memory";
  }

  if (!localDataDir) {
    return "local_json";
  }

  const trimmedPath = localDataDir.replace(/\/+$/, "");
  const lastSegment = trimmedPath.split(/[\\/]/).filter(Boolean).pop();

  return lastSegment ? `local_json:${lastSegment}` : "local_json";
};

export const resolveCampaignOsRuntimeConfig = ({
  env = typeof process === "undefined" ? {} : process.env,
  persistence = {},
  version,
}: CampaignOsRuntimeConfigOptions = {}): CampaignOsRuntimeConfig => {
  const requestedMode = persistence.mode ?? env.CAMPAIGN_OS_PERSISTENCE_MODE;
  const mode = isPersistenceMode(requestedMode) ? requestedMode : "memory";
  const localDataDir = persistence.localDataDir ?? env.CAMPAIGN_OS_PERSISTENCE_DIR;
  const adapterLabel = persistence.adapterLabel ?? sanitizeAdapterLabel(mode, localDataDir);

  return {
    persistence: {
      adapterLabel,
      localDataDir: mode === "local_json" ? localDataDir : undefined,
      mode,
    },
    version: version ?? env.CAMPAIGN_OS_API_VERSION ?? DEFAULT_VERSION,
  };
};
