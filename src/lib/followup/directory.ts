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
