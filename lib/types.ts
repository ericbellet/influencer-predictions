export const HORIZONS = ["1W", "1M", "3M", "6M"] as const;
export type Horizon = (typeof HORIZONS)[number];

export interface InfluencerChannel {
  id: string;
  name: string;
  handle: string;
  channelId: string;
  channelUrl: string;
  /** Used when the video never names a horizon. */
  defaultHorizon: Horizon;
  language: "es" | "en";
}

export interface PredictionItem {
  ticker: string;
  horizon: Horizon;
  rank: 1 | 2 | 3;
  target_price?: number | null;
  investment_thesis?: string | null;
  risks?: string | null;
}

export interface SourceVideo {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  relevant: boolean;
  skippedReason?: string;
  transcriptChars?: number;
}

export interface InfluencerPayload {
  name: string;
  handle: string;
  source: "youtube";
  channel_url: string;
  generated_at: string;
  predictions: PredictionItem[];
  videos: SourceVideo[];
}

export interface InfluencerFeed {
  generated_at: string;
  influencers: InfluencerPayload[];
}

export interface ProcessedVideo {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string;
  processedAt: string;
  relevant: boolean;
  skippedReason?: string;
  transcriptChars?: number;
  predictions: PredictionItem[];
}

export interface StoreState {
  officialSince: string;
  processed: Record<string, ProcessedVideo>;
  updatedAt: string;
}
