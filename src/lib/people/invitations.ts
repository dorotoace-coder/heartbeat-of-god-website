/** Staff roles that can be offered by invitation. Treasury and the owner role are never offered. */
export const invitationRoles = [
  ["outreach_worker", "Outreach worker", "Evangelism workspace and follow-ups assigned to them."],
  ["foundation_teacher", "Foundation School teacher", "Their own Foundation School classes and students."],
  ["media", "Media team", "The Media Vault: upload and prepare media for review."],
  ["attendance", "Attendance team", "Record service attendance and new people. No scheduling or corrections."],
  ["pastorate", "Pastorate pastor", "Their written pastoral assignment and the Sunday rehearsal guide, until the review date."],
] as const;
export type InvitationRole = typeof invitationRoles[number][0];

export function roleLabel(role: string) {
  return invitationRoles.find(([value]) => value === role)?.[1] ?? role;
}
export function roleAccess(role: string) {
  return invitationRoles.find(([value]) => value === role)?.[2] ?? "";
}

export type InvitationRow = {
  id: string; email: string; display_name: string; role: string; created_at: string; expires_at: string;
  sent_at: string | null; send_error: string | null; accepted_at: string | null; revoked_at: string | null;
};
export type InvitationStatus = "accepted" | "revoked" | "expired" | "not_sent" | "sent";

export function invitationStatus(row: InvitationRow, now = new Date()): InvitationStatus {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (Date.parse(row.expires_at) < now.getTime()) return "expired";
  return row.sent_at ? "sent" : "not_sent";
}
export const invitationStatusLabels: Record<InvitationStatus, string> = {
  accepted: "Accepted", revoked: "Withdrawn", expired: "Expired", not_sent: "Not sent yet", sent: "Sent, waiting for them",
};

const inviteErrors: Record<string, string> = {
  HB031: "This person already has that kind of access.",
  HB032: "This invitation was already created. Find it below and use Resend.",
  HB033: "This invitation link is not valid. Ask for a new invitation.",
  HB034: "Sign in with the email address the invitation was sent to.",
  HB035: "You have reached today's limit of 20 invitations.",
  HB036: "Check the name, email, role and the role's details.",
  HB037: "An invitation for this person and role is already waiting. Use Resend on it.",
  HB038: "Only a waiting invitation can be resent or withdrawn.",
  HB039: "This invitation has expired, been withdrawn or already been used. Ask for a new one.",
  "42501": "Only the owner account can send staff invitations.",
};
export function inviteProblem(code: string | null | undefined, fallback = "Not done. Try again in a moment.") {
  return (code && inviteErrors[code]) || fallback;
}

/** Details the database needs for each role, from the form's values. */
export function roleDetails(role: string, values: { trainedOn?: string; responsibility?: string; assignment?: string; reviewOn?: string }) {
  if (role === "foundation_teacher") return { trained_on: values.trainedOn ?? "" };
  if (role === "pastorate") return { responsibility: (values.responsibility ?? "").trim(), assignment: (values.assignment ?? "").trim(), review_on: values.reviewOn ?? "" };
  return {};
}
