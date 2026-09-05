import { CHANNELS } from "@/lib/channels";
import { loadState, storageBackend } from "@/lib/store";
import { officialSince } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadState();
    return Response.json({
      status: "ok",
      service: "influencer-predictions",
      storage: storageBackend(),
      channels: CHANNELS.length,
      officialSince: officialSince().toISOString(),
      processedVideos: Object.keys(state.processed).length,
      updatedAt: state.updatedAt,
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        service: "influencer-predictions",
        storage: storageBackend(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
