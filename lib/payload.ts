import { CHANNELS } from "@/lib/channels";
import { loadState } from "@/lib/store";
import type { Horizon, InfluencerFeed, InfluencerPayload, PredictionItem, SourceVideo } from "@/lib/types";
import { HORIZONS } from "@/lib/types";
import { isoWeekId } from "@/lib/week";

function mondayOfIsoWeek(weekId: string): Date {
  const [yearText, weekText] = weekId.split("-W");
  const year = Number(yearText);
  const week = Number(weekText);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay();
  const monday = new Date(simple);
  const offset = day <= 4 ? day - 1 : day - 8;
  monday.setUTCDate(simple.getUTCDate() - offset);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function inIsoWeek(publishedAt: string, weekId: string): boolean {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return false;
  const start = mondayOfIsoWeek(weekId);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return published >= start && published < end;
}

function mergePicks(items: PredictionItem[]): PredictionItem[] {
  const buckets = new Map<Horizon, PredictionItem[]>();
  for (const item of items) {
    const list = buckets.get(item.horizon) ?? [];
    if (list.some((existing) => existing.ticker === item.ticker)) continue;
    list.push(item);
    buckets.set(item.horizon, list);
  }

  const merged: PredictionItem[] = [];
  for (const horizon of HORIZONS) {
    (buckets.get(horizon) ?? []).slice(0, 3).forEach((item, index) => {
      merged.push({ ...item, rank: (index + 1) as 1 | 2 | 3 });
    });
  }
  return merged;
}

export async function buildFeed(weekId = isoWeekId()): Promise<InfluencerFeed> {
  const state = await loadState();
  const generatedAt = new Date().toISOString();

  const influencers: InfluencerPayload[] = CHANNELS.map((channel) => {
    const videos = Object.values(state.processed)
      .filter((video) => video.channelId === channel.channelId && inIsoWeek(video.publishedAt, weekId))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    const picks = mergePicks(videos.flatMap((video) => video.predictions));
    const sourceVideos: SourceVideo[] = videos.map((video) => ({
      id: video.videoId,
      title: video.title,
      publishedAt: video.publishedAt,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      relevant: video.relevant,
      skippedReason: video.skippedReason,
      transcriptChars: video.transcriptChars,
    }));

    const channelError = state.channelErrors?.[channel.channelId]?.message ?? null;

    return {
      name: channel.name,
      handle: channel.handle,
      source: "youtube",
      channel_url: channel.channelUrl,
      generated_at: videos[0]?.processedAt ?? generatedAt,
      predictions: picks,
      videos: sourceVideos,
      error: channelError,
    };
  });

  const feedError = influencers.some((item) => item.error)
    ? "One or more YouTube channel queries failed"
    : null;
  return { generated_at: generatedAt, error: feedError, influencers };
}
