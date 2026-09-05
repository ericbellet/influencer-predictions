import { CHANNELS } from "@/lib/channels";
import { extractPredictions } from "@/lib/extract";
import { looksLikeStockVideo } from "@/lib/relevance";
import { loadState, saveState } from "@/lib/store";
import type { InfluencerChannel, ProcessedVideo, StoreState } from "@/lib/types";
import { sinceFromRequest } from "@/lib/week";
import { fetchTranscript, listChannelVideos, type YoutubeVideo } from "@/lib/youtube";

export interface IngestOptions {
  searchParams?: URLSearchParams;
  limit?: number;
  channelHandle?: string;
}

export interface IngestSummary {
  since: string;
  channels: number;
  listed: number;
  considered: number;
  processed: number;
  relevant: number;
  skipped: number;
  withPicks: number;
  videos: Array<{
    id: string;
    channel: string;
    title: string;
    relevant: boolean;
    picks: number;
    skippedReason?: string;
  }>;
}

function publishedAt(video: YoutubeVideo): Date {
  const date = new Date(video.publishedAt);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

async function processVideo(
  channel: InfluencerChannel,
  video: YoutubeVideo,
): Promise<ProcessedVideo> {
  const relevant = looksLikeStockVideo(video.title, video.description);
  if (!relevant) {
    return {
      videoId: video.id,
      channelId: channel.channelId,
      title: video.title,
      publishedAt: video.publishedAt,
      processedAt: new Date().toISOString(),
      relevant: false,
      skippedReason: "title/description do not look like a stock recommendation",
      predictions: [],
    };
  }

  const transcript = await fetchTranscript(video.id, channel.language);
  const text = [video.title, video.description, transcript ?? ""].filter(Boolean).join("\n\n");
  const predictions = await extractPredictions(text, channel);

  return {
    videoId: video.id,
    channelId: channel.channelId,
    title: video.title,
    publishedAt: video.publishedAt,
    processedAt: new Date().toISOString(),
    relevant: true,
    transcriptChars: transcript?.length ?? 0,
    skippedReason: predictions.length === 0 ? "no recommended stocks found" : undefined,
    predictions,
  };
}

export async function runIngest(options: IngestOptions = {}): Promise<{
  state: StoreState;
  summary: IngestSummary;
}> {
  const since = sinceFromRequest(options.searchParams);
  const limit = options.limit ?? Number(options.searchParams?.get("limit") ?? 4);
  const handle = options.channelHandle ?? options.searchParams?.get("channel") ?? null;
  const channels = handle
    ? CHANNELS.filter((channel) => channel.handle.toLowerCase() === handle.toLowerCase())
    : CHANNELS;

  const state = await loadState();
  const channelErrors = { ...state.channelErrors };
  state.channelErrors = channelErrors;
  const summary: IngestSummary = {
    since: since.toISOString(),
    channels: channels.length,
    listed: 0,
    considered: 0,
    processed: 0,
    relevant: 0,
    skipped: 0,
    withPicks: 0,
    videos: [],
  };

  const queue: Array<{ channel: InfluencerChannel; video: YoutubeVideo }> = [];

  for (const channel of channels) {
    try {
      const videos = await listChannelVideos(channel.channelId);
      delete channelErrors[channel.channelId];
      summary.listed += videos.length;
      for (const video of videos) {
        if (publishedAt(video) < since) continue;
        summary.considered += 1;
        if (state.processed[video.id]) continue;
        queue.push({ channel, video });
      }
    } catch (error) {
      channelErrors[channel.channelId] = {
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      };
    }
  }

  queue.sort((a, b) => publishedAt(b.video).getTime() - publishedAt(a.video).getTime());
  const batch = queue.slice(0, Math.max(1, limit));

  for (const { channel, video } of batch) {
    let processed: ProcessedVideo;
    try {
      processed = await processVideo(channel, video);
    } catch (error) {
      channelErrors[channel.channelId] = {
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      };
      continue;
    }
    state.processed[video.id] = processed;
    summary.processed += 1;
    if (processed.relevant) summary.relevant += 1;
    else summary.skipped += 1;
    if (processed.predictions.length > 0) summary.withPicks += 1;
    summary.videos.push({
      id: video.id,
      channel: channel.name,
      title: video.title,
      relevant: processed.relevant,
      picks: processed.predictions.length,
      skippedReason: processed.skippedReason,
    });
  }

  await saveState(state);
  return { state, summary };
}
