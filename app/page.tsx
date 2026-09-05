import { CHANNELS } from "@/lib/channels";
import { buildFeed } from "@/lib/payload";
import { officialSince } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await buildFeed();

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", maxWidth: 820, margin: "48px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Influencer predictions</h1>
      <p style={{ color: "#555", lineHeight: 1.55 }}>
        Separate Vercel service for LaSalle Investing. The professor platform pulls{" "}
        <code>GET /api/influencers</code> once and receives {CHANNELS.length} YouTube
        channels. Official videos start {officialSince().toISOString().slice(0, 10)}. A daily
        cron ingests new uploads; titles that do not look like stock calls are skipped
        before the transcript.
      </p>
      <p style={{ marginTop: 16 }}>
        <a href="/api/influencers">/api/influencers</a>
        {" · "}
        <a href="/api/health">/api/health</a>
        {" · "}
        <a href="/api/cron/ingest?test=1&limit=2">test ingest</a>
      </p>
      <ul style={{ marginTop: 20, paddingLeft: 18, color: "#333", lineHeight: 1.6 }}>
        {CHANNELS.map((channel) => (
          <li key={channel.id}>
            <a href={channel.channelUrl}>{channel.name}</a>
            <span style={{ color: "#777" }}> · @{channel.handle}</span>
          </li>
        ))}
      </ul>
      <pre
        style={{
          marginTop: 24,
          padding: 16,
          background: "#111",
          color: "#e8ecf4",
          borderRadius: 8,
          overflow: "auto",
          fontSize: 13,
        }}
      >
        {JSON.stringify(feed, null, 2)}
      </pre>
    </main>
  );
}
