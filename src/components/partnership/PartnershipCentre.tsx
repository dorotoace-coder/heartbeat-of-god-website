"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MINISTRY_EMAIL } from "@/lib/site";
import { supabase } from "@/lib/supabase";
import {
  areaTitle,
  frequencies,
  partnershipAreas,
  type Commitment,
  type Gift,
  type PartnershipArea,
} from "@/lib/partnership/catalogue";
const input =
  "mt-2 min-h-12 w-full rounded-xl border border-purple-200 bg-white p-3 text-base text-slate-950";
const button =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2e1252] px-5 py-3 font-semibold text-white disabled:opacity-50";
const outline =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-950";
const money = (currency: string, amount: number) =>
  `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function PartnershipCentre({
  enabled,
  automatic,
  bank,
  initialArea = "clt",
}: {
  enabled: boolean;
  automatic: boolean;
  initialArea?: PartnershipArea;
  bank: { bankName: string; accountName: string; accountNumber: string };
}) {
  const loadGeneration = useRef(0);
  const [identity, setIdentity] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [method, setMethod] = useState("manual");
  const [currency, setCurrency] = useState("NGN");
  const [project, setProject] = useState<PartnershipArea>(initialArea);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const request = useRef<{ signature: string; id: string } | null>(null);
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (generation !== loadGeneration.current) return;
    setCommitments([]);
    setGifts([]);
    setIdentity(user?.id ?? null);
    setReady(true);
    if (!user) {
      setCommitments([]);
      setGifts([]);
      return;
    }
    const [c, g] = await Promise.all([
      supabase
        .from("partnership_commitments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("partnership_gifts")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (generation !== loadGeneration.current) return;
    if (c.error || g.error)
      setNotice(
        "Your partnership records could not load. Keep your details and retry.",
      );
    else {
      setCommitments(c.data);
      setGifts(g.data);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      const credentials = {
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      };
      const result =
        authMode === "signin"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo: `${window.location.origin}/partnership`,
                data: { full_name: String(form.get("name") || "Partner") },
              },
            });
      if (result.error) throw result.error;
      setNotice(
        authMode === "signup"
          ? "Check your email to confirm your account, then sign in here."
          : "Signed in.",
      );
      await load();
    } catch {
      setNotice(
        "Could not sign in or create the account. Check your details and confirmation email, then retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const method = String(values.method);
    const payload = {
      p_name: String(values.name).trim(),
      p_project: project,
      p_frequency: String(values.frequency),
      p_method: method,
      p_currency: String(values.currency),
      p_amount: Number(values.amount),
      p_start:
        method === "stripe"
          ? new Date().toISOString().slice(0, 10)
          : String(values.start),
      p_consent: values.consent === "on",
      p_updates: values.updates === "on",
    };
    if (method === "stripe" && Number(values.amount) > 100000) {
      setNotice(
        "Automatic gifts must be no more than 100,000 per payment. Choose a lower amount or manual giving.",
      );
      return;
    }
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setNotice("");
    try {
      const result = await supabase.rpc("join_partnership", {
        p_id: request.current.id,
        ...payload,
      });
      if (result.error) throw result.error;
      setNotice(
        method === "stripe"
          ? "Commitment saved. Open secure checkout below to authorize automatic giving. No payment is confirmed yet."
          : "Your commitment is saved. No money has been collected. Follow the transfer instructions and report each gift below.",
      );
      await load();
    } catch {
      setNotice(
        "We could not confirm your commitment. Keep this page open and retry the same details.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function endpoint(path: string, id: string) {
    setBusy(true);
    setNotice("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error();
      const response = await fetch(`/api/partnership/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ commitmentId: id }),
      });
      const data = await response.json();
      if (path === "cancel" && response.ok && data.saved) {
        setNotice(
          "Pending automatic checkout stopped. No future payment can be authorized through that checkout.",
        );
        await load();
        return;
      }
      if (!response.ok || !data.url)
        throw new Error(data.error || "Please retry.");
      window.location.assign(data.url);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Could not open secure giving. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-8 text-[#2e1252]">
      <header className="rounded-3xl bg-[#2e1252] p-7 text-white sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-purple-200">
          Heartbeat of God · Partnership
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
          Stand with the work.
          <br />
          See what your giving supports.
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-purple-100">
          Choose the ministry area close to your heart. Give once, or make a
          weekly or monthly commitment you can manage.
        </p>
        <a
          href="#join-partnership"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-5 font-semibold text-purple-950"
        >
          Become a partner
        </a>
      </header>
      <section aria-labelledby="partnership-areas">
        <h2 id="partnership-areas" className="font-serif text-3xl">
          Five areas. One shared mission.
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {partnershipAreas.map((area, index) => (
            <button
              key={area.id}
              type="button"
              aria-pressed={project === area.id}
              onClick={() => setProject(area.id)}
              className="rounded-2xl border border-purple-200 bg-white p-6 text-left aria-pressed:border-purple-700 aria-pressed:ring-2 aria-pressed:ring-purple-300"
            >
              <p className="text-xs uppercase tracking-wider text-purple-700">
                0{index + 1} · {area.lane}
              </p>
              <h3 className="mt-3 font-serif text-2xl">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {area.description}
              </p>
            </button>
          ))}
        </div>
      </section>
      <section
        className="grid gap-4 rounded-2xl bg-purple-50 p-6 sm:grid-cols-3"
        aria-label="How partnership works"
      >
        {[
          "Choose your area and amount",
          "Choose weekly, monthly or one-time",
          "Track confirmed gifts and manage your commitment",
        ].map((text, i) => (
          <p key={text} className="leading-7">
            <strong className="mr-2 text-purple-700">{i + 1}.</strong>
            {text}
          </p>
        ))}
      </section>
      <p
        role="status"
        aria-live="polite"
        className="whitespace-pre-line text-sm leading-7"
      >
        {notice}
      </p>
      {!enabled && (
        <section
          id="join-partnership"
          className="rounded-2xl border border-purple-200 bg-white p-6"
        >
          <h2 className="font-serif text-2xl">
            Partnership registration is being prepared.
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            The five areas are ready to explore. Registration and automatic
            giving will open after setup is checked. You can still use the
            existing giving page.
          </p>
          <Link href="/give" className={`${outline} mt-5`}>
            Open giving options
          </Link>
        </section>
      )}
      {!ready ? (
        <p>Checking your sign-in…</p>
      ) : !identity ? (
        <section
          id="join-partnership"
          className="rounded-3xl border border-purple-100 bg-white p-6 sm:p-8"
        >
          <h2 className="font-serif text-3xl">Your own partnership account.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use your existing Pulse OS account, or create an account to keep
            your commitments and giving history together. Partnership does not
            grant access to staff records.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              className={outline}
              onClick={() => setAuthMode("signin")}
              aria-pressed={authMode === "signin"}
            >
              Sign in
            </button>
            {enabled && (
              <button
                className={outline}
                onClick={() => setAuthMode("signup")}
                aria-pressed={authMode === "signup"}
              >
                Create account
              </button>
            )}
          </div>
          <form onSubmit={authenticate} className="mt-5 grid max-w-xl gap-4">
            {authMode === "signup" && (
              <label>
                Full name
                <input
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  className={input}
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className={input}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={
                  authMode === "signin" ? "current-password" : "new-password"
                }
                className={input}
              />
            </label>
            <button disabled={busy} className={button}>
              {busy
                ? "Please wait…"
                : authMode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </section>
      ) : (
        <>
          {enabled && (
            <section
              id="join-partnership"
              className="rounded-3xl border border-purple-100 bg-white p-6 sm:p-8"
            >
              <h2 className="font-serif text-3xl">Make your commitment.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                A commitment is your intention to give. Your history counts
                money as received only after payment verification.
              </p>
              <form onSubmit={join} className="mt-6 grid gap-5 sm:grid-cols-2">
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    className={input}
                  />
                </label>
                <label>
                  Partnership area
                  <select
                    name="project"
                    value={project}
                    onChange={(e) =>
                      setProject(e.target.value as PartnershipArea)
                    }
                    className={input}
                  >
                    {partnershipAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Giving frequency
                  <select
                    name="frequency"
                    className={input}
                    defaultValue="monthly"
                  >
                    {frequencies.map((f) => (
                      <option key={f} value={f}>
                        {f === "once"
                          ? "One-time"
                          : f === "weekly"
                            ? "Weekly"
                            : "Monthly"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Giving method
                  <select
                    name="method"
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      if (e.target.value === "stripe" && currency === "NGN")
                        setCurrency("CAD");
                    }}
                    className={input}
                  >
                    <option value="manual">Manual transfer / commitment</option>
                    {automatic && (
                      <option value="stripe">
                        Automatic card giving (CAD / USD / EUR)
                      </option>
                    )}
                  </select>
                </label>
                <label>
                  Currency
                  <select
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={input}
                  >
                    {(method === "stripe"
                      ? ["CAD", "USD", "EUR"]
                      : ["NGN", "CAD", "USD", "EUR"]
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount per gift
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max="100000000"
                    step="0.01"
                    required
                    className={input}
                  />
                </label>
                <label>
                  Manual commitment starts
                  <input
                    name="start"
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className={input}
                  />
                </label>
                <p className="self-center text-sm leading-6 text-slate-600">
                  Automatic giving starts when you complete secure checkout. NGN
                  giving is manual. No automatic debit is authorized by saving
                  this form.
                </p>
                <label className="flex items-start gap-3 text-sm leading-6 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  I confirm the chosen area, amount and frequency, and agree to
                  keep this information for my partnership and giving records.
                </label>
                <label className="flex items-start gap-3 text-sm leading-6 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="updates"
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  I would like updates about this partnership area. This is
                  optional.
                </label>
                <button disabled={busy} className={button}>
                  {busy ? "Saving…" : "Save my commitment"}
                </button>
              </form>
            </section>
          )}
          <section aria-labelledby="my-partnerships">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="my-partnerships" className="font-serif text-3xl">
                My commitments & giving
              </h2>
              <button
                className={outline}
                disabled={busy}
                onClick={() => void load()}
              >
                Refresh my history
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Returning from checkout is not proof of payment. Look for Received
              in your history. For amount, frequency or area changes, end the
              old commitment and make a new one; cancel automatic giving through
              the secure giving account first.
            </p>
            {!commitments.length && (
              <p className="mt-5">
                No commitments yet. Choose your first area above.
              </p>
            )}
            <div className="mt-5 grid gap-5">
              {commitments.map((c) => (
                <CommitmentCard
                  key={c.id}
                  commitment={c}
                  gifts={gifts.filter((g) => g.commitment_id === c.id)}
                  busy={busy}
                  bank={bank}
                  onEndpoint={endpoint}
                  onChanged={load}
                  onNotice={setNotice}
                />
              ))}
            </div>
          </section>
          <button
            className={outline}
            onClick={async () => {
              await supabase.auth.signOut();
              await load();
            }}
          >
            Sign out
          </button>
        </>
      )}
      <footer className="rounded-2xl border border-purple-100 bg-white p-6 text-sm leading-7 text-slate-600">
        Your gift stays linked to your chosen area. Prayer, teaching and
        pastoral care remain open regardless of giving. Payment acknowledgements
        show received gifts; they are not a promise of a charitable tax receipt.
      </footer>
    </section>
  );
}
function CommitmentCard({
  commitment: c,
  gifts,
  busy,
  bank,
  onEndpoint,
  onChanged,
  onNotice,
}: {
  commitment: Commitment;
  gifts: Gift[];
  busy: boolean;
  bank: { bankName: string; accountName: string; accountNumber: string };
  onEndpoint: (path: string, id: string) => Promise<void>;
  onChanged: () => Promise<void>;
  onNotice: (s: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const report = useRef<{ signature: string; id: string } | null>(null);
  async function action(state: string, updates: boolean) {
    setSaving(true);
    try {
      const r = await supabase.rpc("update_manual_partnership", {
        p_id: c.id,
        p_state: state,
        p_updates: updates,
      });
      if (r.error) throw r.error;
      onNotice("Your commitment preferences have been saved.");
      await onChanged();
    } catch {
      onNotice("Could not confirm the update. Retry the same change.");
    } finally {
      setSaving(false);
    }
  }
  async function notify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount"));
    const reference = String(form.get("reference")).trim();
    const signature = JSON.stringify({ amount, reference });
    if (report.current?.signature !== signature)
      report.current = { signature, id: crypto.randomUUID() };
    setSaving(true);
    try {
      const r = await supabase.rpc("report_partnership_gift", {
        p_id: report.current.id,
        p_commitment: c.id,
        p_amount: amount,
        p_reference: reference,
      });
      if (r.error) throw r.error;
      onNotice(
        "Gift notification saved. It remains pending until an independent Treasury officer checks the bank record.",
      );
      await onChanged();
    } catch {
      onNotice(
        "Could not confirm the notification. Check your history for the reference before retrying the same details.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <article className="min-w-0 rounded-2xl border border-purple-100 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
        {c.state} ·{" "}
        {c.method === "manual" ? "Manual commitment" : "Automatic giving"}
        {c.provider_status ? ` · ${c.provider_status}` : ""}
      </p>
      <h3 className="mt-2 font-serif text-2xl">{areaTitle(c.project)}</h3>
      <p className="mt-3 font-semibold">
        {money(c.currency, c.amount)} ·{" "}
        {c.frequency === "once" ? "One-time" : c.frequency}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Starts {c.start_date} · Updates{" "}
        {c.updates_opt_in ? "requested" : "not requested"}
      </p>
      {c.method === "stripe" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {!c.stripe_customer_id && c.state === "active" && (
            <button
              disabled={busy}
              className={button}
              onClick={() => void onEndpoint("checkout", c.id)}
            >
              Open secure checkout
            </button>
          )}
          {!c.stripe_customer_id && c.state === "active" && (
            <button
              disabled={busy}
              className={outline}
              onClick={() => void onEndpoint("cancel", c.id)}
            >
              Stop pending checkout
            </button>
          )}
          {c.stripe_customer_id && (
            <button
              disabled={busy}
              className={outline}
              onClick={() => void onEndpoint("portal", c.id)}
            >
              Manage automatic giving
            </button>
          )}
          <button
            disabled={saving}
            className={outline}
            onClick={() => void action(c.state, !c.updates_opt_in)}
          >
            {c.updates_opt_in ? "Stop updates" : "Request updates"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={saving || c.state === "ended"}
              className={outline}
              onClick={() =>
                void action(
                  c.state === "active" ? "paused" : "active",
                  c.updates_opt_in,
                )
              }
            >
              {c.state === "active" ? "Pause commitment" : "Resume commitment"}
            </button>
            <button
              disabled={saving || c.state === "ended"}
              className={outline}
              onClick={() => void action("ended", c.updates_opt_in)}
            >
              End commitment
            </button>
            <button
              disabled={saving}
              className={outline}
              onClick={() => void action(c.state, !c.updates_opt_in)}
            >
              {c.updates_opt_in ? "Stop updates" : "Request updates"}
            </button>
          </div>
          {c.state === "active" && (
            <details className="mt-5">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Transfer instructions & report a gift
              </summary>
              {c.currency === "NGN" ? (
                <p className="mt-3 text-sm leading-7">
                  {bank.bankName} · {bank.accountName}
                  <br />
                  {bank.accountNumber}
                  <br />
                  Use your bank transaction reference below. Do not send card or
                  banking passwords.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-7">
                  <a
                    href={`mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent(`Transfer instructions: ${areaTitle(c.project)}`)}`}
                    className="underline"
                  >
                    Ask the ministry for approved transfer instructions
                  </a>{" "}
                  in this currency before sending. This commitment does not
                  itself move money.
                </p>
              )}
              <form
                onSubmit={notify}
                className="mt-4 grid gap-4 sm:grid-cols-2"
              >
                <label>
                  Amount sent ({c.currency})
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    max="100000000"
                    step="0.01"
                    defaultValue={c.amount}
                    required
                    className={input}
                  />
                </label>
                <label>
                  Bank transaction reference
                  <input
                    name="reference"
                    minLength={3}
                    maxLength={160}
                    required
                    className={input}
                  />
                </label>
                <button disabled={saving} className={button}>
                  Report my gift
                </button>
              </form>
            </details>
          )}
        </>
      )}
      <h4 className="mt-6 font-semibold">Giving history</h4>
      {!gifts.length ? (
        <p className="mt-2 text-sm text-slate-600">No gifts recorded yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-purple-100">
          {gifts.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap justify-between gap-2 py-3 text-sm"
            >
              <span>
                {money(g.currency, g.amount)} ·{" "}
                {g.disputed
                  ? "Disputed"
                  : Number(g.refunded_amount) > 0
                    ? `Received · refunded ${money(g.currency, g.refunded_amount)}`
                    : g.state === "received"
                      ? "Received"
                      : g.state === "pending"
                        ? "Awaiting verification"
                        : "Not verified"}
                <br />
                <span className="break-all text-xs text-slate-500">
                  {g.reference}
                </span>
              </span>
              <span>{g.created_at.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
