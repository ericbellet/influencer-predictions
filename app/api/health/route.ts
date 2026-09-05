import { CHANNELS } from "@/lib/channels";
import { loadState } from "@/lib/store";
import { officialSince } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await loadState();
  return Response.json({
    status: "ok",
    service: "influencer-predictions",
    channels: CHANNELS.length,
    officialSince: officialSince().toISOString(),
    processedVideos: Object.keys(state.processed).length,
    updatedAt: state.updatedAt,
  });
}
