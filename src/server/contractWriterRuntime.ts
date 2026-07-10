import {
  createContractWriterRuntimeReadiness,
  type ContractWriterConfigHandoffInput,
  type ContractWriterRuntimeDiagnostic,
  type ContractWriterRuntimeReadiness,
} from "../domain/contractWriterRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { CampaignShellDetail } from "../domain/types";

export interface CreateServerContractWriterRuntimeReadinessOptions {
  campaign?: CampaignShellDetail;
  configHandoff?: ContractWriterConfigHandoffInput;
  diagnostics?: readonly ContractWriterRuntimeDiagnostic[];
  traceId?: string;
}

export const createServerContractWriterRuntimeReadiness = ({
  campaign = campaignDetail,
  configHandoff,
  diagnostics,
  traceId,
}: CreateServerContractWriterRuntimeReadinessOptions = {}): ContractWriterRuntimeReadiness =>
  createContractWriterRuntimeReadiness({
    campaign,
    configHandoff,
    diagnostics,
    source: "server_runtime",
    traceId,
  });
