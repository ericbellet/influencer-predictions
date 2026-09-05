/** ISO week id, same shape the professor platform uses: 2026-W36 */
export function isoWeekId(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function officialSince(): Date {
  const raw = process.env.INGEST_SINCE?.trim() || "2026-09-06";
  return new Date(`${raw}T00:00:00.000+02:00`);
}

export function allowHistorical(searchParams?: URLSearchParams): boolean {
  if (searchParams?.get("test") === "1") return true;
  if (searchParams?.get("since")) return true;
  const flag = process.env.INGEST_ALLOW_HISTORICAL?.trim();
  return flag === "true" || flag === "1";
}

export function sinceFromRequest(searchParams?: URLSearchParams): Date {
  const override = searchParams?.get("since");
  if (override) return new Date(`${override}T00:00:00.000Z`);
  if (allowHistorical(searchParams)) return new Date("2020-01-01T00:00:00.000Z");
  return officialSince();
}
