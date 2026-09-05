/**
 * Cheap pre-filter so we do not download a full transcript for vlogs,
 * interviews or crypto-only rants that never name a stock.
 */

const STOCK_HINTS = [
  "stock",
  "stocks",
  "ticker",
  "tickers",
  "equity",
  "equities",
  "nasdaq",
  "nyse",
  "s&p",
  "s&p 500",
  "dow jones",
  "earnings",
  "dividend",
  "buy the dip",
  "undervalued",
  "overvalued",
  "price target",
  "accion",
  "acción",
  "acciones",
  "bolsa",
  "bursatil",
  "bursátil",
  "cotizada",
  "cotizadas",
  "ticker",
  "ibex",
  "nasdaq",
  "nyse",
  "sp500",
  "s&p",
  "cartera",
  "portfolio",
  "invertir en",
  "inversion en",
  "inversión en",
  "comprar",
  "recomiendo",
  "recomendacion",
  "recomendación",
  "analisis de",
  "análisis de",
  "value investing",
  "value investor",
  "warren buffett",
  "berkshire",
  "empresa cotizada",
  "resultados trimestrales",
];

const HARD_SKIP = [
  "crypto only",
  "solo crypto",
  "solo criptomonedas",
  "nft",
  "vlog",
  "unboxing",
  "podcast recap",
];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function looksLikeStockVideo(title: string, description = ""): boolean {
  const text = fold(`${title}\n${description}`);
  if (HARD_SKIP.some((hint) => text.includes(hint))) return false;
  return STOCK_HINTS.some((hint) => text.includes(fold(hint)));
}
