import { redactProviderHttpRuntimeValue } from "./providerHttpRuntimeRedaction";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";

export type ProviderHttpTransportDiagnosticCode =
  | "transport_missing"
  | "transport_thrown_error";

export interface ProviderHttpTransportDiagnostic {
  code: ProviderHttpTransportDiagnosticCode;
  field: string;
  message: string;
  redactedFields: string[];
  redactedValue?: unknown;
  severity: "blocker" | "error";
}

export type ProviderHttpTransportRequest = ProviderHttpRequestPlan;

export interface ProviderHttpTransportContext {
  attemptStartedAtMs: number;
  traceId: string;
}

export interface ProviderHttpTransportResult {
  aborted?: boolean;
  body?: unknown;
  durationMs: number;
  error?: unknown;
  headers?: Record<string, string>;
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
  };

export const createMissingProviderHttpTransportDiagnostic = ():
  ProviderHttpTransportDiagnostic => ({
    code: "transport_missing",
    field: "transport",
    message: "Provider HTTP transport must be injected before execution.",
    redactedFields: [],
    severity: "blocker",
  });

export const executeProviderHttpTransport = async (
  request: ProviderHttpTransportRequest,
  transport?: ProviderHttpTransport,
): Promise<ProviderHttpTransportExecutionResult> => {
  if (!transport) {
    return {
      diagnostics: [createMissingProviderHttpTransportDiagnostic()],
      ok: false,
    };
  }

  try {
    const result = await transport(request, {
      attemptStartedAtMs: Date.now(),
      traceId: request.traceId,
    });

    return {
      diagnostics: [],
      ok: true,
      result: {
        ...result,
        headers: result.headers ? { ...result.headers } : undefined,
      },
    };
  } catch (error) {
    return {
      diagnostics: [
        {
          code: "transport_thrown_error",
          field: "transport",
          message: "Provider HTTP transport threw an error with redacted detail.",
          redactedFields: ["transport"],
          redactedValue: redactProviderHttpRuntimeValue(error),
          severity: "error",
        },
      ],
      ok: false,
    };
  }
};
