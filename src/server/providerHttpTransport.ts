import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";

export type ProviderHttpTransportDiagnosticCode =
  | "transport_missing"
  | "transport_result_invalid"
  | "transport_thrown_error";

export interface ProviderHttpTransportDiagnostic {
  code: ProviderHttpTransportDiagnosticCode;
  field: string;
  message: string;
  redactedFields: string[];
  redactedValue?: "[REDACTED:ERROR]";
  severity: "blocker" | "error";
  traceId: string;
}

export type ProviderHttpTransportRequest = ProviderHttpRequestPlan;

export interface ProviderHttpTransportContext {
  attemptStartedAtMs: number;
  runtimeSignal?: AbortSignal;
  signal?: AbortSignal;
  traceId: string;
}

export type ProviderHttpTransportResultDiagnosticCode =
  | "caller_aborted"
  | "empty_body"
  | "fetch_failed"
  | "malformed_json"
  | "material_resolution_failed"
  | "production_transport_unpinned"
  | "response_too_large"
  | "runtime_aborted"
  | "timeout"
  | "transport_closed"
  | "unsupported_content_type";

const providerHttpTransportResultDiagnosticCodes = new Set<
  ProviderHttpTransportResultDiagnosticCode
>([
  "caller_aborted",
  "empty_body",
  "fetch_failed",
  "malformed_json",
  "material_resolution_failed",
  "production_transport_unpinned",
  "response_too_large",
  "runtime_aborted",
  "timeout",
  "transport_closed",
  "unsupported_content_type",
]);

export interface ProviderHttpTransportResultDiagnostic {
  code: ProviderHttpTransportResultDiagnosticCode;
  message: string;
  traceId: string;
}

export interface ProviderHttpTransportResult {
  aborted?: boolean;
  body?: unknown;
  diagnostic?: ProviderHttpTransportResultDiagnostic;
  durationMs: number;
  retryAfterMs?: number;
  statusCode?: number;
  timedOut: boolean;
}

export type ProviderHttpTransport =
  (request: ProviderHttpTransportRequest, context: ProviderHttpTransportContext) =>
    | Promise<ProviderHttpTransportResult>
    | ProviderHttpTransportResult;

export type ProviderHttpTransportExecutionResult =
  | {
    diagnostics: [];
    ok: true;
    result: ProviderHttpTransportResult;
  }
  | {
    diagnostics: ProviderHttpTransportDiagnostic[];
    ok: false;
    result?: undefined;
    transportExecuted: boolean;
  };

export const createMissingProviderHttpTransportDiagnostic = (
  traceId = "trace-unavailable",
):
  ProviderHttpTransportDiagnostic => ({
    code: "transport_missing",
    field: "transport",
    message: "Provider HTTP transport must be injected before execution.",
    redactedFields: [],
    severity: "blocker",
    traceId: safeTraceId(traceId),
  });

export const executeProviderHttpTransport = async (
  request: ProviderHttpTransportRequest,
  transport?: ProviderHttpTransport,
  context: Partial<ProviderHttpTransportContext> = {},
): Promise<ProviderHttpTransportExecutionResult> => {
  if (!transport) {
    return {
      diagnostics: [createMissingProviderHttpTransportDiagnostic(request.traceId)],
      ok: false,
      transportExecuted: false,
    };
  }

  try {
    const result = await transport(request, {
      attemptStartedAtMs: context.attemptStartedAtMs ?? Date.now(),
      ...(context.runtimeSignal ? { runtimeSignal: context.runtimeSignal } : {}),
      ...(context.signal ? { signal: context.signal } : {}),
      traceId: request.traceId,
    });

    if (!isValidTransportResult(result)) {
      return {
        diagnostics: [transportDiagnostic(
          "transport_result_invalid",
          "Provider HTTP transport returned an invalid result.",
          request.traceId,
        )],
        ok: false,
        transportExecuted: true,
      };
    }

    return {
      diagnostics: [],
      ok: true,
      result: {
        ...(result.aborted === undefined ? {} : { aborted: result.aborted }),
        ...(result.body === undefined ? {} : { body: result.body }),
        ...(result.diagnostic === undefined ? {} : {
          diagnostic: {
            code: result.diagnostic.code,
            message: "Provider HTTP transport returned a safe diagnostic posture.",
            traceId: safeTraceId(request.traceId),
          },
        }),
        durationMs: result.durationMs,
        ...(result.retryAfterMs === undefined ? {} : { retryAfterMs: result.retryAfterMs }),
        ...(result.statusCode === undefined ? {} : { statusCode: result.statusCode }),
        timedOut: result.timedOut,
      },
    };
  } catch {
    return {
      diagnostics: [
        {
          ...transportDiagnostic(
            "transport_thrown_error",
            "Provider HTTP transport threw an error with redacted detail.",
            request.traceId,
          ),
          redactedValue: "[REDACTED:ERROR]",
        },
      ],
      ok: false,
      transportExecuted: true,
    };
  }
};

function isValidTransportResult(value: unknown): value is ProviderHttpTransportResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Partial<ProviderHttpTransportResult>;
  return typeof result.durationMs === "number"
    && Number.isFinite(result.durationMs)
    && result.durationMs >= 0
    && typeof result.timedOut === "boolean"
    && (result.statusCode === undefined
      || (Number.isInteger(result.statusCode) && result.statusCode >= 100 && result.statusCode <= 599))
    && (result.retryAfterMs === undefined
      || (Number.isInteger(result.retryAfterMs) && result.retryAfterMs >= 0))
    && (result.diagnostic === undefined
      || (
        typeof result.diagnostic === "object"
        && result.diagnostic !== null
        && providerHttpTransportResultDiagnosticCodes.has(result.diagnostic.code)
      ));
}

function transportDiagnostic(
  code: ProviderHttpTransportDiagnosticCode,
  message: string,
  traceId: string,
): ProviderHttpTransportDiagnostic {
  return {
    code,
    field: "transport",
    message,
    redactedFields: ["transport"],
    severity: "error",
    traceId: safeTraceId(traceId),
  };
}

function safeTraceId(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
    ? value
    : "trace-unavailable";
}
