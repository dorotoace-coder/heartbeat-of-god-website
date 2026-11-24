import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import Stripe from "stripe";
const require = createRequire(import.meta.url);
const cache = {};
function load(name, overrides = {}) {
  const filename = name.startsWith("src/")
    ? name
    : `src/lib/partnership/${name}.ts`;
  if (cache[filename] && !Object.keys(overrides).length) return cache[filename];
  const exports = {};
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  runInNewContext(js, {
    exports,
    process,
    Request,
    Response,
    require: (id) =>
      overrides[id] ??
      (id === "./catalogue"
        ? load("catalogue")
        : id.startsWith("@/lib/partnership/")
          ? load(id.split("/").at(-1))
          : require(id)),
  });
  if (!Object.keys(overrides).length) cache[filename] = exports;
  return exports;
}
const { minorAmount, nextDue, partnershipAreas } = load("catalogue");
assert.equal(partnershipAreas.length, 5);
assert.equal(minorAmount("25.50"), 2550);
for (const amount of [NaN, Infinity, 0, -1, "25.555"])
  assert.throws(() => minorAmount(amount));
assert.equal(nextDue("2027-01-31", "monthly", 1), "2027-02-28");
assert.equal(nextDue("2026-11-24", "weekly", 1), "2026-12-01");
const { checkoutParameters } = load("checkout");
const base = {
  id: "10000000-0000-4000-8000-000000000002",
  project: "hbg-tv",
  method: "stripe",
  currency: "CAD",
  amount: 25,
};
for (const [frequency, interval] of [
  ["weekly", "week"],
  ["monthly", "month"],
  ["once", null],
]) {
  const p = checkoutParameters(
    { ...base, frequency },
    "partner@example.invalid",
    "https://example.invalid",
    "hbg_partnership_abcdefgh",
  );
  assert.equal(p.line_items[0].price_data.unit_amount, 2500);
  assert.equal(p.metadata.commitment_id, base.id);
  assert.equal(p.mode, interval ? "subscription" : "payment");
  assert.equal(
    p.line_items[0].price_data.recurring?.interval ?? null,
    interval,
  );
  if (interval) assert.equal(p.subscription_data.metadata.project, "hbg-tv");
  else assert.equal(p.payment_intent_data.metadata.project, "hbg-tv");
  assert.ok(!p.payment_method_types);
}
assert.throws(() =>
  checkoutParameters(
    { ...base, currency: "NGN", frequency: "weekly" },
    undefined,
    "https://example.invalid",
    "x",
  ),
);
const { paymentCommand } = load("events");
const event = (type, object) => ({
  id: "evt_fixture",
  created: 100,
  type,
  data: { object },
});
const metadata = {
  source: "hbg-partnership",
  commitment_id: base.id,
  project: "hbg-tv",
};
assert.equal(
  paymentCommand(
    event("checkout.session.completed", {
      mode: "subscription",
      metadata,
      customer: "cus_demo",
      payment_status: "paid",
    }),
  ),
  null,
);
assert.equal(
  paymentCommand(
    event("checkout.session.completed", {
      mode: "payment",
      metadata,
      customer: "cus_demo",
      payment_status: "unpaid",
    }),
  ),
  null,
);
const session = {
  id: "cs_demo",
  mode: "payment",
  metadata,
  customer: "cus_demo",
  payment_status: "paid",
  amount_total: 2500,
  currency: "cad",
  payment_intent: "pi_demo",
};
assert.equal(
  paymentCommand(event("checkout.session.completed", session)).p_key,
  paymentCommand(event("checkout.session.async_payment_succeeded", session))
    .p_key,
);
assert.equal(
  paymentCommand(
    event("invoice.paid", {
      id: "in_demo",
      status: "paid",
      amount_paid: 2500,
      currency: "cad",
      customer: "cus_demo",
      parent: { subscription_details: { subscription: "sub_demo", metadata } },
      payments: {
        data: [{ status: "paid", payment: { payment_intent: "pi_demo" } }],
      },
    }),
  ).p_payment,
  "pi_demo",
);
assert.equal(
  paymentCommand(
    event("invoice.paid", {
      id: "in_free",
      status: "paid",
      amount_paid: 0,
      currency: "cad",
      parent: { subscription_details: { metadata } },
    }),
  ),
  null,
);
// Exercise real Stripe signature verification with a synthetic event and signing secret.
const stripe = new Stripe("sk_test_local_fixture_only");
const secret = "whsec_local_fixture_only";
const payload = JSON.stringify(event("checkout.session.completed", session));
const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
assert.equal(
  stripe.webhooks.constructEvent(payload, header, secret).id,
  "evt_fixture",
);
assert.throws(() =>
  stripe.webhooks.constructEvent(payload + " ", header, secret),
);
// Checkout, portal and webhook fail closed until explicitly enabled.
const server = {
  automaticGivingEnabled: () => false,
  partnershipPaymentsConfigured: () => false,
};
for (const name of ["checkout", "portal", "webhook", "cancel"]) {
  const route = load(`src/app/api/partnership/${name}/route.ts`, {
    "@/lib/partnership/server": server,
  });
  const response = await route.POST(
    new Request(`http://localhost/api/partnership/${name}`, {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(response.status, 503);
}
console.log(
  "PASS: five areas, amount precision, calendar boundaries, weekly/monthly/one-time checkout payloads, immutable allocation metadata, no initial recurring double-count, unpaid rejection, signed-event validation and three fail-closed endpoints.",
);
// Disabling new registrations must not disable receipts or cancellation for existing debits.
const actualServer = load("server");
const keys = [
  "PARTNERSHIP_ENABLED",
  "PARTNERSHIP_STRIPE_ENABLED",
  "STRIPE_SECRET_KEY",
  "PARTNERSHIP_STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];
const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
try {
  for (const key of keys) process.env[key] = "local-fixture";
  process.env.PARTNERSHIP_ENABLED = "false";
  process.env.PARTNERSHIP_STRIPE_ENABLED = "true";
  assert.equal(actualServer.automaticGivingEnabled(), false);
  assert.equal(actualServer.partnershipPaymentsConfigured(), true);
  process.env.PARTNERSHIP_ENABLED = "true";
  assert.equal(actualServer.automaticGivingEnabled(), true);
  delete process.env.PARTNERSHIP_STRIPE_WEBHOOK_SECRET;
  assert.equal(actualServer.partnershipPaymentsConfigured(), false);
} finally {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
console.log(
  "PASS: new-intake shutdown retains existing payment processing/portal, and missing webhook configuration prevents automatic giving.",
);
// Exercise active HTTP handlers with an isolated provider double; no hosted account calls.
const calls=[];const database={from:()=>({update:()=>({eq(){return this;},is(){return this;},select(){return this;},single:async()=>({data:{id:base.id},error:null})})})};
const checkoutServer={automaticGivingEnabled:()=>true,authenticatedCommitment:async()=>({commitment:{...base,frequency:'weekly',state:'active'},user:{email:'partner@example.invalid'}}),siteOrigin:()=> 'https://example.invalid',adminClient:()=>database,stripeClient:()=>({checkout:{sessions:{create:async(parameters,options)=>{calls.push({parameters,options});return {id:'cs_fixture',url:'https://checkout.stripe.com/fixture'};},expire:async()=>{}}}})};
const checkoutRoute=load('src/app/api/partnership/checkout/route.ts',{'@/lib/partnership/server':checkoutServer});
for(let i=0;i<2;i++)assert.equal((await checkoutRoute.POST(new Request('http://localhost/api/partnership/checkout',{method:'POST',body:'{}'}))).status,200);
assert.equal(JSON.stringify(calls[0]),JSON.stringify(calls[1]),'Retry changed Stripe parameters under the same idempotency key');
const sequence=[];const cancelDb={from:()=>({update:()=>({eq(){return this;},is(){return this;},select(){return this;},single:async()=>{sequence.push('end-local');return {data:{id:base.id},error:null};}})})};
const cancelRoute=load('src/app/api/partnership/cancel/route.ts',{'@/lib/partnership/server':{partnershipPaymentsConfigured:()=>true,authenticatedCommitment:async()=>({commitment:{...base,stripe_checkout_id:'cs_fixture'}}),adminClient:()=>cancelDb,stripeClient:()=>({checkout:{sessions:{retrieve:async()=>({id:'cs_fixture',status:'open'}),expire:async()=>{sequence.push('expire-provider');}}}})}});
assert.equal((await cancelRoute.POST(new Request('http://localhost/api/partnership/cancel',{method:'POST',body:'{}'}))).status,200);assert.equal(sequence.join(','),'expire-provider,end-local');
const webhookRoute=load('src/app/api/partnership/webhook/route.ts',{'@/lib/partnership/server':{partnershipPaymentsConfigured:()=>true,stripeClient:()=>stripe,adminClient:()=>{throw new Error('An invalid signature must not reach the database');}}});
assert.equal((await webhookRoute.POST(new Request('http://localhost/api/partnership/webhook',{method:'POST',body:payload,headers:{'stripe-signature':'forged'}}))).status,400);
console.log('PASS: active checkout retry stability, provider-before-local cancellation ordering and HTTP rejection of forged webhook signatures.');
