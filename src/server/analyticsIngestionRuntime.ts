import {
  createAnalyticsIngestionRuntimeReadiness,
  type AnalyticsIngestionRuntimeDiagnostic,
  type AnalyticsIngestionRuntimeReadiness,
  type AnalyticsIngestionWarehouseHandoffInput,
} from "../domain/analyticsIngestionRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { CampaignShellDetail } from "../domain/types";

export interface CreateServerAnalyticsIngestionRuntimeReadinessOptions {
  campaign?: CampaignShellDetail;
  diagnostics?: readonly AnalyticsIngestionRuntimeDiagnostic[];
  traceId?: string;
  warehouseHandoff?: AnalyticsIngestionWarehouseHandoffInput;
}

export const createServerAnalyticsIngestionRuntimeReadiness = ({
  campaign = campaignDetail,
  diagnostics,
  traceId,
  warehouseHandoff,
}: CreateServerAnalyticsIngestionRuntimeReadinessOptions = {}): AnalyticsIngestionRuntimeReadiness =>
  createAnalyticsIngestionRuntimeReadiness({
    campaign,
    diagnostics,
    source: "server_runtime",
    traceId,
    warehouseHandoff,
  });
