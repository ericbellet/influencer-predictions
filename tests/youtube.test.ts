import { afterEach, describe, expect, it, vi } from "vitest";

import { listChannelVideos } from "@/lib/youtube";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <yt:videoId>abcdefghijk</yt:videoId>
    <title>AAPL is my pick</title>
    <published>2026-09-08T08:00:00+00:00</published>
    <media:description>Why I like Apple</media:description>
  </entry>
</feed>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listChannelVideos", () => {
  it("parses a healthy YouTube RSS response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(XML, { status: 200 })));

    const videos = await listChannelVideos("UC-test", { retryDelayMs: 0 });

    expect(videos).toEqual([
      {
        id: "abcdefghijk",
        title: "AAPL is my pick",
        publishedAt: "2026-09-08T08:00:00+00:00",
        description: "Why I like Apple",
        url: "https://www.youtube.com/watch?v=abcdefghijk",
      },
    ]);
  });

  it("recovers when a valid channel temporarily returns 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(XML, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const videos = await listChannelVideos("UC-test", { retryDelayMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(videos).toHaveLength(1);
  });

  it("reports the final status after three failed attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listChannelVideos("UC-test", { retryDelayMs: 0 })).rejects.toThrow(
      "YouTube RSS 404 for UC-test after 3 attempts",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
