import {
  supportedLocales,
  type AccountType,
  type ContractMode,
  type SupportedLocale,
  type VerificationType,
  type WalletCompatibility,
  type WalletSource,
} from "../domain/types";
import { invalidRequest, unsupportedExportMode, unsupportedLocale } from "./errors";

export type JsonRecord = Record<string, unknown>;
export type JsonPrimitiveRecord = Record<string, string | number | boolean>;

const accountTypes = ["AA", "EOA", "UNKNOWN"] as const satisfies readonly AccountType[];
const walletSources = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const satisfies readonly WalletSource[];
const walletCompatibilities = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletCompatibility[];
const verificationTypes = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const satisfies readonly VerificationType[];
const contractModes = ["OFF_CHAIN_MVP", "V2_COMPANION", "CONTRACT_CLAIM"] as const satisfies readonly ContractMode[];
const exportFormats = ["csv", "json"] as const;
const exportContractRootModes = ["none"] as const;

export const isJsonRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const bodyRecord = (body: unknown): JsonRecord => {
  if (body === undefined) {
    return {};
  }

  if (!isJsonRecord(body)) {
    throw invalidRequest("body", "Request body must be a JSON object.");
  }

  return body;
};

export const optionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

export const requiredString = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidRequest(field, `${field} must be a non-empty string.`);
  }

  return value;
};

export const requiredNumber = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidRequest(field, `${field} must be a finite number.`);
  }

  return value;
};

export const requiredBoolean = (body: JsonRecord, field: string) => {
  const value = body[field];

  if (typeof value !== "boolean") {
    throw invalidRequest(field, `${field} must be a boolean.`);
  }

  return value;
};

export const requiredRecord = (body: JsonRecord, field: string): JsonPrimitiveRecord => {
  const value = body[field];

  if (!isJsonRecord(value)) {
    throw invalidRequest(field, `${field} must be a JSON object.`);
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number | boolean] =>
      typeof entry[1] === "string"
      || typeof entry[1] === "number"
      || typeof entry[1] === "boolean",
  );

  return Object.fromEntries(entries);
};

const enumValue = <TValue extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly TValue[],
): TValue => {
  if (typeof value !== "string" || !allowedValues.includes(value as TValue)) {
    throw invalidRequest(field, `${field} must be one of: ${allowedValues.join(", ")}.`);
  }

  return value as TValue;
};

export const optionalEnumValue = <TValue extends string>(
  value: unknown,
  field: string,
  allowedValues: readonly TValue[],
): TValue | undefined => (value === undefined ? undefined : enumValue(value, field, allowedValues));

export const requiredAccountType = (body: JsonRecord, field = "accountType") =>
  enumValue(body[field], field, accountTypes);

export const optionalAccountType = (value: unknown, field = "accountType") =>
  optionalEnumValue(value, field, accountTypes);

export const requiredWalletSource = (body: JsonRecord, field = "walletSource") =>
  enumValue(body[field], field, walletSources);

export const optionalWalletSource = (value: unknown, field = "walletSource") =>
  optionalEnumValue(value, field, walletSources);

export const requiredVerificationType = (body: JsonRecord, field = "verificationType") =>
  enumValue(body[field], field, verificationTypes);

export const requiredWalletCompatibility = (body: JsonRecord, field = "walletCompatibility") =>
  enumValue(body[field], field, walletCompatibilities);

export const optionalContractMode = (value: unknown, field = "contractMode") =>
  optionalEnumValue(value, field, contractModes);

export const optionalLocale = (value: unknown, field = "locale"): SupportedLocale | undefined =>
  value === undefined
    ? undefined
    : (() => {
        if (typeof value !== "string" || !supportedLocales.includes(value as SupportedLocale)) {
          throw unsupportedLocale(typeof value === "string" ? value : field);
        }

        return value as SupportedLocale;
      })();

export const requiredRouteParam = (params: Record<string, string>, field: string) => {
  const value = params[field];

  if (!value) {
    throw invalidRequest(field, `${field} route parameter is required.`);
  }

  return value;
};

export const exportFormat = (value: unknown) =>
  optionalEnumValue(value, "format", exportFormats) ?? "csv";

export const exportContractRootMode = (value: unknown) =>
  value === undefined
    ? "none"
    : (() => {
        if (typeof value !== "string" || !exportContractRootModes.includes(value as "none")) {
          throw unsupportedExportMode(typeof value === "string" ? value : "unknown-export-mode");
        }

        return value as "none";
      })();
