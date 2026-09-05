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
 */
export async function listChannelVideos(channelId: string): Promise<YoutubeVideo[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const response = await fetch(url, {
    headers: { Accept: "application/atom+xml,application/xml", "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`YouTube RSS ${response.status} for ${channelId}`);
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
