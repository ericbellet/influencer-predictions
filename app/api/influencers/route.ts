import { buildFeed } from "@/lib/payload";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await buildFeed();
  return Response.json(feed);
}
