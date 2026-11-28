import { assertEquals } from "jsr:@std/assert@1";
import { corsHeaders, invitationLink, isExistingAccount, parseRequest } from "./logic.ts";

const id = "00000000-0000-4000-8000-000000000001";
Deno.test("only well-formed create and resend requests pass", () => {
  assertEquals(parseRequest({ action: "create", id, email: "a@example.test", name: "A", role: "media" })?.action, "create");
  assertEquals(parseRequest({ action: "resend", id }), { action: "resend", id });
  for (const bad of [null, "x", {}, { action: "create", id }, { action: "resend", id: "not-a-uuid" }, { action: "delete", id },
    { action: "create", id, email: "a@example.test", name: "A", role: "media", details: [] }]) {
    assertEquals(parseRequest(bad), null);
  }
});
Deno.test("link always points at the configured site and carries the token", () => {
  const link = new URL(invitationLink("https://heartbeatofgod.ca", "abc 123"));
  assertEquals(link.origin, "https://heartbeatofgod.ca");
  assertEquals(link.pathname, "/admin");
  assertEquals(link.searchParams.get("view"), "invitation");
  assertEquals(link.searchParams.get("token"), "abc 123");
});
Deno.test("existing accounts are recognised from Supabase Auth errors", () => {
  assertEquals(isExistingAccount({ code: "email_exists" }), true);
  assertEquals(isExistingAccount({ status: 422, message: "A user with this email address has already been registered" }), true);
  assertEquals(isExistingAccount({ status: 500, message: "SMTP error" }), false);
  assertEquals(isExistingAccount(null), false);
});
Deno.test("CORS answers only the ministry site", () => {
  const allowed = ["https://heartbeatofgod.ca", "https://www.heartbeatofgod.ca"];
  assertEquals(corsHeaders("https://www.heartbeatofgod.ca", allowed)["Access-Control-Allow-Origin"], "https://www.heartbeatofgod.ca");
  assertEquals(corsHeaders("https://evil.example", allowed)["Access-Control-Allow-Origin"], "https://heartbeatofgod.ca");
});
