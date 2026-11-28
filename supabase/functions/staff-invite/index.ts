// Sends staff invitations for HBG Pulse OS. The database decides who may invite and
// what the invitation grants; this function only sends the email. The one-time link
// is never returned to the browser, so the inviter cannot accept on someone's behalf.
import { createClient } from "npm:@supabase/supabase-js@2.99.3";
import { corsHeaders, invitationLink, isExistingAccount, parseRequest } from "./logic.ts";

const site = Deno.env.get("INVITE_SITE_URL") ?? "https://heartbeatofgod.ca";
const allowedOrigins = [site, "https://www.heartbeatofgod.ca"];

Deno.serve(async request => {
  const headers = { ...corsHeaders(request.headers.get("origin"), allowedOrigins), "Content-Type": "application/json" };
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
  const authorization = request.headers.get("Authorization");
  if (!authorization) return reply(401, { error: "sign_in_required" });
  const input = parseRequest(await request.json().catch(() => null));
  if (!input) return reply(400, { error: "bad_request" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  // Acts as the signed-in person, so every database rule applies to them.
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const sender = createClient(url, anonKey, { auth: { persistSession: false } });

  const issued = input.action === "create"
    ? await asUser.rpc("staff_invite_create", { p_id: input.id, p_email: input.email, p_name: input.name, p_role: input.role, p_details: input.details ?? {} })
    : await asUser.rpc("staff_invite_reissue", { p_id: input.id });
  if (issued.error) return reply(issued.status === 401 ? 401 : 400, { error: "refused", code: issued.error.code, message: issued.error.message });
  const token = issued.data as string;

  let email = input.action === "create" ? input.email.trim().toLowerCase() : "";
  if (input.action === "resend") {
    const row = await asUser.from("staff_invitations").select("email,display_name").eq("id", input.id).single();
    if (row.error) return reply(400, { error: "refused", code: row.error.code, message: "Invitation not found" });
    email = row.data.email;
  }
  const link = invitationLink(site, token);
  // New people get an account invitation; existing accounts get a sign-in link.
  const sent = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: link });
  let sendError = sent.error;
  if (sendError && isExistingAccount(sendError)) {
    const otp = await sender.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: link } });
    sendError = otp.error;
  }
  await asUser.rpc("staff_invite_mark_sent", { p_id: input.id, p_ok: !sendError, p_error: sendError?.message ?? null });
  if (sendError) return reply(502, { error: "send_failed", message: "The invitation was saved but the email could not be sent. Use Resend." });
  return reply(200, { status: "sent" });
});
