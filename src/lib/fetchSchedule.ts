/** Matches fetch-quote.yml: thrice Mon–Fri UTC (00, 08, 15) = 09:00 / 17:00 / 00:00 KST. */
export const FETCH_CRON_UTC_HOURS = [0, 8, 15] as const;

function isUtcWeekday(date: Date): boolean {
  const dow = date.getUTCDay(); // 0=Sun … 6=Sat
  return dow >= 1 && dow <= 5;
}

export function getNextFetchRun(from = new Date()): Date {
  const nowMs = from.getTime();
  // Search up to 10 days ahead so weekends are skipped cleanly.
  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    const base = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate() + dayOffset,
      ),
    );
    if (!isUtcWeekday(base)) continue;
    for (const hour of FETCH_CRON_UTC_HOURS) {
      const t = Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate(),
        hour,
        0,
        0,
        0,
      );
      if (t > nowMs) return new Date(t);
    }
  }
  return new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate() + 1,
      FETCH_CRON_UTC_HOURS[0],
      0,
      0,
      0,
    ),
  );
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
