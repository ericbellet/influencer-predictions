import { describe, expect, it } from "vitest";

import { CHANNELS } from "@/lib/channels";
import { extractPredictions } from "@/lib/extract";

const channel = CHANNELS[0]!;

describe("extractPredictions heuristic", () => {
  it("returns nothing when no stock is recommended", () => {
    return extractPredictions("Hoy hablo de mi rutina y de viajar a Madrid.", channel).then((picks) => {
      expect(picks).toEqual([]);
    });
  });

  it("keeps one ticker when that is all the video offers", async () => {
    const picks = await extractPredictions(
      "Esta semana recomiendo $AAPL por valoración. No hay más ideas.",
      channel,
    );
    expect(picks.length).toBe(1);
    expect(picks[0]?.ticker).toBe("AAPL");
    expect(picks[0]?.horizon).toBe("1W");
  });

  it("caps at three tickers for the inferred horizon", async () => {
    const picks = await extractPredictions(
      "A largo plazo me quedo con Apple, Microsoft, Nvidia y Amazon.",
      channel,
    );
    expect(picks.map((pick) => pick.ticker)).toEqual(["AAPL", "MSFT", "NVDA"]);
    expect(picks.every((pick) => pick.horizon === "6M")).toBe(true);
    expect(picks.map((pick) => pick.rank)).toEqual([1, 2, 3]);
  });
});
