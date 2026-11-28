// Pure decisions for the staff-invite function, kept separate so they can be tested.
export type InviteRequest =
  | { action: "create"; id: string; email: string; name: string; role: string; details?: Record<string, unknown> }
  | { action: "resend"; id: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts only the two known actions with well-formed fields; anything else is refused. */
export function parseRequest(body: unknown): InviteRequest | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (typeof value.id !== "string" || !uuid.test(value.id)) return null;
  if (value.action === "resend") return { action: "resend", id: value.id };
  if (value.action !== "create") return null;
  if (typeof value.email !== "string" || typeof value.name !== "string" || typeof value.role !== "string") return null;
  if (value.details !== undefined && (typeof value.details !== "object" || value.details === null || Array.isArray(value.details))) return null;
  return { action: "create", id: value.id, email: value.email, name: value.name, role: value.role, details: value.details as Record<string, unknown> | undefined };
}

/** Where the email link lands. Only the configured site is ever used. */
export function invitationLink(site: string, token: string) {
  const url = new URL("/admin", site);
  url.searchParams.set("view", "invitation");
  url.searchParams.set("token", token);
  return url.toString();
}

/** Supabase Auth refuses an invite for an address that already has an account. */
export function isExistingAccount(error: { status?: number; code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "email_exists" || error.status === 422 || /already been registered|already registered|exists/i.test(error.message ?? "");
}

export function corsHeaders(origin: string | null, allowed: string[]) {
  const allow = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
