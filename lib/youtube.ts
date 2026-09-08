import { YoutubeTranscript } from "youtube-transcript";

export interface YoutubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  description: string;
  url: string;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; influencer-predictions/1.0; +https://lasalle.investing)";
const RSS_ATTEMPTS = 3;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/**
 * Public RSS — no YouTube Data API key required.
 *
 * YouTube occasionally returns a transient 404 for valid channel feeds. A
 * single response must not poison the persisted channel state until the next
 * day's cron, so retry the small set of statuses known to be temporary here.
 */
export async function listChannelVideos(
  channelId: string,
  options: { retryDelayMs?: number } = {},
): Promise<YoutubeVideo[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const retryDelayMs = options.retryDelayMs ?? 250;
  let response: Response | null = null;
  let networkError: unknown = null;

  for (let attempt = 1; attempt <= RSS_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(url, {
        headers: { Accept: "application/atom+xml,application/xml", "User-Agent": USER_AGENT },
        cache: "no-store",
      });
      networkError = null;
      if (response.ok) break;
      if (response.status !== 404 && response.status !== 429 && response.status < 500) break;
    } catch (error) {
      networkError = error;
    }

    if (attempt < RSS_ATTEMPTS && retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** (attempt - 1)));
    }
  }

  if (!response?.ok) {
    if (networkError) {
      const reason = networkError instanceof Error ? networkError.message : String(networkError);
      throw new Error(`YouTube RSS network error for ${channelId}: ${reason}`);
    }
    throw new Error(`YouTube RSS ${response?.status ?? "unavailable"} for ${channelId} after ${RSS_ATTEMPTS} attempts`);
  }

  const xml = await response.text();
  const entries = xml.split("<entry>").slice(1);
  return entries
    .map((entry) => {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
      const title = decodeXml(entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? "");
      const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const description = decodeXml(
        entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? "",
      );
      if (!id) return null;
      return {
        id,
        title,
        publishedAt,
        description,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter((video): video is YoutubeVideo => video !== null);
}

export async function fetchTranscript(videoId: string, language: "es" | "en"): Promise<string | null> {
  const order = language === "es" ? ["es", "en"] : ["en", "es"];
  for (const lang of order) {
    try {
      const parts = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      const text = parts.map((part) => part.text).join(" ").replace(/\s+/g, " ").trim();
      if (text.length > 40) return text;
    } catch {
      // try the next language
    }
  }

  try {
    const parts = await YoutubeTranscript.fetchTranscript(videoId);
    const text = parts.map((part) => part.text).join(" ").replace(/\s+/g, " ").trim();
    return text.length > 40 ? text : null;
  } catch {
    return null;
  }
}
