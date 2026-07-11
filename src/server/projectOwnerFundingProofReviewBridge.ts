import {
  createProjectOwnerFundingProofReviewBridge,
  type ProjectOwnerFundingProofDiagnostic,
  type ProjectOwnerFundingProofPackageInput,
  type ProjectOwnerFundingProofReviewBridge,
} from "../domain/projectOwnerFundingProofReviewBridge";
import { campaignDetail } from "../domain/fixtures";
import type { CampaignShellDetail } from "../domain/types";

export type { ProjectOwnerFundingProofPackageInput } from "../domain/projectOwnerFundingProofReviewBridge";

export interface CreateServerProjectOwnerFundingProofReviewBridgeOptions {
  campaign?: CampaignShellDetail;
  diagnostics?: readonly ProjectOwnerFundingProofDiagnostic[];
  proofPackage?: ProjectOwnerFundingProofPackageInput;
  traceId?: string;
}

export const createServerProjectOwnerFundingProofReviewBridge = ({
  campaign = campaignDetail,
  diagnostics,
  proofPackage,
  traceId,
}: CreateServerProjectOwnerFundingProofReviewBridgeOptions = {}): ProjectOwnerFundingProofReviewBridge =>
  createProjectOwnerFundingProofReviewBridge({
    campaign,
    diagnostics,
    proofPackage,
    source: "server_runtime",
    traceId,
  });
