import { describe, expect, it } from "vitest";

import { looksLikeStockVideo } from "@/lib/relevance";

describe("looksLikeStockVideo", () => {
  it("accepts Spanish stock titles", () => {
    expect(looksLikeStockVideo("Warren Buffett apuesta todo en estas 4 acciones")).toBe(true);
    expect(looksLikeStockVideo("Análisis de Inditex y su valoración")).toBe(true);
  });

  it("accepts English stock titles", () => {
    expect(looksLikeStockVideo("The 3 stocks I'm buying this month")).toBe(true);
  });

  it("rejects unrelated videos", () => {
    expect(looksLikeStockVideo("Unboxing de mi nuevo microfono")).toBe(false);
    expect(looksLikeStockVideo("Daily vlog: gym and groceries")).toBe(false);
  });
});
