// Requires disposable localhost Auth fixtures; never run against a hosted project.
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const authFile = process.env.HM_TEST_AUTH_ENV,
  usersFile = process.env.HM_TEST_USERS;
if (!authFile || !usersFile) throw Error("Supply local fixture file paths");
const env = Object.fromEntries(
  fs
    .readFileSync(authFile, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
if (env.API_URL !== "http://127.0.0.1:55421") throw Error("Local-only guard");
const users = JSON.parse(fs.readFileSync(usersFile, "utf8")),
  tokens = {};
let count = 0;
function pass(name) {
  count++;
  console.log(`PASS ${name}`);
}
async function call(who, name, args = {}, expected = 200) {
  const r = await fetch(`${env.API_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: env.ANON_KEY,
      Authorization: `Bearer ${tokens[who] ?? env.ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  assert.equal(r.status, expected, `${name} HTTP status`);
  return r.status === 204 ? null : await r.json();
}
(async () => {
  for (const [name, u] of Object.entries(users)) {
    const r = await fetch(`${env.API_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { apikey: env.ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: u.email, password: u.password }),
    });
    assert.equal(r.status, 200);
    tokens[name] = (await r.json()).access_token;
  }
  pass("six real local Auth sessions");
  assert.equal(await call("counsellor", "hm_can_create"), true);
  assert.equal(await call("partnera", "hm_can_create"), false);
  pass("creation capability is explicit");
  const id = await call("counsellor", "hm_create_case", {
    case_name: "Synthetic API regression",
    case_lane: "premarital",
  });
  const codeA = await call("counsellor", "hm_issue_invite", { target: id });
  await call("partnera", "hm_claim_invite", { code: codeA }, 204);
  assert.ok(
    !(await call("partnera", "hm_list_cases")).some((c) => c.id === id),
  );
  pass("claim grants no access");
  let pending = await call("counsellor", "hm_pending_invites", { target: id });
  await call(
    "counsellor",
    "hm_review_invite",
    { invite_id: pending[0].id, approve: true, identity_checked: false },
    400,
  );
  pass("identity confirmation required");
  await call(
    "counsellor",
    "hm_review_invite",
    { invite_id: pending[0].id, approve: true, identity_checked: true },
    204,
  );
  const codeB = await call("counsellor", "hm_issue_invite", { target: id });
  await call("partnerb", "hm_claim_invite", { code: codeB }, 204);
  pending = await call("counsellor", "hm_pending_invites", { target: id });
  await call(
    "counsellor",
    "hm_review_invite",
    { invite_id: pending[0].id, approve: true, identity_checked: true },
    204,
  );
  await call("partnera", "hm_claim_invite", { code: codeA }, 403);
  pass("invitation replay denied");
  await call("counsellor", "hm_issue_invite", { target: id }, 400);
  pass("two-participant capacity");
  await call(
    "partnera",
    "hm_save_answer",
    { target: id, key: "meaning_2", body: "Synthetic sealed", share: "sealed" },
    403,
  );
  pass("care consent required");
  await call(
    "partnera",
    "hm_record_consent",
    { target: id, reason: "care", decision: true, notice: "hm-privacy-v1" },
    204,
  );
  await call("partnera", "hm_save_answer", {
    target: id,
    key: "meaning_2",
    body: "Synthetic sealed",
    share: "sealed",
  });
  assert.equal(
    (await call("partnerb", "hm_get_answers", { target: id })).length,
    0,
  );
  pass("sealed answer absent through real REST API");
  await call(
    "partnera",
    "hm_record_consent",
    {
      target: id,
      reason: "partner_sharing",
      decision: true,
      notice: "hm-privacy-v1",
    },
    204,
  );
  await call("partnera", "hm_save_answer", {
    target: id,
    key: "meaning_1",
    body: "Synthetic shared",
    share: "shared",
  });
  assert.equal(
    (await call("partnerb", "hm_get_answers", { target: id })).length,
    1,
  );
  pass("explicitly shared answer visible");
  await call(
    "partnera",
    "hm_record_consent",
    {
      target: id,
      reason: "partner_sharing",
      decision: false,
      notice: "hm-privacy-v1",
    },
    204,
  );
  assert.equal(
    (await call("partnerb", "hm_get_answers", { target: id })).length,
    0,
  );
  pass("withdrawal suppresses future partner reads");
  const care = await call("counsellor", "hm_get_record", {
    target: id,
    kind: "hm_care",
  });
  await call("counsellor", "hm_save_record", {
    target: id,
    kind: "hm_care",
    expected_version: care.version,
    body: { background: "Synthetic" },
  });
  await call(
    "counsellor",
    "hm_save_record",
    { target: id, kind: "hm_care", expected_version: care.version, body: {} },
    409,
  );
  pass("stale write rejected over REST");
  await call("outsider", "hm_get_record", { target: id, kind: "hm_care" }, 403);
  await call("partnera", "hm_get_record", { target: id, kind: "hm_care" }, 403);
  pass("unassigned and participant care access denied");
  const sql = `insert into marriages_private.assignments(case_id,user_id,scope) values('${id}','${users.records.id}','records'),('${id}','${users.coordinator.id}','coordinator');`;
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_hbg-marriage-auth",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, stdio: ["pipe", "pipe", "pipe"] },
  );
  await call("records", "hm_get_record", { target: id, kind: "hm_registry" });
  await call("records", "hm_get_record", { target: id, kind: "hm_care" }, 403);
  await call("coordinator", "hm_get_answers", { target: id }, 403);
  pass("staff scope separation over REST");
  await call(
    "records",
    "hm_save_record",
    {
      target: id,
      kind: "hm_registry",
      expected_version: 1,
      body: { status: "Verified" },
    },
    400,
  );
  pass("invalid registry claim rejected");
  const direct = await fetch(`${env.API_URL}/rest/v1/hm_answers?select=*`, {
    headers: {
      apikey: env.ANON_KEY,
      Authorization: `Bearer ${tokens.partnera}`,
    },
  });
  assert.equal(direct.status, 403);
  pass("direct table bypass denied");
  await call("partnera", "hm_request_right", {
    target: id,
    request_kind: "deletion",
  });
  assert.equal(
    (await call("partnerb", "hm_rights_requests", { target: id })).length,
    0,
  );
  pass("rights request isolated from partner");
  await call("counsellor", "hm_retention", {
    target: id,
    review_date: "2027-01-01",
    hold: true,
    rationale: "Synthetic review",
  });
  pass("retention hold persisted");
  const requestKey = crypto.randomUUID(),
    visitBody = {
      title: "Synthetic visit",
      visit_type: "introduction",
      status: "planned",
      date: "2026-12-10",
      timezone: "Africa/Lagos",
      permission: true,
      private_note: "PRIVATE visit note",
    };
  await call(
    "counsellor",
    "hm_journey_save",
    {
      target: id,
      entry_id: null,
      event_kind: "family_visit",
      expected_version: null,
      body: { ...visitBody, permission: false },
    },
    400,
  );
  pass("structured visit requires permission");
  const visit = await call("counsellor", "hm_journey_save", {
    target: id,
    entry_id: null,
    event_kind: "family_visit",
    expected_version: null,
    body: visitBody,
    request_key: requestKey,
  });
  const retry = await call("counsellor", "hm_journey_save", {
    target: id,
    entry_id: null,
    event_kind: "family_visit",
    expected_version: null,
    body: visitBody,
    request_key: requestKey,
  });
  assert.equal(visit.id, retry.id);
  pass("replayed visit save is idempotent");
  await call("counsellor", "hm_journey_save", {
    target: id,
    entry_id: visit.id,
    event_kind: "family_visit",
    expected_version: 1,
    body: { ...visitBody, status: "completed" },
  });
  assert.equal(
    (
      await call("counsellor", "hm_journey_history", {
        target: id,
        entry_id: visit.id,
      })
    ).length,
    2,
  );
  pass("structured amendments preserve versions");
  await call(
    "counsellor",
    "hm_journey_save",
    {
      target: id,
      entry_id: visit.id,
      event_kind: "family_visit",
      expected_version: 1,
      body: visitBody,
    },
    409,
  );
  pass("stale structured edit rejected");
  await call("counsellor", "hm_journey_save", {
    target: id,
    entry_id: null,
    event_kind: "session",
    expected_version: null,
    body: {
      title: "Private purpose",
      session_type: "joint",
      status: "planned",
      date: "2026-12-11",
      timezone: "Africa/Lagos",
      channel: "Online",
      private_note: "PRIVATE session note",
      public_summary: "Agreed next session",
      released: true,
    },
  });
  const participantView = await call("partnerb", "hm_journey_list", {
    target: id,
    event_kind: "session",
  });
  assert.equal(participantView.length, 1);
  assert.ok(!JSON.stringify(participantView).includes("PRIVATE"));
  assert.ok(!JSON.stringify(participantView).includes("Private purpose"));
  pass("participant sees only released session summary");
  const coordinatorView = await call("coordinator", "hm_journey_list", {
    target: id,
    event_kind: "session",
  });
  assert.ok(!JSON.stringify(coordinatorView).includes("PRIVATE"));
  assert.ok(!JSON.stringify(coordinatorView).includes("public_summary"));
  pass("coordinator receives logistics projection only");
  await call(
    "records",
    "hm_journey_list",
    { target: id, event_kind: "prior_union" },
    403,
  );
  pass("records role cannot read confidential union records");
  await call("counsellor", "hm_case_progress", {
    target: id,
    expected_version: 1,
    new_status: "active",
    new_track: "preparation",
    action: "PRIVATE care action",
    due: "2026-12-15",
    no_action_reason: "",
  });
  const ownCase = (await call("partnerb", "hm_list_cases")).find(
    (c) => c.id === id,
  );
  assert.equal(ownCase.track, "preparation");
  assert.equal(ownCase.next_action, "");
  pass("track persists while private next action stays hidden");
  await call(
    "partnera",
    "hm_save_answer",
    {
      target: id,
      key: "decision_1",
      body: "Outside current track",
      share: "sealed",
    },
    400,
  );
  pass("server rejects hidden-track answers");
  const certificateBody = {
    title: "Synthetic official certificate",
    certificate_type: "official_marriage",
    status: "verified",
    reference: "SAMPLE-OFFICIAL",
    source: "Synthetic registrar review",
    reviewed_on: "2026-11-21",
    verification_reference: "SAMPLE-VERIFIED",
  };
  const certificateKey = crypto.randomUUID();
  const certificate = await call("records", "hm_registry_item_save", {
    target: id,
    item_id: null,
    item_kind: "certificate",
    expected_version: null,
    body: certificateBody,
    request_key: certificateKey,
  });
  const certRetry = await call("records", "hm_registry_item_save", {
    target: id,
    item_id: null,
    item_kind: "certificate",
    expected_version: null,
    body: certificateBody,
    request_key: certificateKey,
  });
  assert.equal(certificate.id, certRetry.id);
  pass("certificate evidence retry is idempotent");
  const requiredDoc = await call("records", "hm_registry_item_save", {
    target: id,
    item_id: null,
    item_kind: "document",
    expected_version: null,
    body: {
      title: "Required synthetic document",
      document_type: "marital_status",
      status: "pending",
      required: true,
    },
  });
  const verifiedBody = {
    kind: "Church ceremony",
    status: "Verified",
    ceremony_status: "celebrated",
    country: "Nigeria",
    region: "Synthetic district",
    venue: "Synthetic venue",
    date: "2026-11-20",
    actualDate: "2026-11-20",
    officiant: "Synthetic official",
    witnesses: "Synthetic witnesses",
    authority: true,
    eligibility: true,
    evidence: "SAMPLE REVIEW",
    application_reference: "SAMPLE APP",
    official_channel: "Synthetic registry",
    submitted_on: "2026-11-21",
    receipt: "SAMPLE RECEIPT",
    acknowledgement: "SAMPLE ACK",
    participant_summary: "Reviewed wedding update",
    summary_released: true,
  };
  await call(
    "records",
    "hm_save_record",
    {
      target: id,
      kind: "hm_registry",
      expected_version: 1,
      body: verifiedBody,
    },
    400,
  );
  pass("pending required document blocks verification");
  await call("records", "hm_registry_item_save", {
    target: id,
    item_id: requiredDoc.id,
    item_kind: "document",
    expected_version: 1,
    body: {
      title: "Required synthetic document",
      document_type: "marital_status",
      status: "reviewed",
      required: true,
      reference: "SAMPLE DOCUMENT",
      source: "Synthetic review",
      reviewed_on: "2026-11-21",
      expires_on: "2026-11-19",
    },
  });
  await call(
    "records",
    "hm_save_record",
    {
      target: id,
      kind: "hm_registry",
      expected_version: 1,
      body: verifiedBody,
    },
    400,
  );
  pass("evidence expired before ceremony blocks verification");
  await call("records", "hm_registry_item_save", {
    target: id,
    item_id: requiredDoc.id,
    item_kind: "document",
    expected_version: 2,
    body: {
      title: "Required synthetic document",
      document_type: "marital_status",
      status: "reviewed",
      required: true,
      reference: "SAMPLE DOCUMENT",
      source: "Synthetic review",
      reviewed_on: "2026-11-21",
      expires_on: "2026-11-21",
    },
  });
  await call("records", "hm_save_record", {
    target: id,
    kind: "hm_registry",
    expected_version: 1,
    body: verifiedBody,
  });
  pass("complete reviewed registry record accepted");
  const weddingUpdate = await call("partnerb", "hm_registry_update", {
    target: id,
  });
  assert.equal(weddingUpdate.status, "Verified");
  assert.ok(!JSON.stringify(weddingUpdate).includes("SAMPLE-OFFICIAL"));
  pass("participant wedding update omits private evidence");
  await call(
    "partnerb",
    "hm_registry_items",
    { target: id, item_kind: "certificate" },
    403,
  );
  await call(
    "coordinator",
    "hm_registry_items",
    { target: id, item_kind: "certificate" },
    403,
  );
  pass("certificate register scope enforced");
  await call(
    "records",
    "hm_save_record",
    {
      target: id,
      kind: "hm_registry",
      expected_version: 2,
      body: { ...verifiedBody, venue: "Changed venue" },
    },
    400,
  );
  pass("venue change requires renewed review");
  await call("records", "hm_registry_item_save", {
    target: id,
    item_id: requiredDoc.id,
    item_kind: "document",
    expected_version: 3,
    body: {
      title: "Required synthetic document",
      document_type: "marital_status",
      status: "rejected",
      required: true,
      reason: "Synthetic evidence changed",
    },
  });
  const reopened = await call("records", "hm_get_record", {
    target: id,
    kind: "hm_registry",
  });
  assert.equal(reopened.payload.status, "Requirements pending");
  assert.equal(reopened.payload.summary_released, false);
  pass("changed evidence reopens verification");
  assert.equal(
    (
      await call("records", "hm_registry_history", {
        target: id,
        item_id: requiredDoc.id,
      })
    ).length,
    4,
  );
  assert.ok(
    (await call("records", "hm_registry_history", { target: id })).length >= 3,
  );
  pass("certificate and registration amendments preserved");
  await call(
    "records",
    "hm_registry_item_save",
    {
      target: id,
      item_id: null,
      item_kind: "submission",
      expected_version: null,
      body: {
        title: "Unsourced deadline",
        stage: "application",
        status: "prepared",
        due_on: "2026-12-01",
      },
    },
    400,
  );
  pass("unverified statutory deadline rejected");
  const ownExport = await call("partnera", "hm_export_own", { target: id });
  assert.ok(ownExport.answers.every((a) => a.author_id === users.partnera.id));
  assert.equal(ownExport.answers.length, 2);
  pass("own export excludes other participants");
  await call(
    "counsellor",
    "hm_revoke_participant",
    { target: id, person: users.partnera.id },
    204,
  );
  await call("partnera", "hm_get_answers", { target: id }, 403);
  pass("revocation effective over REST");
  const audit = await call("counsellor", "hm_audit", { target: id });
  assert.ok(audit.some((a) => a.operation === "read"));
  assert.ok(audit.some((a) => a.object_name === "consent"));
  pass("read and consent audit events");
  await call("anonymous", "hm_list_cases", {}, 401);
  pass("anonymous RPC denied");
  const enquiryKey = crypto.randomUUID(),
    enquiryArgs = {
      name: "Synthetic requester",
      care_lane: "personal",
      reply: "Participant initiates",
      safe_contact: "SYNTHETIC PRIVATE CONTACT",
      language: "French",
      notice: "hm-privacy-v1",
      acknowledged: true,
      request_key: enquiryKey,
    };
  await call(
    "outsider",
    "hm_submit_enquiry",
    { ...enquiryArgs, acknowledged: false },
    400,
  );
  pass("enquiry requires privacy acknowledgement");
  const enquiry = await call("outsider", "hm_submit_enquiry", enquiryArgs);
  assert.equal(
    await call("outsider", "hm_submit_enquiry", enquiryArgs),
    enquiry,
  );
  pass("one-person enquiry receipt is retry safe");
  await call(
    "outsider",
    "hm_submit_enquiry",
    { ...enquiryArgs, request_key: crypto.randomUUID() },
    409,
  );
  pass("duplicate pending enquiry blocked");
  const routing = await call("counsellor", "hm_triage_queue");
  assert.ok(routing.some((r) => r.id === enquiry));
  assert.ok(!JSON.stringify(routing).includes("SYNTHETIC PRIVATE CONTACT"));
  await call("records", "hm_triage_queue", {}, 403);
  pass("triage queue contains routing metadata only");
  const enquiryCase = await call("counsellor", "hm_accept_enquiry", {
    enquiry_id: enquiry,
  });
  assert.equal(
    await call("counsellor", "hm_accept_enquiry", { enquiry_id: enquiry }),
    enquiryCase,
  );
  pass("triage acceptance creates one assigned case");
  assert.equal(
    (await call("outsider", "hm_list_cases")).find((c) => c.id === enquiryCase)
      .status,
    "triaged",
  );
  await call(
    "outsider",
    "hm_record_consent",
    {
      target: enquiryCase,
      reason: "care",
      decision: true,
      notice: "hm-privacy-v1",
    },
    204,
  );
  await call(
    "outsider",
    "hm_save_answer",
    {
      target: enquiryCase,
      key: "meaning_2",
      body: "Wrong care lane",
      share: "sealed",
    },
    400,
  );
  pass("RTT is restricted to premarital care");
  let ownPeople = await call("outsider", "hm_people_list", {
    target: enquiryCase,
  });
  assert.equal(ownPeople.length, 1);
  const person = ownPeople[0];
  await call("outsider", "hm_person_save", {
    target: enquiryCase,
    person: person.id,
    expected_version: person.version,
    body: {
      preferred_name: "Synthetic requester",
      phone: "Synthetic reply method",
      language: "French",
      nationality: "Example nationality",
      dependants_summary: "PRIVATE RESPONSIBILITIES",
    },
  });
  pass("person identity is separate from account and editable by owner");
  const peerKey = crypto.randomUUID(),
    peerBody = {
      preferred_name: "Synthetic second person",
      legal_name: "Synthetic legal name",
      dependants_summary: "PRIVATE SECOND BACKGROUND",
    };
  const peer = await call("counsellor", "hm_person_save", {
    target: enquiryCase,
    person: null,
    expected_version: null,
    body: peerBody,
    request_key: peerKey,
  });
  assert.equal(
    (
      await call("counsellor", "hm_person_save", {
        target: enquiryCase,
        person: null,
        expected_version: null,
        body: peerBody,
        request_key: peerKey,
      })
    ).id,
    peer.id,
  );
  pass("offline person creation is retry safe");
  assert.equal(
    (await call("outsider", "hm_people_list", { target: enquiryCase })).length,
    1,
  );
  await call(
    "outsider",
    "hm_person_save",
    {
      target: enquiryCase,
      person: peer.id,
      expected_version: 1,
      body: { preferred_name: "Forged" },
    },
    403,
  );
  pass("partner profile read/write denied");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_hbg-marriage-auth",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `insert into marriages_private.assignments(case_id,user_id,scope) values('${enquiryCase}','${users.records.id}','records'),('${enquiryCase}','${users.coordinator.id}','coordinator');`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const legalPeople = await call("records", "hm_people_list", {
    target: enquiryCase,
  });
  assert.ok(!JSON.stringify(legalPeople).includes("PRIVATE"));
  await call("coordinator", "hm_people_list", { target: enquiryCase }, 403);
  pass("legal profile projection excludes family background");
  const password = require("node:crypto").randomBytes(20).toString("hex"),
    email = `hm-invite-${crypto.randomUUID()}@example.com`;
  const admin = await fetch(`${env.API_URL}/auth/v1/admin/users`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: env.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(admin.status, 200);
  const freshUser = await admin.json();
  const freshLogin = await fetch(
    `${env.API_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { apikey: env.ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  assert.equal(freshLogin.status, 200);
  tokens.fresh = (await freshLogin.json()).access_token;
  const freshCode = await call("counsellor", "hm_issue_invite", {
    target: enquiryCase,
  });
  await call("fresh", "hm_claim_invite", { code: freshCode }, 204);
  const freshInvite = (
    await call("counsellor", "hm_pending_invites", { target: enquiryCase })
  ).find((i) => i.claimed_by === freshUser.id);
  await call(
    "counsellor",
    "hm_review_invite",
    { invite_id: freshInvite.id, approve: true, identity_checked: true },
    204,
  );
  await call(
    "counsellor",
    "hm_person_link_account",
    {
      target: enquiryCase,
      person: peer.id,
      account: freshUser.id,
      identity_checked: false,
    },
    403,
  );
  await call(
    "counsellor",
    "hm_person_link_account",
    {
      target: enquiryCase,
      person: peer.id,
      account: freshUser.id,
      identity_checked: true,
    },
    204,
  );
  assert.equal(
    (await call("fresh", "hm_people_list", { target: enquiryCase })).length,
    1,
  );
  pass("reviewed account link preserves two separate people");
  const memberId = crypto.randomUUID();
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_hbg-marriage-auth",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `create table if not exists public.member_profile_intake(user_id uuid primary key,person_id uuid,reviewed_at timestamptz);alter table public.member_profile_intake enable row level security;revoke all on public.member_profile_intake from anon,authenticated;insert into public.member_profile_intake values('${freshUser.id}','${memberId}',now());`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  assert.equal(
    await call("counsellor", "hm_member_candidate", {
      target: enquiryCase,
      person: peer.id,
    }),
    memberId,
  );
  await call(
    "counsellor",
    "hm_person_link_member",
    {
      target: enquiryCase,
      person: peer.id,
      member: memberId,
      identity_checked: false,
    },
    403,
  );
  await call(
    "counsellor",
    "hm_person_link_member",
    {
      target: enquiryCase,
      person: peer.id,
      member: memberId,
      identity_checked: true,
    },
    204,
  );
  pass("membership link uses reviewed canonical mapping only");
  await call("counsellor", "hm_journey_save", {
    target: enquiryCase,
    entry_id: null,
    event_kind: "prior_union",
    expected_version: null,
    body: {
      title: "Synthetic history",
      person_id: peer.id,
      person_reference: "Synthetic second person",
      status: "active",
      union_type: "customary",
      union_status: "ongoing",
      same_partner: true,
    },
  });
  pass("union history links to stable person ID");
  await call(
    "counsellor",
    "hm_journey_save",
    {
      target: id,
      entry_id: null,
      event_kind: "prior_union",
      expected_version: null,
      body: {
        title: "Wrong case person",
        person_id: peer.id,
        person_reference: "Synthetic",
        status: "active",
        union_type: "customary",
        union_status: "ongoing",
      },
    },
    400,
  );
  pass("cross-case person reference rejected");
  const laterCase = await call("counsellor", "hm_create_case", {
    case_name: "Synthetic later episode",
    case_lane: "enrichment",
  });
  await call(
    "counsellor",
    "hm_person_reuse",
    {
      target: laterCase,
      source_case: enquiryCase,
      person: person.id,
      identity_checked: true,
    },
    204,
  );
  assert.equal(
    (await call("counsellor", "hm_people_list", { target: laterCase }))[0].id,
    person.id,
  );
  pass("reviewed person identity persists across episodes");
  const personalExport = await call("outsider", "hm_export_own", {
    target: enquiryCase,
  });
  assert.equal(personalExport.person_profile.id, person.id);
  assert.ok(
    !JSON.stringify(personalExport).includes("PRIVATE SECOND BACKGROUND"),
  );
  pass("own export includes profile without partner background");
  const raceCase = await call("counsellor", "hm_create_case", {
    case_name: "Synthetic concurrency case",
    case_lane: "premarital",
  });
  for (const who of ["partnera", "partnerb", "outsider"]) {
    const code = await call("counsellor", "hm_issue_invite", {
      target: raceCase,
    });
    await call(who, "hm_claim_invite", { code }, 204);
  }
  const racePending = await call("counsellor", "hm_pending_invites", {
    target: raceCase,
  });
  const raceStatuses = await Promise.all(
    racePending.map(async (i) => {
      const response = await fetch(
        `${env.API_URL}/rest/v1/rpc/hm_review_invite`,
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            apikey: env.ANON_KEY,
            Authorization: `Bearer ${tokens.counsellor}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invite_id: i.id,
            approve: true,
            identity_checked: true,
          }),
        },
      );
      await response.text();
      return response.status;
    }),
  );
  assert.deepEqual(raceStatuses.sort(), [204, 204, 400]);
  assert.equal(
    (await call("counsellor", "hm_participants", { target: raceCase })).length,
    2,
  );
  pass("parallel approvals cannot exceed two participants");
  const writeStatuses = await Promise.all(
    ["Synthetic write A", "Synthetic write B"].map(async (background) => {
      const response = await fetch(
        `${env.API_URL}/rest/v1/rpc/hm_save_record`,
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            apikey: env.ANON_KEY,
            Authorization: `Bearer ${tokens.counsellor}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            target: raceCase,
            kind: "hm_care",
            expected_version: 1,
            body: { background },
          }),
        },
      );
      await response.text();
      return response.status;
    }),
  );
  assert.deepEqual(writeStatuses.sort(), [200, 409]);
  pass("parallel record saves preserve one winner and report conflict");
  const expiryCase = await call("counsellor", "hm_create_case", {
      case_name: "Synthetic expired invitation",
      case_lane: "personal",
    }),
    expiredCode = await call("counsellor", "hm_issue_invite", {
      target: expiryCase,
    });
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_hbg-marriage-auth",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `update marriages_private.invites set expires_at=now()-interval '1 minute' where case_id='${expiryCase}';`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  await call("outsider", "hm_claim_invite", { code: expiredCode }, 403);
  pass("expired invitation denied through real Auth API");
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_hbg-marriage-auth",
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `delete from marriages_private.assignments where case_id='${expiryCase}' and user_id='${users.counsellor.id}';`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  await call(
    "counsellor",
    "hm_get_record",
    { target: expiryCase, kind: "hm_care" },
    403,
  );
  pass("counsellor revocation applies to an existing Auth session");
  console.log(
    `${count} authenticated API scenarios passed; synthetic local records only.`,
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
