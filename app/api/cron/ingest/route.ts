import { authorise } from "@/lib/auth";
import { runIngest } from "@/lib/ingest";
import { buildFeed } from "@/lib/payload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request): Promise<Response> {
  if (!authorise(request)) {
    return Response.json({ ok: false, error: "Invalid or missing cron token." }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const { summary } = await runIngest({ searchParams: url.searchParams });
    const feed = await buildFeed();
    return Response.json({ ok: true, summary, feed });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
