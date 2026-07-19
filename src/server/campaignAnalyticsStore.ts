import type {
  CampaignAnalyticsErrorCode,
  CampaignAnalyticsSnapshot,
} from "../domain/campaignAnalytics";

export type CampaignAnalyticsStoreOperation = "close" | "read_snapshot";

const SAFE_ERROR_MESSAGES: Readonly<Record<CampaignAnalyticsErrorCode, string>> = {
  CAMPAIGN_ANALYTICS_ARGUMENT_INVALID: "Campaign analytics store argument is invalid.",
  CAMPAIGN_ANALYTICS_BOUND_EXCEEDED: "Campaign analytics store bound was exceeded.",
  CAMPAIGN_ANALYTICS_CLEANUP_FAILED: "Campaign analytics store cleanup failed.",
  CAMPAIGN_ANALYTICS_CLOSED: "Campaign analytics store is closed.",
  CAMPAIGN_ANALYTICS_INTEGRITY_FAILED: "Campaign analytics store integrity check failed.",
  CAMPAIGN_ANALYTICS_NOT_FOUND: "Campaign analytics snapshot was not found.",
  CAMPAIGN_ANALYTICS_ROW_CORRUPTION: "Campaign analytics store returned a corrupt row.",
  CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY: "Campaign analytics database schema is not ready.",
  CAMPAIGN_ANALYTICS_TIMEOUT: "Campaign analytics store operation timed out.",
  CAMPAIGN_ANALYTICS_UNAVAILABLE: "Campaign analytics store is unavailable.",
};

export class CampaignAnalyticsStoreError extends Error {
  readonly code: CampaignAnalyticsErrorCode;
  readonly operation: CampaignAnalyticsStoreOperation;
  readonly retryable: boolean;
  readonly traceId: string;

  constructor(options: {
    readonly code: CampaignAnalyticsErrorCode;
    readonly operation: CampaignAnalyticsStoreOperation;
    readonly retryable?: boolean;
    readonly traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "CampaignAnalyticsStoreError";
    this.code = options.code;
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;
    this.traceId = options.traceId;

    delete this.stack;
  }
}

export interface CampaignAnalyticsReadInput {
  readonly campaignId: string;
}

export interface CampaignAnalyticsReadContext {
  readonly signal?: AbortSignal;
  readonly traceId: string;
}

export interface CampaignAnalyticsCloseContext {
  readonly traceId: string;
}

export interface CampaignAnalyticsReadStore {
  readSnapshot(
    input: CampaignAnalyticsReadInput,
    context: CampaignAnalyticsReadContext,
  ): Promise<CampaignAnalyticsSnapshot>;
  close(context?: CampaignAnalyticsCloseContext): Promise<void>;
}
