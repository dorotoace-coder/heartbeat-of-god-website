export type FollowupSource = "outreach" | "visitor" | "ministry";
export type BoardItem = {
  id: string;
  source?: FollowupSource;
  full_name: string;
  followup_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  closure_outcome: "completed" | "declined" | null;
};
export type BoardLane = "overdue" | "today" | "upcoming" | "closed";
export const boardLanes: { id: BoardLane; label: string }[] = [
  { id: "overdue", label: "Overdue" }, { id: "today", label: "Due today" },
  { id: "upcoming", label: "Upcoming" }, { id: "closed", label: "Closed" },
];

// Dates are calendar dates in the ministry's service time zone, not UTC instants.
export function ministryToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find(value => value.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function followupLane(item: BoardItem, today: string): BoardLane {
  if (item.completed_at) return "closed";
  if (item.followup_date < today) return "overdue";
  return item.followup_date === today ? "today" : "upcoming";
}
export function filterFollowups<T extends BoardItem>(items: T[], filters: {
  search: string; source: "all" | FollowupSource; assignment: "all" | "mine" | "unassigned";
  userId: string | null;
}): T[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return items.filter(item => (!query || item.full_name.toLocaleLowerCase().includes(query)) &&
    (filters.source === "all" || (item.source ?? "outreach") === filters.source) &&
    (filters.assignment === "all" || (filters.assignment === "mine"
      ? !!filters.userId && item.assigned_to === filters.userId : item.assigned_to === null)))
    .sort((a, b) => a.followup_date.localeCompare(b.followup_date) || a.full_name.localeCompare(b.full_name));
}
