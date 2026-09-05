function acceptedTokens(): string[] {
  return [process.env.CRON_SECRET, process.env.ADMIN_TOKEN].filter(
    (value): value is string => Boolean(value?.trim()),
  );
}

export function authorise(request: Request): boolean {
  const accepted = acceptedTokens();
  if (accepted.length === 0) return true;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  return accepted.includes(provided);
}
