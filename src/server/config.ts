import { createHash } from "node:crypto";
import {
  DEFAULT_BACKEND_RUNTIME_PROFILE_ID,
  deferredProductionBackendCapabilities,
  isBackendRuntimeProfileId,
  productionBackendRequiredConfigKeys,
  resolveBackendRuntimeProfile,
  type BackendRuntimeProfile,
  type BackendRuntimeProfileId,
} from "./backendProfiles";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { queueProviderDriverProductionPreconditions } from "./queueProviderDriver";
import { queueProviderSdkBindingProductionPreconditions } from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";
import { redisBrokerConnectionProductionPreconditions } from "./redisBrokerConnectionReadiness";
import { queueRuntimeProductionPreconditions } from "./queueRuntime";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";
import { workerLeaseStoreProductionPreconditions } from "./workerLeaseStore";
import { workerIdempotencyStoreProductionPreconditions } from "./workerIdempotencyStore";
import { observabilityExporterProductionPreconditions } from "./observabilityExporter";

export type CampaignOsPersistenceMode = "memory" | "local_json";

export type CampaignOsCampaignDbMode = "local" | "postgres";
export type CampaignOsDatabaseSslMode = "disable" | "require" | "verify-ca" | "verify-full";
export type CampaignOsCampaignDbConfigErrorCode =
  | "CAMPAIGN_DB_MODE_UNSUPPORTED"
  | "CAMPAIGN_DB_DATABASE_URL_REQUIRED"
  | "CAMPAIGN_DB_DATABASE_URL_INVALID"
  | "CAMPAIGN_DB_SSL_MODE_INVALID"
  | "CAMPAIGN_DB_POOL_SETTING_INVALID";

export interface CampaignOsCampaignDbPoolConfig {
  connectionString: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  ssl: false | {
    checkServerIdentity?: () => undefined;
    rejectUnauthorized: boolean;
  };
}

export type CampaignOsCampaignDbConfig =
  | {
    adapterLabel: "campaign-db-deterministic-adapter";
    mode: "local";
  }
  | {
    adapterLabel: "campaign-db-postgresql-adapter";
    mode: "postgres";
    pool: CampaignOsCampaignDbPoolConfig;
  };

export interface CampaignOsCampaignDbConfigOptions {
  connectTimeoutMs?: number;
  databaseUrl?: string;
  env?: Readonly<Record<string, string | undefined>>;
  idleTimeoutMs?: number;
  mode?: string;
  poolMax?: number;
  sslMode?: string;
}

export class CampaignOsCampaignDbConfigError extends Error {
  readonly code: CampaignOsCampaignDbConfigErrorCode;
  readonly field: string;

  constructor(code: CampaignOsCampaignDbConfigErrorCode, field: string) {
    super("Campaign DB runtime configuration is invalid.");
    this.name = "CampaignOsCampaignDbConfigError";
    this.code = code;
    this.field = field;
  }
}

export const CAMPAIGN_OS_ADMIN_REVIEW_ENABLED_ENV = "CAMPAIGN_OS_ADMIN_REVIEW_ENABLED";
export const CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV =
  "CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON";
export const CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS = 100;
export const CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP = 4;
export const CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP = 100;
export const CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH = 160;
export const CAMPAIGN_OS_ADMIN_OPERATOR_ROLE_MAX_LENGTH = 32;
export const CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES = 65_536;
export const CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES = 32_768;

export type CampaignOsAdminOperatorRoleId = "internal_operator" | "review_operator";

export interface CampaignOsAdminOperatorMembershipConfig {
  active: boolean;
  campaignIds: readonly string[] | null;
  roleIds: readonly CampaignOsAdminOperatorRoleId[];
  subjectAddress: string;
}

export interface CampaignOsAdminReviewConfig {
  enabled: boolean;
  memberships: readonly CampaignOsAdminOperatorMembershipConfig[];
  sourceRevision: string;
}

export interface CampaignOsAdminReviewConfigOptions {
  enabled?: boolean | string;
  env?: Readonly<Record<string, string | undefined>>;
  jsonParser?: (source: string) => unknown;
  membershipsJson?: string;
}

export type CampaignOsAdminReviewConfigErrorCode =
  | "ADMIN_REVIEW_FLAG_INVALID"
  | "ADMIN_MEMBERSHIP_JSON_INVALID"
  | "ADMIN_MEMBERSHIP_SHAPE_INVALID"
  | "ADMIN_MEMBERSHIP_UNKNOWN_FIELD"
  | "ADMIN_MEMBERSHIP_FIELD_INVALID"
  | "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED"
  | "ADMIN_MEMBERSHIP_CONFLICT";

export class CampaignOsAdminReviewConfigError extends Error {
  readonly code: CampaignOsAdminReviewConfigErrorCode;
  readonly field: string;
  readonly limit?: number;

  constructor(
    code: CampaignOsAdminReviewConfigErrorCode,
    field: string,
    limit?: number,
  ) {
    super("Admin review runtime configuration is invalid.");
    this.name = "CampaignOsAdminReviewConfigError";
    this.code = code;
    this.field = field;
    this.limit = limit;
  }
}

const adminConfigError = (
  code: CampaignOsAdminReviewConfigErrorCode,
  field: string,
  limit?: number,
) => new CampaignOsAdminReviewConfigError(code, field, limit);

const adminMembershipFields = new Set([
  "active",
  "campaignIds",
  "roleIds",
  "subjectAddress",
]);
const adminOperatorRoleIds = new Set<CampaignOsAdminOperatorRoleId>([
  "internal_operator",
  "review_operator",
]);

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

const resolveAdminReviewEnabled = (value: boolean | string | undefined): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value?.trim();

  if (!normalized || normalized === "0" || normalized === "false") {
    return false;
  }

  if (normalized === "1" || normalized === "true") {
    return true;
  }

  throw adminConfigError("ADMIN_REVIEW_FLAG_INVALID", CAMPAIGN_OS_ADMIN_REVIEW_ENABLED_ENV);
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const requireOwnField = (
  entry: Record<string, unknown>,
  field: keyof CampaignOsAdminOperatorMembershipConfig,
) => {
  if (!Object.prototype.hasOwnProperty.call(entry, field)) {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", `memberships[].${field}`);
  }
};

const normalizeAdminSubject = (value: unknown): string => {
  if (typeof value !== "string") {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].subjectAddress");
  }

  const subjectAddress = value.trim();

  if (
    subjectAddress.length === 0
    || subjectAddress.length > CAMPAIGN_OS_ADMIN_OPERATOR_SUBJECT_MAX_LENGTH
    || /[\u0000-\u001f\u007f]/.test(subjectAddress)
  ) {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].subjectAddress");
  }

  return subjectAddress;
};

const normalizeAdminRoles = (value: unknown): readonly CampaignOsAdminOperatorRoleId[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].roleIds");
  }

  if (value.length > CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      "memberships[].roleIds",
      CAMPAIGN_OS_ADMIN_OPERATOR_MAX_ROLES_PER_MEMBERSHIP,
    );
  }

  const roles = new Set<CampaignOsAdminOperatorRoleId>();

  for (const rawRole of value) {
    if (typeof rawRole !== "string") {
      throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].roleIds");
    }

    const role = rawRole.trim();

    if (
      role.length === 0
      || role.length > CAMPAIGN_OS_ADMIN_OPERATOR_ROLE_MAX_LENGTH
      || /[\u0000-\u001f\u007f]/.test(role)
      || !adminOperatorRoleIds.has(role as CampaignOsAdminOperatorRoleId)
    ) {
      throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].roleIds");
    }

    roles.add(role as CampaignOsAdminOperatorRoleId);
  }

  return Object.freeze([...roles].sort());
};

const normalizeAdminCampaignIds = (value: unknown): readonly string[] | null => {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].campaignIds");
  }

  if (value.length > CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      "memberships[].campaignIds",
      CAMPAIGN_OS_ADMIN_OPERATOR_MAX_CAMPAIGN_IDS_PER_MEMBERSHIP,
    );
  }

  const campaignIds = new Set<string>();

  for (const rawCampaignId of value) {
    if (typeof rawCampaignId !== "string") {
      throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].campaignIds");
    }

    const campaignId = rawCampaignId.trim();

    if (!isCanonicalCampaignId(campaignId)) {
      throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].campaignIds");
    }

    campaignIds.add(campaignId);
  }

  return Object.freeze([...campaignIds].sort());
};

const normalizeAdminMembership = (
  value: unknown,
): CampaignOsAdminOperatorMembershipConfig => {
  if (!isPlainRecord(value)) {
    throw adminConfigError("ADMIN_MEMBERSHIP_SHAPE_INVALID", "memberships[]");
  }

  const unknownField = Object.keys(value).find((field) => !adminMembershipFields.has(field));

  if (unknownField) {
    throw adminConfigError("ADMIN_MEMBERSHIP_UNKNOWN_FIELD", "memberships[].unknownField");
  }

  requireOwnField(value, "active");
  requireOwnField(value, "campaignIds");
  requireOwnField(value, "roleIds");
  requireOwnField(value, "subjectAddress");

  if (typeof value.active !== "boolean") {
    throw adminConfigError("ADMIN_MEMBERSHIP_FIELD_INVALID", "memberships[].active");
  }

  return Object.freeze({
    active: value.active,
    campaignIds: normalizeAdminCampaignIds(value.campaignIds),
    roleIds: normalizeAdminRoles(value.roleIds),
    subjectAddress: normalizeAdminSubject(value.subjectAddress),
  });
};

const canonicalAdminMembership = (membership: CampaignOsAdminOperatorMembershipConfig) =>
  JSON.stringify(membership);

const normalizeAdminMemberships = (
  value: unknown,
): readonly CampaignOsAdminOperatorMembershipConfig[] => {
  if (!Array.isArray(value)) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_SHAPE_INVALID",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
    );
  }

  if (value.length > CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
      CAMPAIGN_OS_ADMIN_OPERATOR_MAX_MEMBERSHIPS,
    );
  }

  const bySubject = new Map<string, {
    canonical: string;
    membership: CampaignOsAdminOperatorMembershipConfig;
  }>();

  for (const rawMembership of value) {
    const normalized = normalizeAdminMembership(rawMembership);
    const canonical = canonicalAdminMembership(normalized);
    const existing = bySubject.get(normalized.subjectAddress);

    if (existing && existing.canonical !== canonical) {
      throw adminConfigError("ADMIN_MEMBERSHIP_CONFLICT", "memberships[].subjectAddress");
    }

    if (!existing) {
      bySubject.set(normalized.subjectAddress, { canonical, membership: normalized });
    }
  }

  const memberships = [...bySubject.values()]
    .map(({ membership }) => membership)
    .sort((left, right) => left.subjectAddress < right.subjectAddress ? -1 : left.subjectAddress > right.subjectAddress ? 1 : 0);
  const normalizedBytes = utf8ByteLength(JSON.stringify(memberships));

  if (normalizedBytes > CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      "memberships.normalized",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_NORMALIZED_MAX_BYTES,
    );
  }

  return Object.freeze(memberships);
};

const parseAdminMembershipJson = (
  source: string | undefined,
  jsonParser: (source: string) => unknown,
): readonly CampaignOsAdminOperatorMembershipConfig[] => {
  if (!source?.trim()) {
    return Object.freeze([]);
  }

  if (utf8ByteLength(source) > CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES) {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_LIMIT_EXCEEDED",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_MAX_BYTES,
    );
  }

  let parsed: unknown;

  try {
    parsed = jsonParser(source);
  } catch {
    throw adminConfigError(
      "ADMIN_MEMBERSHIP_JSON_INVALID",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
    );
  }

  try {
    return normalizeAdminMemberships(parsed);
  } catch (error) {
    if (error instanceof CampaignOsAdminReviewConfigError) {
      throw error;
    }

    throw adminConfigError(
      "ADMIN_MEMBERSHIP_SHAPE_INVALID",
      CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV,
    );
  }
};

const adminMembershipSourceRevision = (
  enabled: boolean,
  memberships: readonly CampaignOsAdminOperatorMembershipConfig[],
) => `admin-membership-sha256:${createHash("sha256")
  .update(JSON.stringify({ enabled, memberships }))
  .digest("hex")}`;

export const resolveCampaignOsAdminReviewConfig = ({
  enabled,
  env = typeof process === "undefined" ? {} : process.env,
  jsonParser = JSON.parse,
  membershipsJson,
}: CampaignOsAdminReviewConfigOptions = {}): CampaignOsAdminReviewConfig => {
  const resolvedEnabled = resolveAdminReviewEnabled(
    enabled ?? env[CAMPAIGN_OS_ADMIN_REVIEW_ENABLED_ENV],
  );
  const memberships = resolvedEnabled
    ? parseAdminMembershipJson(
      membershipsJson ?? env[CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON_ENV],
      jsonParser,
    )
    : Object.freeze([]) as readonly CampaignOsAdminOperatorMembershipConfig[];

  return Object.freeze({
    enabled: resolvedEnabled,
    memberships,
    sourceRevision: adminMembershipSourceRevision(resolvedEnabled, memberships),
  });
};

export const CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS_ENV =
  "CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS";
export const CAMPAIGN_OS_PARTICIPANT_PREVIEW_MAX_CAMPAIGNS = 100;
export const CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH = 128;

export type CampaignOsParticipantPreviewConfigErrorCode =
  | "CAMPAIGN_PREVIEW_CONFIG_ID_INVALID"
  | "CAMPAIGN_PREVIEW_CONFIG_LIMIT_EXCEEDED";

export interface CampaignOsParticipantPreviewConfig {
  campaignIds: readonly string[];
}

export interface CampaignOsParticipantPreviewConfigOptions {
  campaignIds?: string | readonly string[];
  env?: Readonly<Record<string, string | undefined>>;
}

export interface CampaignOsParticipantPreviewMetadata {
  campaignCount: number;
  enabled: boolean;
}

export class CampaignOsParticipantPreviewConfigError extends Error {
  readonly code: CampaignOsParticipantPreviewConfigErrorCode;
  readonly field: string;

  constructor(code: CampaignOsParticipantPreviewConfigErrorCode, field: string) {
    super("Participant Campaign preview configuration is invalid.");
    this.name = "CampaignOsParticipantPreviewConfigError";
    this.code = code;
    this.field = field;
  }
}

const participantPreviewConfigError = (
  code: CampaignOsParticipantPreviewConfigErrorCode,
) => new CampaignOsParticipantPreviewConfigError(
  code,
  CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS_ENV,
);

export const isCanonicalCampaignId = (campaignId: string) =>
  campaignId.length <= CAMPAIGN_OS_CAMPAIGN_ID_MAX_LENGTH
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(campaignId);

const splitParticipantPreviewCampaignIds = (
  source: string | readonly string[] | undefined,
): readonly string[] => {
  if (source === undefined || (typeof source === "string" && source.trim().length === 0)) {
    return [];
  }

  return typeof source === "string" ? source.split(",") : [...source];
};

const parseParticipantPreviewCampaignIds = (
  source: string | readonly string[] | undefined,
): readonly string[] => {
  const uniqueCampaignIds = new Set<string>();

  for (const segment of splitParticipantPreviewCampaignIds(source)) {
    const campaignId = segment.trim();

    if (!isCanonicalCampaignId(campaignId)) {
      throw participantPreviewConfigError("CAMPAIGN_PREVIEW_CONFIG_ID_INVALID");
    }

    uniqueCampaignIds.add(campaignId);

    if (uniqueCampaignIds.size > CAMPAIGN_OS_PARTICIPANT_PREVIEW_MAX_CAMPAIGNS) {
      throw participantPreviewConfigError("CAMPAIGN_PREVIEW_CONFIG_LIMIT_EXCEEDED");
    }
  }

  return Object.freeze([...uniqueCampaignIds]);
};

export const resolveCampaignOsParticipantPreviewConfig = ({
  campaignIds,
  env = typeof process === "undefined" ? {} : process.env,
}: CampaignOsParticipantPreviewConfigOptions = {}): CampaignOsParticipantPreviewConfig => {
  const resolvedCampaignIds = parseParticipantPreviewCampaignIds(
    campaignIds ?? env[CAMPAIGN_OS_PARTICIPANT_PREVIEW_CAMPAIGN_IDS_ENV],
  );

  return Object.freeze({ campaignIds: resolvedCampaignIds });
};

export const createCampaignOsParticipantPreviewMetadata = (
  config: CampaignOsParticipantPreviewConfig,
): CampaignOsParticipantPreviewMetadata => Object.freeze({
  campaignCount: config.campaignIds.length,
  enabled: config.campaignIds.length > 0,
});

export type BackendConfigContractStatus = "ready" | "scaffold" | "blocked";
export type BackendConfigDiagnosticSeverity = "error" | "warning" | "info";
export type BackendConfigDiagnosticCode =
  | "UNKNOWN_BACKEND_PROFILE"
  | "UNSUPPORTED_PERSISTENCE_MODE"
  | "MISSING_LOCAL_PERSISTENCE_DIR"
  | "MISSING_PRODUCTION_CONFIG"
  | "PRODUCTION_CAPABILITY_DEFERRED"
  | "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED";

export interface CampaignOsPersistenceConfig {
  adapterLabel: string;
  localDataDir?: string;
  mode: CampaignOsPersistenceMode;
  productionDriverId?: string;
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

export interface BackendConfigDiagnostic {
  code: BackendConfigDiagnosticCode;
  field: string;
  message: string;
  severity: BackendConfigDiagnosticSeverity;
}

export interface BackendConfigContractOptions {
  env?: Record<string, string | undefined>;
  host?: string;
  persistence?: Partial<CampaignOsPersistenceConfig> & {
    mode?: string;
  };
  port?: number;
  profileId?: string;
  version?: string;
}

export interface BackendConfigContract {
  diagnostics: BackendConfigDiagnostic[];
  host: string;
  persistenceDirectory?: string;
  persistenceMode: CampaignOsPersistenceMode;
  productionPersistence: {
    liveMigrationApproval: boolean;
    requestedDriverId?: string;
  };
  port: number;
  productionReadiness: {
    deferredCapabilities: string[];
    missingConfigKeys: string[];
    requiredConfigKeys: string[];
    status: BackendConfigContractStatus;
  };
  profile: BackendRuntimeProfile;
  profileId: BackendRuntimeProfileId;
  requestedProfileId: string;
  valid: boolean;
  version: string;
}

const DEFAULT_VERSION = "0.2.0-local";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5174;
const REDACTED_VALUE = "[redacted]";
const LOOPBACK_DATABASE_HOSTS = new Set(["::1", "localhost"]);
const forbiddenConfigKeyFragments = [
  "apikey",
  "bearer",
  "credentials",
  "endpoint",
  "mnemonic",
  "objectkey",
  "password",
  "packagebinding",
  "provider",
  "providercredentials",
  "private",
  "queue",
  "authorization",
  "lease",
  "secret",
  "seed",
  "signature",
  "signedurl",
  "token",
  "url",
];

const isPersistenceMode = (value: string | undefined): value is CampaignOsPersistenceMode =>
  value === "memory" || value === "local_json";

const campaignDbConfigError = (
  code: CampaignOsCampaignDbConfigErrorCode,
  field: string,
) => new CampaignOsCampaignDbConfigError(code, field);

const parseCampaignDbBoundedInteger = ({
  defaultValue,
  envValue,
  explicitValue,
  field,
  maximum,
  minimum,
}: {
  defaultValue: number;
  envValue: string | undefined;
  explicitValue: number | undefined;
  field: string;
  maximum: number;
  minimum: number;
}) => {
  if (explicitValue !== undefined) {
    if (!Number.isSafeInteger(explicitValue) || explicitValue < minimum || explicitValue > maximum) {
      throw campaignDbConfigError("CAMPAIGN_DB_POOL_SETTING_INVALID", field);
    }

    return explicitValue;
  }

  if (envValue === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(envValue)) {
    throw campaignDbConfigError("CAMPAIGN_DB_POOL_SETTING_INVALID", field);
  }

  const parsed = Number(envValue);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw campaignDbConfigError("CAMPAIGN_DB_POOL_SETTING_INVALID", field);
  }

  return parsed;
};

const isLoopbackDatabaseHost = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (LOOPBACK_DATABASE_HOSTS.has(normalized)) {
    return true;
  }

  const octets = normalized.split(".");

  return octets.length === 4
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
    && Number(octets[0]) === 127;
};

const parseCampaignDbUrl = (value: string | undefined) => {
  const connectionString = value?.trim();

  if (!connectionString) {
    throw campaignDbConfigError(
      "CAMPAIGN_DB_DATABASE_URL_REQUIRED",
      "CAMPAIGN_OS_DATABASE_URL",
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(connectionString);
  } catch {
    throw campaignDbConfigError(
      "CAMPAIGN_DB_DATABASE_URL_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || !parsed.hostname
    || parsed.pathname.length <= 1
    || [...parsed.searchParams.keys()].some((key) =>
      ["sslcert", "sslkey", "sslmode", "sslrootcert"].includes(key.toLowerCase()))
  ) {
    throw campaignDbConfigError(
      "CAMPAIGN_DB_DATABASE_URL_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
    );
  }

  return {
    connectionString,
    loopback: isLoopbackDatabaseHost(parsed.hostname),
  };
};

const resolveCampaignDbSsl = (
  requestedMode: string | undefined,
  loopback: boolean,
): CampaignOsCampaignDbPoolConfig["ssl"] => {
  const sslMode = requestedMode?.trim().toLowerCase() ?? (loopback ? "disable" : "verify-full");

  if (!["disable", "require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw campaignDbConfigError(
      "CAMPAIGN_DB_SSL_MODE_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
    );
  }

  if (sslMode === "disable") {
    if (!loopback) {
      throw campaignDbConfigError(
        "CAMPAIGN_DB_SSL_MODE_INVALID",
        "CAMPAIGN_OS_DATABASE_SSL_MODE",
      );
    }

    return false;
  }

  return {
    ...(sslMode === "verify-ca" ? { checkServerIdentity: () => undefined } : {}),
    rejectUnauthorized: sslMode !== "require",
  };
};

export const resolveCampaignOsCampaignDbConfig = ({
  connectTimeoutMs,
  databaseUrl,
  env = typeof process === "undefined" ? {} : process.env,
  idleTimeoutMs,
  mode,
  poolMax,
  sslMode,
}: CampaignOsCampaignDbConfigOptions = {}): CampaignOsCampaignDbConfig => {
  const requestedMode = mode ?? env.CAMPAIGN_OS_CAMPAIGN_DB_MODE;

  if (requestedMode === undefined || requestedMode === "local") {
    return {
      adapterLabel: "campaign-db-deterministic-adapter",
      mode: "local",
    };
  }

  if (requestedMode !== "postgres") {
    throw campaignDbConfigError(
      "CAMPAIGN_DB_MODE_UNSUPPORTED",
      "CAMPAIGN_OS_CAMPAIGN_DB_MODE",
    );
  }

  const parsedUrl = parseCampaignDbUrl(databaseUrl ?? env.CAMPAIGN_OS_DATABASE_URL);

  return {
    adapterLabel: "campaign-db-postgresql-adapter",
    mode: "postgres",
    pool: {
      connectionString: parsedUrl.connectionString,
      connectionTimeoutMillis: parseCampaignDbBoundedInteger({
        defaultValue: 5_000,
        envValue: env.CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS,
        explicitValue: connectTimeoutMs,
        field: "CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS",
        maximum: 30_000,
        minimum: 100,
      }),
      idleTimeoutMillis: parseCampaignDbBoundedInteger({
        defaultValue: 10_000,
        envValue: env.CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS,
        explicitValue: idleTimeoutMs,
        field: "CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS",
        maximum: 60_000,
        minimum: 1_000,
      }),
      max: parseCampaignDbBoundedInteger({
        defaultValue: 10,
        envValue: env.CAMPAIGN_OS_DATABASE_POOL_MAX,
        explicitValue: poolMax,
        field: "CAMPAIGN_OS_DATABASE_POOL_MAX",
        maximum: 20,
        minimum: 1,
      }),
      ssl: resolveCampaignDbSsl(
        sslMode ?? env.CAMPAIGN_OS_DATABASE_SSL_MODE,
        parsedUrl.loopback,
      ),
    },
  };
};

const normalizeSecretKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSecretLikeConfigKey = (key: string) => {
  const normalizedKey = normalizeSecretKey(key);

  return forbiddenConfigKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

export const sanitizeBackendConfigDiagnosticValue = (
  key: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return isSecretLikeConfigKey(key) ? REDACTED_VALUE : value;
};

const resolvePersistenceMode = (
  requestedMode: string | undefined,
  explicitMode: string | undefined,
): CampaignOsPersistenceMode => {
  if (isPersistenceMode(requestedMode)) {
    return requestedMode;
  }

  if (explicitMode !== undefined) {
    throw new Error(`Unsupported Campaign OS persistence mode: ${explicitMode}`);
  }

  return "memory";
};

const resolveBackendPersistenceMode = (
  requestedMode: string | undefined,
): {
  diagnostics: BackendConfigDiagnostic[];
  mode: CampaignOsPersistenceMode;
} => {
  if (isPersistenceMode(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
    };
  }

  if (requestedMode !== undefined) {
    return {
      diagnostics: [
        {
          code: "UNSUPPORTED_PERSISTENCE_MODE",
          field: "persistenceMode",
          message: `Unsupported Campaign OS persistence mode: ${sanitizeBackendConfigDiagnosticValue(
            "persistenceMode",
            requestedMode,
          )}`,
          severity: "error",
        },
      ],
      mode: "memory",
    };
  }

  return {
    diagnostics: [],
    mode: "memory",
  };
};

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

const resolvePort = (
  explicitPort: number | undefined,
  envPort: string | undefined,
): number => {
  if (explicitPort !== undefined) {
    return explicitPort;
  }

  const parsedEnvPort = Number.parseInt(envPort ?? "", 10);

  return Number.isFinite(parsedEnvPort) && parsedEnvPort > 0 ? parsedEnvPort : DEFAULT_PORT;
};

const missingRequiredConfigKeys = (
  env: Record<string, string | undefined>,
  requiredConfigKeys: readonly string[],
): string[] => requiredConfigKeys.filter((key) => !env[key]);

const uniqueStrings = (values: readonly string[]): string[] => Array.from(new Set(values));

const normalizeQueueProviderSdkBindingConfigKey = (key: string): string =>
  key === "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING" ? "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING" : key;

const normalizeQueueProviderSdkBindingConfigKeys = (keys: readonly string[]): string[] =>
  keys.map(normalizeQueueProviderSdkBindingConfigKey);

const queueRuntimeRequiredConfigKeys = uniqueStrings(
  queueRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const queueProviderAdapterRequiredConfigKeys = uniqueStrings(
  queueProviderAdapterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const queueProviderDriverRequiredConfigKeys = uniqueStrings(
  queueProviderDriverProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const queueProviderSdkBindingRequiredConfigKeys = uniqueStrings(
  queueProviderSdkBindingProductionPreconditions.flatMap((precondition) =>
    normalizeQueueProviderSdkBindingConfigKeys(precondition.requiredConfigKeys)
  ),
);

const queueProviderPackageRequiredConfigKeys = uniqueStrings(
  queueProviderPackageProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const redisBrokerConnectionRequiredConfigKeys = uniqueStrings(
  redisBrokerConnectionProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const schedulerRuntimeRequiredConfigKeys = uniqueStrings(
  schedulerRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const workerLeaseStoreRequiredConfigKeys = uniqueStrings(
  workerLeaseStoreProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const workerIdempotencyStoreRequiredConfigKeys = uniqueStrings(
  workerIdempotencyStoreProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const observabilityExporterRequiredConfigKeys = uniqueStrings(
  observabilityExporterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
);

const backendProductionReadinessRequiredConfigKeys = uniqueStrings([
  ...productionBackendRequiredConfigKeys,
  ...schedulerRuntimeRequiredConfigKeys,
  ...workerLeaseStoreRequiredConfigKeys,
  ...workerIdempotencyStoreRequiredConfigKeys,
  ...queueRuntimeRequiredConfigKeys,
  ...queueProviderAdapterRequiredConfigKeys,
  ...queueProviderDriverRequiredConfigKeys,
  ...queueProviderSdkBindingRequiredConfigKeys,
  ...queueProviderPackageRequiredConfigKeys,
  ...redisBrokerConnectionRequiredConfigKeys,
  ...observabilityExporterRequiredConfigKeys,
]);

const productionCapabilityDiagnostics = (): BackendConfigDiagnostic[] =>
  deferredProductionBackendCapabilities.map((capabilityId) => ({
    code: "PRODUCTION_CAPABILITY_DEFERRED",
    field: capabilityId,
    message:
      capabilityId === "worker_queue" || capabilityId === "scheduler"
        ? `Production capability '${capabilityId}' is deferred until queue runtime preconditions are configured.`
        : `Production capability '${capabilityId}' is deferred in Mission 168 backend scaffold.`,
    severity: "warning",
  }));

const productionCapabilityEnablementEnvKeys = {
  auth_session: "CAMPAIGN_OS_ENABLE_AUTH_SESSION",
  contract_writer: "CAMPAIGN_OS_ENABLE_CONTRACT_WRITER",
  migration_runner: "CAMPAIGN_OS_ENABLE_MIGRATION_RUNNER",
  object_storage_export: "CAMPAIGN_OS_ENABLE_OBJECT_STORAGE_EXPORT",
  production_database: "CAMPAIGN_OS_ENABLE_PRODUCTION_DATABASE",
  provider_adapters: "CAMPAIGN_OS_ENABLE_PROVIDER_ADAPTERS",
  reward_custody: "CAMPAIGN_OS_ENABLE_REWARD_CUSTODY",
  reward_distribution: "CAMPAIGN_OS_ENABLE_REWARD_DISTRIBUTION",
  scheduler: "CAMPAIGN_OS_ENABLE_SCHEDULER",
  worker_queue: "CAMPAIGN_OS_ENABLE_WORKER_QUEUE",
} as const satisfies Partial<Record<(typeof deferredProductionBackendCapabilities)[number], string>>;

const isEnabledFlag = (value: string | undefined) => value?.toLowerCase() === "true" || value === "1";

const sanitizeProductionPersistenceDriverId = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return /^[a-z0-9-]+$/i.test(value) ? value : REDACTED_VALUE;
};

const blockedProductionCapabilityEnablementDiagnostics = (
  env: Record<string, string | undefined>,
): BackendConfigDiagnostic[] =>
  Object.entries(productionCapabilityEnablementEnvKeys)
    .filter(([, envKey]) => isEnabledFlag(env[envKey]))
    .map(([capabilityId, envKey]) => ({
      code: "PRODUCTION_CAPABILITY_ENABLEMENT_BLOCKED",
      field: envKey,
      message: `Production capability '${capabilityId}' cannot be enabled by Mission 168 backend scaffold.`,
      severity: "error",
    }));

const missingProductionConfigDiagnostics = (
  missingConfigKeys: readonly string[],
): BackendConfigDiagnostic[] =>
  missingConfigKeys.map((key) => ({
    code: "MISSING_PRODUCTION_CONFIG",
    field: key,
    message: `Required production config '${key}' is not configured.`,
    severity: "error",
  }));

const missingLocalPersistenceDirectoryDiagnostics = ({
  localDataDir,
  mode,
}: {
  localDataDir?: string;
  mode: CampaignOsPersistenceMode;
}): BackendConfigDiagnostic[] => {
  if (mode !== "local_json" || localDataDir) {
    return [];
  }

  return [
    {
      code: "MISSING_LOCAL_PERSISTENCE_DIR",
      field: "CAMPAIGN_OS_PERSISTENCE_DIR",
      message:
        "Local durable persistence requires CAMPAIGN_OS_PERSISTENCE_DIR or persistence.localDataDir.",
      severity: "error",
    },
  ];
};

export const resolveBackendConfigContract = ({
  env = typeof process === "undefined" ? {} : process.env,
  host = env.CAMPAIGN_OS_API_HOST ?? DEFAULT_HOST,
  persistence = {},
  port,
  profileId,
  version,
}: BackendConfigContractOptions = {}): BackendConfigContract => {
  const requestedProfileId = profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE ?? DEFAULT_BACKEND_RUNTIME_PROFILE_ID;
  const profileResolution = resolveBackendRuntimeProfile(requestedProfileId);
  const requestedPersistenceMode = persistence.mode ?? env.CAMPAIGN_OS_PERSISTENCE_MODE;
  const persistenceModeResolution = resolveBackendPersistenceMode(requestedPersistenceMode);
  const localDataDir = persistence.localDataDir ?? env.CAMPAIGN_OS_PERSISTENCE_DIR;
  const profile = profileResolution.profile;
  const missingConfigKeys =
    profile.id === "production-required"
      ? missingRequiredConfigKeys(env, backendProductionReadinessRequiredConfigKeys)
      : [];
  const deferredDiagnostics =
    profile.id === "local-review" || profile.id === "staging-scaffold"
      ? productionCapabilityDiagnostics()
      : [];
  const blockedEnablementDiagnostics =
    profile.id === "local-review" || profile.id === "staging-scaffold"
      ? blockedProductionCapabilityEnablementDiagnostics(env)
      : [];
  const diagnostics: BackendConfigDiagnostic[] = [
    ...profileResolution.diagnostics.map<BackendConfigDiagnostic>((diagnostic) => ({
      code: "UNKNOWN_BACKEND_PROFILE",
      field: diagnostic.field,
      message: diagnostic.message,
      severity: diagnostic.severity,
    })),
    ...persistenceModeResolution.diagnostics,
    ...missingLocalPersistenceDirectoryDiagnostics({
      localDataDir,
      mode: persistenceModeResolution.mode,
    }),
    ...missingProductionConfigDiagnostics(missingConfigKeys),
    ...blockedEnablementDiagnostics,
    ...deferredDiagnostics,
  ];
  const blockingIssueCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const status: BackendConfigContractStatus =
    blockingIssueCount > 0 ? "blocked" : profile.status === "ready" ? "ready" : "scaffold";

  return {
    diagnostics,
    host,
    persistenceDirectory:
      persistenceModeResolution.mode === "local_json"
        ? localDataDir
        : undefined,
    persistenceMode: persistenceModeResolution.mode,
    productionPersistence: {
      liveMigrationApproval: isEnabledFlag(env.CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS),
      requestedDriverId: sanitizeProductionPersistenceDriverId(
        persistence.productionDriverId ?? env.CAMPAIGN_OS_PERSISTENCE_DRIVER,
      ),
    },
    port: resolvePort(port, env.CAMPAIGN_OS_API_PORT),
    productionReadiness: {
      deferredCapabilities: [...profile.deferredCapabilities],
      missingConfigKeys,
      requiredConfigKeys:
        profile.id === "production-required"
          ? backendProductionReadinessRequiredConfigKeys
          : backendProductionReadinessRequiredConfigKeys,
      status,
    },
    profile,
    profileId: profile.id,
    requestedProfileId,
    valid: blockingIssueCount === 0 && profileResolution.valid,
    version: version ?? env.CAMPAIGN_OS_API_VERSION ?? DEFAULT_VERSION,
  };
};

export const resolveCampaignOsRuntimeConfig = ({
  env = typeof process === "undefined" ? {} : process.env,
  persistence = {},
  version,
}: CampaignOsRuntimeConfigOptions = {}): CampaignOsRuntimeConfig => {
  const explicitMode = persistence.mode ?? env.CAMPAIGN_OS_PERSISTENCE_MODE;
  const mode = resolvePersistenceMode(explicitMode, explicitMode);
  const localDataDir = persistence.localDataDir ?? env.CAMPAIGN_OS_PERSISTENCE_DIR;
  if (mode === "local_json" && !localDataDir) {
    throw new Error("local_json persistence requires CAMPAIGN_OS_PERSISTENCE_DIR or persistence.localDataDir.");
  }
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
