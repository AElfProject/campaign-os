import type { ApiRuntimeSupportMode } from "./contracts";
import type { BackendServiceBoundaryId } from "./topology";

export type ApiEnvelopeErrorCategory =
  | "missing_resource"
  | "unexpected"
  | "unsupported_mode"
  | "validation";

export interface ApiEnvelopeDiagnosticsEntry {
  code: string;
  field: string;
  message: string;
}

export interface ApiEnvelopeContext {
  routeId: string;
  serviceId: BackendServiceBoundaryId;
  supportMode: ApiRuntimeSupportMode;
  timestamp?: string;
  traceId: string;
}

export interface ApiSuccessEnvelopeInput<TPayload> extends ApiEnvelopeContext {
  payload: TPayload;
}

export interface ApiErrorEnvelopeInput extends ApiEnvelopeContext {
  category: ApiEnvelopeErrorCategory;
  code?: string;
  diagnostics?: readonly Partial<ApiEnvelopeDiagnosticsEntry>[];
  message: string;
}

export interface ApiSuccessEnvelope<TPayload> extends ApiEnvelopeContext {
  ok: true;
  payload: TPayload;
  timestamp: string;
}

export interface ApiErrorEnvelope extends ApiEnvelopeContext {
  category: ApiEnvelopeErrorCategory;
  code: string;
  diagnostics: ApiEnvelopeDiagnosticsEntry[];
  message: string;
  ok: false;
  timestamp: string;
}

const defaultErrorCodeByCategory = {
  missing_resource: "API_MISSING_RESOURCE",
  unexpected: "API_UNEXPECTED_ERROR",
  unsupported_mode: "API_UNSUPPORTED_MODE",
  validation: "API_VALIDATION_ERROR",
} as const satisfies Record<ApiEnvelopeErrorCategory, string>;

const now = () => new Date().toISOString();

const nonEmpty = (value: string | undefined, fallback: string) =>
  value && value.trim().length > 0 ? value : fallback;

const normalizeDiagnostics = (
  diagnostics: readonly Partial<ApiEnvelopeDiagnosticsEntry>[] | undefined,
): ApiEnvelopeDiagnosticsEntry[] =>
  (diagnostics ?? []).map((diagnostic, index) => ({
    code: nonEmpty(diagnostic.code, "DIAGNOSTIC"),
    field: nonEmpty(diagnostic.field, `diagnostics[${index}]`),
    message: nonEmpty(diagnostic.message, "No diagnostic message provided."),
  }));

export const createApiSuccessEnvelope = <TPayload>({
  payload,
  routeId,
  serviceId,
  supportMode,
  timestamp = now(),
  traceId,
}: ApiSuccessEnvelopeInput<TPayload>): ApiSuccessEnvelope<TPayload> => ({
  ok: true,
  payload,
  routeId,
  serviceId,
  supportMode,
  timestamp,
  traceId,
});

export const createApiErrorEnvelope = ({
  category,
  code,
  diagnostics,
  message,
  routeId,
  serviceId,
  supportMode,
  timestamp = now(),
  traceId,
}: ApiErrorEnvelopeInput): ApiErrorEnvelope => ({
  category,
  code: nonEmpty(code, defaultErrorCodeByCategory[category]),
  diagnostics: normalizeDiagnostics(diagnostics),
  message,
  ok: false,
  routeId,
  serviceId,
  supportMode,
  timestamp,
  traceId,
});
