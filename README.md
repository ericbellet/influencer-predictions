# Influencer predictions

Separate Vercel service for [LaSalle Investing](https://github.com/ericbellet/value-investing-challenge). The professor platform does **not** call one URL per influencer. It calls this feed once:

```http
GET /api/influencers
```

```json
{
  "generated_at": "2026-09-06T12:00:00Z",
  "influencers": [
    {
      "name": "La Pizarra de Andrés",
      "handle": "lapizarradeandres",
      "source": "youtube",
      "channel_url": "https://www.youtube.com/@lapizarradeandres",
      "generated_at": "2026-09-06T10:00:00Z",
      "predictions": [
        { "ticker": "AAPL", "horizon": "3M", "rank": 1, "investment_thesis": "…" }
      ],
      "videos": []
    }
  ]
}
```

Each person uses the same pick shape as a student (`ticker`, `horizon`, `rank`). Empty `predictions` is valid: if a video does not recommend a stock, we do not invent one.

## What the cron does

Daily at 06:00 UTC (`vercel.json`):

1. Read the public YouTube RSS of every channel in `lib/channels.ts`, retrying transient 404, 429 and 5xx responses
2. Keep videos published on or after `2026-09-06` (tomorrow at the time this was built)
3. Drop videos whose title/description do not look like stock recommendations
4. Fetch the transcript only for the rest
5. Extract up to 3 tickers per horizon. If the speaker never names a horizon, the channel default is used. One ticker is enough. Zero tickers means no pick.
6. Persist processed video ids so the next run is incremental

The Sunday job on the professor platform then pulls `/api/influencers` and stores each person as an `influencer` next to the students.

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Test the pipeline on older videos (the official window is still empty until 6 September 2026):

```bash
curl "http://localhost:3001/api/cron/ingest?test=1&limit=2"
```

Restrict to one channel:

```bash
curl "http://localhost:3001/api/cron/ingest?test=1&limit=1&channel=artedeinvertir"
```

## Storage

Processed videos live in the **same Supabase Postgres** as the professor platform, table `influencer_ingest_state`. Set `DATABASE_URL` to that pooled URI. Without it (local), the service writes `data/state.json`.
