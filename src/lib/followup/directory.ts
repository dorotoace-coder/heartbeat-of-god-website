import { ministryToday } from "./board";

export type DirectoryContact = {
  import_key: string;
  display_name: string;
  email: string;
  phone_original: string;
  programs: string[];
  review_flags: string[];
  relationship: string;
  attendance: string;
  worker_match?: boolean;
  member_match?: boolean;
  worker_departments?: string[];
  review_reasons?: string[];
};

export type DirectoryFilters = { query: string; program: string; relationship: string; attendance: string };

export const relationshipLabels: Record<string, string> = {
  worker: "Worker account matched",
  member: "Member confirmed",
  unconfirmed: "Membership unconfirmed",
  review: "Needs review",
};

const reasonLabels: Record<string, string> = {
  import_flag: "Flagged when imported",
  shared_email: "Email shared with another contact",
  shared_phone: "Phone shared with another contact",
  member_details_differ: "Membership profile has different details",
};

const departmentLabels: Record<string, string> = {
  evangelism: "Evangelism",
  media: "Media",
  attendance: "Attendance",
  treasury: "Treasury",
  school: "Foundation School",
};

export function filterDirectory(contacts: DirectoryContact[], filters: DirectoryFilters) {
  const query = filters.query.toLowerCase().trim();
  return contacts.filter(contact =>
    (!filters.program || contact.programs.includes(filters.program)) &&
    (!filters.relationship || contact.relationship === filters.relationship) &&
    (!filters.attendance || contact.attendance === filters.attendance) &&
    [contact.display_name, contact.email, contact.phone_original].some(value => (value ?? "").toLowerCase().includes(query)));
}

/** Evidence lines shown under a contact. Works with the older RPC that returns only relationship. */
export function describeEvidence(contact: DirectoryContact) {
  const lines: string[] = [];
  const worker = contact.worker_match ?? contact.relationship === "worker";
  const member = contact.member_match ?? contact.relationship === "member";
  if (worker) {
    const departments = (contact.worker_departments ?? []).map(value => departmentLabels[value] ?? value);
    lines.push(departments.length ? `Worker account matched: ${departments.join(", ")}` : "Worker account matched");
  }
  if (member) lines.push("Member confirmed");
  if (!worker && !member && contact.relationship !== "review") lines.push("Membership unconfirmed");
  if (contact.relationship === "review") {
    const reasons = (contact.review_reasons ?? []).map(value => reasonLabels[value] ?? value);
    lines.push(reasons.length ? `Needs review: ${reasons.join("; ")}` : "Needs review");
  }
  lines.push(contact.attendance === "mta_attended" ? "MTA attendance confirmed" : "Attendance unknown");
  return lines;
}

/** Message for a failed directory refresh. supabase-js reports network failures as status 0. */
export function refreshProblem(status: number, code?: string | null) {
  if (status === 401 || status === 403 || code === "42501") return "Contacts could not refresh. Check your access and retry.";
  if (status === 0) return "Contacts could not refresh. Retry when connected.";
  return "Contacts could not refresh. Retry in a moment.";
}

export type DirectoryLinkRow = {
  directory_import_key: string;
  followup_date: string;
  completed_at: string | null;
  closure_outcome: "completed" | "declined" | null;
};
export type DirectoryLink = { openDue?: string; declined?: boolean; closedAt?: string };

export function summariseLinks(rows: DirectoryLinkRow[]) {
  const links: Record<string, DirectoryLink> = {};
  for (const row of rows) {
    const link = (links[row.directory_import_key] ??= {});
    if (!row.completed_at) { link.openDue = row.followup_date; continue; }
    if (row.closure_outcome === "declined") link.declined = true;
    if (!link.closedAt || Date.parse(row.completed_at) > Date.parse(link.closedAt)) link.closedAt = row.completed_at;
  }
  return links;
}

/** What a contact's follow-up history allows. The database enforces the same two blocks. */
export function linkStatus(link: DirectoryLink | undefined) {
  if (link?.declined) return { text: "Asked for no further contact", canPrepare: false };
  if (link?.openDue) return { text: `Follow-up open, next contact ${link.openDue}`, canPrepare: false };
  if (link?.closedAt) return { text: `Previous follow-up closed ${ministryToday(new Date(link.closedAt))}`, canPrepare: true };
  return { text: "", canPrepare: true };
}

const rejections: Record<string, string> = {
  HB001: "This contact already has an open follow-up. Find it on the board below.",
  HB002: "This contact needs review before follow-up.",
  HB003: "This directory contact has changed. Refresh contacts and choose again.",
  HB004: "This person asked for no further contact.",
};
/** Message for a follow-up the database refused because of its directory link, else null. */
export function linkRejection(code: string | null | undefined) {
  return (code && rejections[code]) || null;
}
