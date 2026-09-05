import { generateText, Output } from "ai";
import { z } from "zod";

import type { Horizon, InfluencerChannel, PredictionItem } from "@/lib/types";
import { HORIZONS } from "@/lib/types";

const STOP_TICKERS = new Set([
  "CEO",
  "CFO",
  "ETF",
  "ETFS",
  "IPO",
  "PE",
  "ROE",
  "ROA",
  "EPS",
  "GDP",
  "FED",
  "FOMC",
  "USA",
  "USD",
  "EUR",
  "GBP",
  "SPY",
  "QQQ",
  "VOO",
  "VTI",
  "IBEX",
  "NYSE",
  "AMEX",
  "TODO",
  "PARA",
  "ESTA",
  "ESTE",
  "COMO",
  "THE",
  "AND",
  "FOR",
  "YOU",
  "NOT",
]);

const NAME_TO_TICKER: Record<string, string> = {
  apple: "AAPL",
  microsoft: "MSFT",
  nvidia: "NVDA",
  alphabet: "GOOGL",
  google: "GOOGL",
  amazon: "AMZN",
  meta: "META",
  facebook: "META",
  tesla: "TSLA",
  netflix: "NFLX",
  berkshire: "BRK.B",
  "coca cola": "KO",
  "coca-cola": "KO",
  jpmorgan: "JPM",
  "jp morgan": "JPM",
  visa: "V",
  mastercard: "MA",
  "eli lilly": "LLY",
  novo: "NVO",
  asml: "ASML",
  tsmc: "TSM",
  "taiwan semiconductor": "TSM",
  broadcom: "AVGO",
  amd: "AMD",
  intel: "INTC",
  costco: "COST",
  walmart: "WMT",
  disney: "DIS",
  nike: "NKE",
  adobe: "ADBE",
  salesforce: "CRM",
  oracle: "ORCL",
  palantir: "PLTR",
  uber: "UBER",
  airbnb: "ABNB",
  paypal: "PYPL",
  block: "XYZ",
  square: "XYZ",
  inditex: "ITX.MC",
  zara: "ITX.MC",
  santander: "SAN.MC",
  bbva: "BBVA.MC",
  iberdrola: "IBE.MC",
  telefonica: "TEF.MC",
  telefónica: "TEF.MC",
  repsol: "REP.MC",
  ferrovial: "FER.MC",
  amadeus: "AMS.MC",
  "cellnex": "CLNX.MC",
  lvmh: "MC.PA",
  hermes: "RMS.PA",
  "hermès": "RMS.PA",
  loreal: "OR.PA",
  "l'oreal": "OR.PA",
  "l'oréal": "OR.PA",
  nestle: "NESN.SW",
  "nestlé": "NESN.SW",
  asmlholding: "ASML",
  sap: "SAP",
  siemens: "SIE.DE",
};

const extractedSchema = z.object({
  predictions: z
    .array(
      z.object({
        ticker: z.string(),
        horizon: z.enum(HORIZONS),
        rank: z.number().int().min(1).max(3),
        investment_thesis: z.string().max(2000).optional(),
        horizon_inferred: z.boolean().optional(),
      }),
    )
    .max(12),
});

function normaliseTicker(raw: string): string | null {
  const ticker = raw.trim().toUpperCase().replace(/^\$/, "");
  if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(ticker)) return null;
  if (STOP_TICKERS.has(ticker)) return null;
  if (ticker.length === 1) return null;
  return ticker;
}

function inferHorizon(text: string, fallback: Horizon): Horizon {
  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  if (/\b(esta semana|this week|7 dias|7 days|corto plazo inmediato|next week)\b/.test(folded)) {
    return "1W";
  }
  if (/\b(este mes|this month|4 semanas|30 dias|un mes|1 month|one month)\b/.test(folded)) {
    return "1M";
  }
  if (/\b(trimestre|tres meses|3 meses|3 months|quarter|this quarter)\b/.test(folded)) {
    return "3M";
  }
  if (/\b(largo plazo|seis meses|6 meses|6 months|un ano|one year|12 meses|hold forever)\b/.test(folded)) {
    return "6M";
  }
  return fallback;
}

function heuristicExtract(text: string, fallback: Horizon): PredictionItem[] {
  const found: Array<{ ticker: string; index: number }> = [];

  for (const match of text.matchAll(/\$([A-Za-z]{1,5})\b/g)) {
    const ticker = normaliseTicker(match[1] ?? "");
    if (ticker) found.push({ ticker, index: match.index ?? 0 });
  }

  for (const match of text.matchAll(/\b([A-Z]{2,5})(?:\.[A-Z]{1,2})?\b/g)) {
    const ticker = normaliseTicker(match[1] ?? "");
    if (ticker) found.push({ ticker, index: match.index ?? 0 });
  }

  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    const index = folded.indexOf(name);
    if (index >= 0) found.push({ ticker, index });
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of found.sort((a, b) => a.index - b.index)) {
    if (seen.has(item.ticker)) continue;
    seen.add(item.ticker);
    unique.push(item.ticker);
    if (unique.length >= 3) break;
  }

  if (unique.length === 0) return [];

  const horizon = inferHorizon(text, fallback);
  return unique.map((ticker, index) => ({
    ticker,
    horizon,
    rank: (index + 1) as 1 | 2 | 3,
    investment_thesis: `Mentioned as a pick in the video. Horizon ${horizon} inferred from the wording.`,
  }));
}

function rankWithinHorizons(items: PredictionItem[]): PredictionItem[] {
  const buckets = new Map<Horizon, PredictionItem[]>();
  for (const item of items) {
    const ticker = normaliseTicker(item.ticker);
    if (!ticker) continue;
    const list = buckets.get(item.horizon) ?? [];
    if (list.some((existing) => existing.ticker === ticker)) continue;
    list.push({ ...item, ticker });
    buckets.set(item.horizon, list);
  }

  const ranked: PredictionItem[] = [];
  for (const horizon of HORIZONS) {
    const list = (buckets.get(horizon) ?? []).slice(0, 3);
    list.forEach((item, index) => {
      ranked.push({ ...item, rank: (index + 1) as 1 | 2 | 3 });
    });
  }
  return ranked;
}

async function llmExtract(
  text: string,
  channel: InfluencerChannel,
): Promise<PredictionItem[] | null> {
  const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  if (!hasGateway) return null;

  try {
    const { output } = await generateText({
      model: "openai/gpt-5-mini",
      output: Output.object({ schema: extractedSchema }),
      prompt: `You extract stock RECOMMENDATIONS from a finance YouTube video.

Channel: ${channel.name} (${channel.language})
Default horizon if the speaker does not name one: ${channel.defaultHorizon}

Rules:
- Only include tickers the speaker is proposing to buy, overweight or is clearly bullish on.
- Ignore tickers used as examples, jokes, "don't buy", indexes, or broad ETFs (SPY, QQQ, VOO).
- If they recommend nothing, return an empty predictions array. Do not invent picks.
- Max 3 tickers per horizon. 1 is enough. Unique rank per horizon.
- Horizons must be one of 1W, 1M, 3M, 6M.
- If the horizon is not stated, infer it from the language and set horizon_inferred=true.
- Tickers uppercase (AAPL, ITX.MC, BRK.B).

Video / transcript:
${text.slice(0, 14000)}
`,
    });
    if (!output) return null;
    return rankWithinHorizons(
      output.predictions.map((item) => ({
        ticker: item.ticker,
        horizon: item.horizon,
        rank: item.rank as 1 | 2 | 3,
        investment_thesis: item.investment_thesis ?? null,
      })),
    );
  } catch {
    return null;
  }
}

export async function extractPredictions(
  text: string,
  channel: InfluencerChannel,
): Promise<PredictionItem[]> {
  const fromLlm = await llmExtract(text, channel);
  if (fromLlm) return fromLlm;
  return rankWithinHorizons(heuristicExtract(text, channel.defaultHorizon));
}
