/**
 * Event times in the database are entered as the intended local wall-clock
 * time and stored as UTC (existing convention in this project), so we format
 * them in UTC to show exactly what the team typed.
 */
export function formatEventDate(iso: string) {
  const d = new Date(iso);
  return {
    full: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
    short: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase(),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  };
}

/** True once the given calendar day (YYYY-MM-DD) has fully ended in Nigeria (WAT, UTC+1). */
export function isPastDay(day: string, now: number = Date.now()): boolean {
  return now > new Date(`${day}T23:59:59+01:00`).getTime();
}
