import {
  createRewardDistributionHandoffReadiness,
  type RewardDistributionHandoffEvidenceInput,
  type RewardDistributionHandoffReadiness,
  type RewardDistributionHandoffRuntimeDiagnostic,
} from "../domain/rewardDistributionHandoffRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { CampaignShellDetail } from "../domain/types";

export interface CreateServerRewardDistributionHandoffReadinessOptions {
  campaign?: CampaignShellDetail;
  diagnostics?: readonly RewardDistributionHandoffRuntimeDiagnostic[];
  evidence?: RewardDistributionHandoffEvidenceInput;
  traceId?: string;
}

export const createServerRewardDistributionHandoffReadiness = ({
  campaign = campaignDetail,
  diagnostics,
  evidence,
  traceId,
}: CreateServerRewardDistributionHandoffReadinessOptions = {}): RewardDistributionHandoffReadiness =>
  createRewardDistributionHandoffReadiness({
    campaign,
    diagnostics,
    evidence,
    source: "server_runtime",
    traceId,
  });
