import { CHANNELS } from "@/lib/channels";
import { buildFeed } from "@/lib/payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const feed = await buildFeed();
    return Response.json(feed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const generatedAt = new Date().toISOString();
    return Response.json({
      generated_at: generatedAt,
      error: message,
      influencers: CHANNELS.map((channel) => ({
        name: channel.name,
        handle: channel.handle,
        source: "youtube",
        channel_url: channel.channelUrl,
        generated_at: generatedAt,
        predictions: [],
        videos: [],
        error: message,
      })),
    });
  }
}
