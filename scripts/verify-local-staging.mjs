#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "hbog-local-staging";
const databaseContainer = `supabase_db_${projectId}`;

function redact(value) {
  return String(value ?? "")
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_.-]+/g, "[REDACTED]");
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
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
const donationReference = `HBOG-LOCAL-${runId}`;
const createdUserIds = [];

console.log("Starting isolated HBOG local staging verification...");

try {
  run("docker", ["info", "--format", "{{.ServerVersion}}"]);
  run("supabase", ["start", "--workdir", repoRoot, "--yes"]);
  run("supabase", ["db", "reset", "--local", "--no-seed", "--workdir", repoRoot, "--yes"]);
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
  assert(catalog.includes("policies=9"), `Expected 9 policies. Received:\n${catalog}`);

  const migration = sql(
    "select version from supabase_migrations.schema_migrations order by version;",
  );
  assert(
    migration.split("\n").includes("20260814232004"),
    `Expected migration 20260814232004. Received: ${migration}`,
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

  sql(`
    insert into public.profiles (id, full_name, role)
    values ('${manager.id}', 'Local Manager', 'manager');
    insert into public.profiles (id, full_name, role)
    values ('${leader.id}', 'Local Leader', 'leader');
  `);

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

  console.log("PASS: migration replay, lint, Data API, Auth, grants, and RLS checks succeeded.");
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
        delete from public.donations where reference = '${donationReference}';
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
