/** Matches fetch-quote.yml schedule: every 6 hours at UTC 00, 06, 12, 18. */
export const FETCH_CRON_UTC_HOURS = [0, 6, 12, 18] as const;

export function getNextFetchRun(from = new Date()): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const d = from.getUTCDate();
  const nowMs = from.getTime();

  for (const hour of FETCH_CRON_UTC_HOURS) {
    const t = Date.UTC(y, m, d, hour, 0, 0, 0);
    if (t > nowMs) return new Date(t);
  }

  return new Date(Date.UTC(y, m, d + 1, FETCH_CRON_UTC_HOURS[0], 0, 0, 0));
}

function localHourLabel(utcHour: number, ref = new Date()): string {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), utcHour),
  );
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getDailyFetchRunLabels(ref = new Date()): string[] {
  return [...FETCH_CRON_UTC_HOURS]
    .map((h) => localHourLabel(h, ref))
    .sort((a, b) => a.localeCompare(b, "ko-KR"));
}

export function describeFetchSchedule(ref = new Date()): {
  nextRun: string;
  dailyRuns: string;
  timezone: string;
} {
  const next = getNextFetchRun(ref);
  const nextRun = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(next);

  const tz =
    new Intl.DateTimeFormat("ko-KR", { timeZoneName: "short" })
      .formatToParts(next)
      .find((p) => p.type === "timeZoneName")?.value ?? "";

  return {
    nextRun,
    dailyRuns: getDailyFetchRunLabels(ref).join(", "),
    timezone: tz,
  };
}
