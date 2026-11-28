export type PersonOrigin = "staff" | "program_directory";

export type ActiveLink = { id: string; person_id: string; source_key: string };
export type LinkedPerson = { linkId: string; personId: string; name: string; otherContacts: number };

/** Directory contact key → the person it is linked to, with how many other contacts share that person. */
export function summariseLinks(links: ActiveLink[], names: Record<string, string>) {
  const perPerson: Record<string, number> = {};
  for (const link of links) perPerson[link.person_id] = (perPerson[link.person_id] ?? 0) + 1;
  const result: Record<string, LinkedPerson> = {};
  for (const link of links) {
    result[link.source_key] = {
      linkId: link.id, personId: link.person_id,
      name: names[link.person_id] ?? "Person record unavailable",
      otherContacts: perPerson[link.person_id] - 1,
    };
  }
  return result;
}

export const evidenceOptions = [
  ["same_email", "Same email"],
  ["same_phone", "Same phone"],
  ["same_name", "Same name"],
  ["confirmed_in_person", "Confirmed in person"],
  ["confirmed_by_message", "Confirmed by message or call"],
  ["known_to_pastor", "Known to me personally"],
] as const;

const reasonLabels: Record<string, string> = { same_email: "same email", same_phone: "same phone", same_name: "same name" };
export function describeReasons(reasons: string[]) {
  return reasons.map(reason => reasonLabels[reason] ?? reason).join(", ");
}

const linkErrors: Record<string, string> = {
  HB011: "This contact was linked meanwhile. The list has been refreshed.",
  HB012: "That person record is no longer available. The list has been refreshed.",
  HB013: "This contact is no longer in the directory. The list has been refreshed.",
  HB014: "Confirm you checked their identity and choose at least one piece of evidence.",
  HB015: "That link no longer exists. The list has been refreshed.",
  HB016: "That link was already removed. The list has been refreshed.",
  HB017: "Those earlier details are no longer available. The list has been refreshed.",
  "42501": "Only the owner account can link or unlink contacts.",
};
/** Message for a failed link or unlink, and whether the request can be retried unchanged. */
export function linkProblem(code: string | null | undefined, status: number) {
  if (status === 0) return { message: "Not saved. Check your connection and try again.", retry: true, refresh: false };
  const message = (code && (linkErrors[code] ?? permissionErrors[code])) || "Not saved. Try again in a moment.";
  return { message, retry: status >= 500 || status === 408 || status === 429, refresh: !!code && /^HB01[1-7]$/.test(code) && code !== "HB014" };
}

/** People from the program directory show as unconfirmed until a reviewed member profile says otherwise. */
export function isUnconfirmedDirectoryPerson(origin: PersonOrigin | undefined, reviewedMember: boolean) {
  return origin === "program_directory" && !reviewedMember;
}

/** School enrolment list: leave out unconfirmed directory people unless they asked for school. */
export function offerForSchool(person: { origin?: PersonOrigin; requests_school?: boolean }, reviewedMember: boolean) {
  return !isUnconfirmedDirectoryPerson(person.origin, reviewedMember) || !!person.requests_school;
}

export const recordKindLabels: Record<string, string> = {
  directory_contact: "Program contact",
  member_profile: "Member profile",
  mta_registration: "Mighty Turn Around registration",
  followup: "Follow-up",
};

export const permissionPurposes = [
  ["event_invitation", "Event invitations"],
  ["ministry_news", "Ministry news"],
  ["greetings", "Greetings and encouragement"],
] as const;
export type PermissionRow = { address: string; purpose: string; decision: "granted" | "withdrawn" | null; method: string | null; recorded_at: string | null; suppressed: boolean; allowed: boolean };
export type PermissionState = "allowed" | "withdrawn" | "unknown" | "suppressed";

/** Address → purpose → state. Unknown means nobody has asked; it is never treated as permission. */
export function summarisePermissions(rows: PermissionRow[]) {
  const result: Record<string, Record<string, PermissionState>> = {};
  for (const row of rows) {
    const state: PermissionState = row.suppressed ? "suppressed" : row.allowed ? "allowed" : row.decision === "withdrawn" ? "withdrawn" : "unknown";
    (result[row.address] ??= {})[row.purpose] = state;
  }
  return result;
}

export const permissionStateLabels: Record<PermissionState, string> = {
  allowed: "agreed", withdrawn: "asked to stop", unknown: "not asked", suppressed: "blocked (opted out of all ministry email)",
};

const permissionErrors: Record<string, string> = {
  HB021: "Check the email address and choose at least one type of message.",
  HB022: "Record the question you asked, how they agreed, and confirm you checked who they are.",
};
export function permissionProblem(code: string | null | undefined) {
  return (code && permissionErrors[code]) || null;
}
