#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "hbog-local-staging";
const databaseContainer = `supabase_db_${projectId}`;
const integrityMigration = path.join(
  repoRoot,
  "supabase/migrations/20260829204238_hbog_policy_manifest_integrity_r2.sql",
);
const schemaSnapshot = path.join(repoRoot, "src/lib/schema.sql");

function redact(value) {
  return String(value ?? "")
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_.-]+/g, "[REDACTED]");
}

function run(command, args, { allowFailure = false, input } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
    input,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const details = redact([result.stdout, result.stderr].filter(Boolean).join("\n"));
    throw new Error(`${command} ${args.join(" ")} failed\n${details}`);
  }

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseStatusEnv(output) {
  const values = {};

  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    try {
      values[key] = JSON.parse(rawValue);
    } catch {
      values[key] = rawValue;
    }
  }

  return values;
}

function sql(statement) {
  return run("docker", [
    "exec",
    databaseContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    statement,
  ]).stdout.trim();
}

function sqlFile(filePath) {
  return run(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: readFileSync(filePath, "utf8") },
  ).stdout.trim();
}

const expectedPolicies = [
  "departments|departments_public_select|SELECT|anon,authenticated",
  "donations|donations_public_insert|INSERT|anon,authenticated",
  "events|events_manager_delete|DELETE|authenticated",
  "events|events_manager_insert|INSERT|authenticated",
  "events|events_manager_update|UPDATE|authenticated",
  "events|events_public_select|SELECT|anon,authenticated",
  "inquiries|inquiries_manager_select|SELECT|authenticated",
  "inquiries|inquiries_manager_update_status|UPDATE|authenticated",
  "inquiries|inquiries_public_insert|INSERT|anon,authenticated",
  "profiles|profiles_authenticated_select_own|SELECT|authenticated",
  "pulse|pulse_public_select|SELECT|anon,authenticated",
  "sermons|sermons_manager_insert|INSERT|authenticated",
  "sermons|sermons_manager_update|UPDATE|authenticated",
  "sermons|sermons_pastor_delete|DELETE|authenticated",
  "sermons|sermons_public_select|SELECT|anon,authenticated",
].join("\n");

function assertExactPolicyManifest() {
  const policies = sql(`
    select tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ',')
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'sermons','events','pulse','donations','departments','profiles','inquiries'
       )
     order by tablename, policyname;
  `);
  assert(
    policies === expectedPolicies,
    `Protected-table policy manifest mismatch. Received:\n${policies}`,
  );
}

async function request(url, { apiKey, token = apiKey, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  return { status: response.status, body: json };
}

const runId = Date.now();
const publicEmail = `hbog-public-${runId}@example.invalid`;
const authEmail = `hbog-authz-${runId}@example.invalid`;
const managerEmail = `hbog-manager-${runId}@example.invalid`;
const leaderEmail = `hbog-leader-${runId}@example.invalid`;
const pastorEmail = `hbog-pastor-${runId}@example.invalid`;
const donationReference = `HBOG-LOCAL-${runId}`;
const completedDonationReference = `HBOG-LOCAL-COMPLETED-${runId}`;
const eventId = randomUUID();
const leaderEventId = randomUUID();
const sermonId = randomUUID();
const createdUserIds = [];

console.log("Starting isolated HBOG local staging verification...");

try {
  run("docker", ["info", "--format", "{{.ServerVersion}}"]);
  run("supabase", ["start", "--workdir", repoRoot, "--yes"]);
  run("supabase", ["db", "reset", "--local", "--workdir", repoRoot, "--yes"]);
  run("supabase", [
    "db",
    "lint",
    "--local",
    "--schema",
    "public",
    "--fail-on",
    "error",
    "--workdir",
    repoRoot,
  ]);

  sql(`
    create policy synthetic_drift_allow_all
      on public.events for all to anon, authenticated
      using (true) with check (true);
    grant update (title) on table public.sermons to anon;
    grant create on schema public to anon;
  `);
  assert(
    sql("select count(*) from pg_policies where schemaname = 'public' and policyname = 'synthetic_drift_allow_all';") === "1",
    "Synthetic policy drift was not created for the convergence test.",
  );
  assert(
    sql("select has_column_privilege('anon', 'public.sermons', 'title', 'update');") === "t",
    "Synthetic column privilege drift was not created for the convergence test.",
  );
  assert(
    sql("select has_schema_privilege('anon', 'public', 'create');") === "t",
    "Synthetic schema privilege drift was not created for the convergence test.",
  );
  sqlFile(integrityMigration);
  assert(
    sql("select count(*) from pg_policies where schemaname = 'public' and policyname = 'synthetic_drift_allow_all';") === "0",
    "The integrity migration did not remove synthetic policy drift.",
  );
  assert(
    sql("select has_column_privilege('anon', 'public.sermons', 'title', 'update');") === "f",
    "The integrity migration did not remove synthetic column privilege drift.",
  );
  assert(
    sql("select has_schema_privilege('anon', 'public', 'create');") === "f",
    "The integrity migration did not remove synthetic schema privilege drift.",
  );
  assertExactPolicyManifest();
  sqlFile(schemaSnapshot);
  assertExactPolicyManifest();

  const status = parseStatusEnv(
    run("supabase", ["status", "--workdir", repoRoot, "-o", "env"]).stdout,
  );
  assert(status.API_URL, "Local Supabase API URL is missing.");
  assert(status.ANON_KEY, "Local Supabase anonymous key is missing.");

  const catalog = sql(`
    select 'tables=' || count(*)
      from pg_tables
     where schemaname = 'public'
       and tablename in ('sermons','events','pulse','donations','departments','profiles','inquiries');
    select 'rls=' || count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('sermons','events','pulse','donations','departments','profiles','inquiries')
       and c.relrowsecurity;
    select 'policies=' || count(*)
      from pg_policies
     where schemaname = 'public'
       and tablename in ('sermons','events','pulse','donations','departments','profiles','inquiries');
  `);
  assert(catalog.includes("tables=7"), `Expected 7 public tables. Received:\n${catalog}`);
  assert(catalog.includes("rls=7"), `Expected RLS on 7 tables. Received:\n${catalog}`);
  assert(catalog.includes("policies=15"), `Expected 15 policies. Received:\n${catalog}`);

  const privilegeManifest = sql(`
    select 'anon_sermons_select=' || has_table_privilege('anon', 'public.sermons', 'select');
    select 'anon_sermons_insert=' || has_table_privilege('anon', 'public.sermons', 'insert');
    select 'anon_sermons_title_update=' || has_column_privilege('anon', 'public.sermons', 'title', 'update');
    select 'auth_sermons_insert=' || has_table_privilege('authenticated', 'public.sermons', 'insert');
    select 'anon_events_select=' || has_table_privilege('anon', 'public.events', 'select');
    select 'anon_events_insert=' || has_table_privilege('anon', 'public.events', 'insert');
    select 'auth_events_insert=' || has_table_privilege('authenticated', 'public.events', 'insert');
    select 'anon_pulse_select=' || has_table_privilege('anon', 'public.pulse', 'select');
    select 'auth_pulse_update=' || has_table_privilege('authenticated', 'public.pulse', 'update');
    select 'anon_donations_select=' || has_table_privilege('anon', 'public.donations', 'select');
    select 'anon_donations_status_insert=' || has_column_privilege('anon', 'public.donations', 'status', 'insert');
    select 'anon_departments_select=' || has_table_privilege('anon', 'public.departments', 'select');
    select 'anon_profiles_select=' || has_table_privilege('anon', 'public.profiles', 'select');
    select 'auth_profiles_role_select=' || has_column_privilege('authenticated', 'public.profiles', 'role', 'select');
    select 'anon_inquiries_select=' || has_table_privilege('anon', 'public.inquiries', 'select');
    select 'anon_inquiries_email_insert=' || has_column_privilege('anon', 'public.inquiries', 'email', 'insert');
    select 'auth_inquiries_status_update=' || has_column_privilege('authenticated', 'public.inquiries', 'status', 'update');
    select 'anon_schema_create=' || has_schema_privilege('anon', 'public', 'create');
  `);
  const expectedPrivileges = [
    "anon_sermons_select=true",
    "anon_sermons_insert=false",
    "anon_sermons_title_update=false",
    "auth_sermons_insert=true",
    "anon_events_select=true",
    "anon_events_insert=false",
    "auth_events_insert=true",
    "anon_pulse_select=true",
    "auth_pulse_update=false",
    "anon_donations_select=false",
    "anon_donations_status_insert=true",
    "anon_departments_select=true",
    "anon_profiles_select=false",
    "auth_profiles_role_select=true",
    "anon_inquiries_select=false",
    "anon_inquiries_email_insert=true",
    "auth_inquiries_status_update=true",
    "anon_schema_create=false",
  ].join("\n");
  assert(
    privilegeManifest === expectedPrivileges,
    `Protected-table privilege manifest mismatch. Received:\n${privilegeManifest}`,
  );

  const seedCatalog = sql(`
    select 'seed_departments=' || count(*) from public.departments;
    select 'seed_sermons=' || count(*) from public.sermons;
    select 'seed_events=' || count(*) from public.events;
    select 'seed_pulse=' || count(*) from public.pulse where id = 1;
  `);
  assert(seedCatalog.includes("seed_departments=2"), `Expected two seeded departments. Received:\n${seedCatalog}`);
  assert(seedCatalog.includes("seed_sermons=1"), `Expected one seeded sermon. Received:\n${seedCatalog}`);
  assert(seedCatalog.includes("seed_events=1"), `Expected one seeded event. Received:\n${seedCatalog}`);
  assert(seedCatalog.includes("seed_pulse=1"), `Expected the seeded pulse singleton. Received:\n${seedCatalog}`);

  const migration = sql(
    "select version from supabase_migrations.schema_migrations order by version;",
  );
  assert(
    migration.split("\n").includes("20260814232004"),
    `Expected migration 20260814232004. Received: ${migration}`,
  );
  assert(
    migration.split("\n").includes("20260829165103"),
    `Expected migration 20260829165103. Received: ${migration}`,
  );
  assert(
    migration.split("\n").includes("20260829204238"),
    `Expected migration 20260829204238. Received: ${migration}`,
  );

  const restUrl = `${status.API_URL}/rest/v1`;
  const authUrl = `${status.API_URL}/auth/v1`;

  const sermons = await request(`${restUrl}/sermons?select=id&limit=1`, {
    apiKey: status.ANON_KEY,
  });
  assert(sermons.status === 200, `Public sermon read returned ${sermons.status}.`);

  const inquiryInsert = await request(`${restUrl}/inquiries`, {
    apiKey: status.ANON_KEY,
    method: "POST",
    body: {
      full_name: "Local Staging Test",
      email: publicEmail,
      type: "general",
      message: "Synthetic local-only verification",
    },
  });
  assert(inquiryInsert.status === 201, `Public inquiry insert returned ${inquiryInsert.status}.`);

  const donationInsert = await request(`${restUrl}/donations`, {
    apiKey: status.ANON_KEY,
    method: "POST",
    body: {
      currency: "CAD",
      amount: 1,
      frequency: "one-time",
      payment_method: "local-test",
      status: "pending",
      reference: donationReference,
      donor_email: publicEmail,
      donor_name: "Local Staging Test",
    },
  });
  assert(donationInsert.status === 201, `Public donation insert returned ${donationInsert.status}.`);

  const completedDonationInsert = await request(`${restUrl}/donations`, {
    apiKey: status.ANON_KEY,
    method: "POST",
    body: {
      currency: "CAD",
      amount: 1,
      frequency: "one-time",
      payment_method: "local-test",
      status: "completed",
      reference: completedDonationReference,
      donor_email: publicEmail,
      donor_name: "Local Staging Test",
    },
  });
  assert(
    completedDonationInsert.status !== 201,
    "An anonymous browser client forged a completed donation.",
  );

  const publicInquiryRead = await request(`${restUrl}/inquiries?select=id`, {
    apiKey: status.ANON_KEY,
  });
  assert(publicInquiryRead.status === 401, `Public inquiry read returned ${publicInquiryRead.status}.`);

  async function signUp(email, password) {
    const response = await request(`${authUrl}/signup`, {
      apiKey: status.ANON_KEY,
      method: "POST",
      body: { email, password },
    });
    assert(response.status === 200, `Synthetic signup for ${email} returned ${response.status}.`);
    assert(response.body?.user?.id, `Synthetic signup for ${email} returned no user ID.`);
    assert(response.body?.access_token, `Synthetic signup for ${email} returned no session.`);
    createdUserIds.push(response.body.user.id);
    return { id: response.body.user.id, token: response.body.access_token };
  }

  const manager = await signUp(managerEmail, "LocalOnly!Manager2026");
  const leader = await signUp(leaderEmail, "LocalOnly!Leader2026");
  const pastor = await signUp(pastorEmail, "LocalOnly!Pastor2026");

  sql(`
    insert into public.profiles (id, full_name, role)
    values ('${manager.id}', 'Local Manager', 'manager');
    insert into public.profiles (id, full_name, role)
    values ('${leader.id}', 'Local Leader', 'leader');
    insert into public.profiles (id, full_name, role)
    values ('${pastor.id}', 'Local Pastor', 'pastor');
  `);

  const managerEventInsert = await request(`${restUrl}/events`, {
    apiKey: status.ANON_KEY,
    token: manager.token,
    method: "POST",
    body: {
      id: eventId,
      name: "Manager Authorized Event",
      description: "Synthetic authorization check",
      event_date: new Date(Date.now() + 86_400_000).toISOString(),
      location: "Local only",
    },
  });
  assert(managerEventInsert.status === 201, `Manager event insert returned ${managerEventInsert.status}.`);

  const leaderEventInsert = await request(`${restUrl}/events`, {
    apiKey: status.ANON_KEY,
    token: leader.token,
    method: "POST",
    body: {
      id: leaderEventId,
      name: "Leader Unauthorized Event",
      event_date: new Date(Date.now() + 172_800_000).toISOString(),
      location: "Local only",
    },
  });
  assert(leaderEventInsert.status !== 201, "A leader created an event without authorization.");
  assert(sql(`select count(*) from public.events where id = '${leaderEventId}';`) === "0", "Unauthorized leader event persisted.");

  const managerEventUpdate = await request(`${restUrl}/events?id=eq.${eventId}`, {
    apiKey: status.ANON_KEY,
    token: manager.token,
    method: "PATCH",
    body: { location: "Manager updated locally" },
  });
  assert(managerEventUpdate.status === 204, `Manager event update returned ${managerEventUpdate.status}.`);
  assert(sql(`select location from public.events where id = '${eventId}';`) === "Manager updated locally", "Manager event update did not persist.");

  const managerSermonInsert = await request(`${restUrl}/sermons`, {
    apiKey: status.ANON_KEY,
    token: manager.token,
    method: "POST",
    body: {
      id: sermonId,
      title: "Manager Authorized Sermon",
      preacher: "Local Test",
      category: "General",
      date_preached: new Date().toISOString().slice(0, 10),
    },
  });
  assert(managerSermonInsert.status === 201, `Manager sermon insert returned ${managerSermonInsert.status}.`);

  const managerSermonDelete = await request(`${restUrl}/sermons?id=eq.${sermonId}`, {
    apiKey: status.ANON_KEY,
    token: manager.token,
    method: "DELETE",
  });
  assert(managerSermonDelete.status === 204, `Manager sermon delete returned ${managerSermonDelete.status}.`);
  assert(sql(`select count(*) from public.sermons where id = '${sermonId}';`) === "1", "A manager deleted pastor-protected media.");

  const pastorSermonDelete = await request(`${restUrl}/sermons?id=eq.${sermonId}`, {
    apiKey: status.ANON_KEY,
    token: pastor.token,
    method: "DELETE",
  });
  assert(pastorSermonDelete.status === 204, `Pastor sermon delete returned ${pastorSermonDelete.status}.`);
  assert(sql(`select count(*) from public.sermons where id = '${sermonId}';`) === "0", "Pastor sermon delete did not persist.");

  const managerEventDelete = await request(`${restUrl}/events?id=eq.${eventId}`, {
    apiKey: status.ANON_KEY,
    token: manager.token,
    method: "DELETE",
  });
  assert(managerEventDelete.status === 204, `Manager event delete returned ${managerEventDelete.status}.`);
  assert(sql(`select count(*) from public.events where id = '${eventId}';`) === "0", "Manager event delete did not persist.");

  const authInquiryInsert = await request(`${restUrl}/inquiries`, {
    apiKey: status.ANON_KEY,
    method: "POST",
    body: {
      full_name: "Authorization Test",
      email: authEmail,
      type: "general",
      message: "Synthetic local authorization verification",
    },
  });
  assert(authInquiryInsert.status === 201, `Authorization inquiry insert returned ${authInquiryInsert.status}.`);

  const inquiryPath = `${restUrl}/inquiries?select=id,status,email&email=eq.${encodeURIComponent(authEmail)}`;
  const managerRead = await request(inquiryPath, {
    apiKey: status.ANON_KEY,
    token: manager.token,
  });
  assert(managerRead.status === 200, `Manager inquiry read returned ${managerRead.status}.`);
  assert(Array.isArray(managerRead.body) && managerRead.body.length === 1, "Manager did not receive the inquiry.");

  const leaderRead = await request(inquiryPath, {
    apiKey: status.ANON_KEY,
    token: leader.token,
  });
  assert(leaderRead.status === 200, `Leader inquiry read returned ${leaderRead.status}.`);
  assert(Array.isArray(leaderRead.body) && leaderRead.body.length === 0, "Leader could read a protected inquiry.");

  const managerUpdate = await request(
    `${restUrl}/inquiries?email=eq.${encodeURIComponent(authEmail)}`,
    {
      apiKey: status.ANON_KEY,
      token: manager.token,
      method: "PATCH",
      body: { status: "reviewed" },
    },
  );
  assert(managerUpdate.status === 204, `Manager status update returned ${managerUpdate.status}.`);

  const leaderUpdate = await request(
    `${restUrl}/inquiries?email=eq.${encodeURIComponent(authEmail)}`,
    {
      apiKey: status.ANON_KEY,
      token: leader.token,
      method: "PATCH",
      body: { status: "contacted" },
    },
  );
  assert(leaderUpdate.status === 204, `Leader status attempt returned ${leaderUpdate.status}.`);

  const managerReadAfter = await request(inquiryPath, {
    apiKey: status.ANON_KEY,
    token: manager.token,
  });
  assert(
    managerReadAfter.body?.[0]?.status === "reviewed",
    "Leader changed the inquiry or the manager update did not persist.",
  );

  const protectedFieldUpdate = await request(
    `${restUrl}/inquiries?email=eq.${encodeURIComponent(authEmail)}`,
    {
      apiKey: status.ANON_KEY,
      token: manager.token,
      method: "PATCH",
      body: { full_name: "Unauthorized Rewrite" },
    },
  );
  assert(
    protectedFieldUpdate.status === 403,
    `Manager protected-field update returned ${protectedFieldUpdate.status}.`,
  );

  console.log("PASS: migrations, seed, lint, Data API, Auth, grants, staff roles, and RLS checks succeeded.");
} finally {
  const userIds = createdUserIds.map((id) => `'${id}'`).join(",");
  const userCleanup = userIds
    ? `delete from public.profiles where id in (${userIds}); delete from auth.users where id in (${userIds});`
    : "";

  const cleanup = run(
    "docker",
    [
      "exec",
      databaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atc",
      `
        delete from public.inquiries where email in ('${publicEmail}', '${authEmail}');
        delete from public.donations where reference in ('${donationReference}', '${completedDonationReference}');
        delete from public.events where id in ('${eventId}', '${leaderEventId}');
        delete from public.sermons where id = '${sermonId}';
        ${userCleanup}
      `,
    ],
    { allowFailure: true },
  );

  if (cleanup.status !== 0) {
    console.error("WARNING: synthetic cleanup did not complete:");
    console.error(redact(cleanup.stderr || cleanup.stdout));
  }
}
