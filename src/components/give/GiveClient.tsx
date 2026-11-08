"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Landmark, CheckCircle2, AlertCircle, Copy, Check, ArrowUpRight, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { GivingConfig } from "@/lib/giving";
import { MINISTRY_EMAIL } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Tab = "card" | "naira" | "interac";
type CardCurrency = "CAD" | "USD" | "EUR";

const PRESETS = {
  NGN: [5000, 10000, 25000, 50000, 100000],
  CAD: [25, 50, 100, 250, 500],
  USD: [25, 50, 100, 250, 500],
  EUR: [25, 50, 100, 250, 500],
} as const;
const SYMBOLS = { NGN: "₦", CAD: "C$", USD: "US$", EUR: "€" } as const;

const input =
  "w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm text-text placeholder:text-muted/70 focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold/30";
const label = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted";

type PaystackPop = { setup: (o: Record<string, unknown>) => { openIframe: () => void } };

function mailtoFallback(subject: string, body: string) {
  return `mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Records a giving notification. Returns an error message, or null on success. */
async function recordDonation(row: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return "Our records system is offline right now.";
  const { error } = await supabase.from("donations").insert(row);
  return error ? error.message : null;
}

function Notice({ tone, children }: { tone: "ok" | "error" | "info"; children: React.ReactNode }) {
  const styles = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    info: "border-line bg-ivory text-muted",
  }[tone];
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed", styles)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function AmountPicker({
  currency,
  amount,
  custom,
  onPreset,
  onCustom,
  name,
}: {
  currency: keyof typeof PRESETS;
  amount: number | null;
  custom: string;
  onPreset: (v: number) => void;
  onCustom: (v: string) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className={label}>Amount ({currency})</legend>
      <div className="grid grid-cols-3 gap-2.5">
        {PRESETS[currency].map((v) => {
          const active = amount === v && !custom;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => onPreset(v)}
              className={cn(
                "rounded-xl border py-3 text-sm font-bold transition",
                active ? "border-plum bg-plum text-white" : "border-line bg-white text-text hover:border-plum/40",
              )}
            >
              {SYMBOLS[currency]}
              {v.toLocaleString()}
            </button>
          );
        })}
        <div className="relative">
          <label htmlFor={`${name}-custom`} className="sr-only">Other amount</label>
          <input
            id={`${name}-custom`}
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="Other"
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            className={cn("h-full w-full rounded-xl border bg-white px-3 text-sm font-bold text-text focus:outline-none focus:ring-2 focus:ring-gold/30", custom ? "border-gold-deep" : "border-line")}
          />
        </div>
      </div>
    </fieldset>
  );
}

function Frequency({ value, onChange, options, name }: { value: string; onChange: (v: string) => void; options: string[]; name: string }) {
  return (
    <fieldset>
      <legend className={label}>Frequency</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((f) => (
          <label key={f} className="cursor-pointer">
            <input type="radio" name={name} value={f} checked={value === f} onChange={(e) => onChange(e.target.value)} className="peer sr-only" />
            <span className="block rounded-xl border border-line py-3 text-center text-sm font-semibold text-muted transition peer-checked:border-gold-deep peer-checked:bg-gold/10 peer-checked:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-gold">
              {f}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ───────────────────────── Card (Stripe) ───────────────────────── */
function StripePanel({ config }: { config: GivingConfig }) {
  const [currency, setCurrency] = useState<CardCurrency>("CAD");
  const [amount, setAmount] = useState<number | null>(50);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("One Time");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const final = custom ? Number(custom) : amount || 0;

  if (!config.stripeCheckout && config.stripeLink) {
    return (
      <div className="space-y-6">
        <p className="leading-relaxed text-muted">
          Give securely by credit or debit card through Stripe. You’ll choose your amount and currency on Stripe’s secure page and receive an emailed receipt.
        </p>
        <a href={config.stripeLink} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "lg", "w-full")}>
          <CreditCard size={19} aria-hidden /> Give by Card <ArrowUpRight size={17} aria-hidden />
          <span className="sr-only"> (opens Stripe in a new tab)</span>
        </a>
      </div>
    );
  }

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!(final >= 1)) return setError("Please choose or enter an amount of at least 1.");
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: final,
          currency,
          email,
          frequency,
          label: frequency === "Monthly Partner" ? "Monthly Kingdom Partner" : "Kingdom Offering",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error || "Checkout could not be started.");
    } catch {
      setError("We couldn’t reach the payment service. Check your connection.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={pay} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-headline text-2xl text-text">Give by Card</h3>
        <label className="sr-only" htmlFor="card-currency">Currency</label>
        <select
          id="card-currency"
          value={currency}
          onChange={(e) => {
            const c = e.target.value as CardCurrency;
            setCurrency(c);
            setAmount(PRESETS[c][1]);
            setCustom("");
          }}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-text"
        >
          <option value="CAD">CAD (C$)</option>
          <option value="USD">USD (US$)</option>
          <option value="EUR">EUR (€)</option>
        </select>
      </div>
      <AmountPicker name="card" currency={currency} amount={amount} custom={custom} onPreset={(v) => { setAmount(v); setCustom(""); }} onCustom={(v) => { setCustom(v); setAmount(null); }} />
      <div>
        <label htmlFor="card-email" className={label}>Email for receipt</label>
        <input id="card-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
      </div>
      <Frequency name="card-frequency" value={frequency} onChange={setFrequency} options={["One Time", "Monthly Partner"]} />
      {error && (
        <Notice tone="error">
          {error}{" "}
          {config.stripeLink ? (
            <a className="font-semibold underline" href={config.stripeLink} target="_blank" rel="noopener noreferrer">Use our secure Stripe giving page instead</a>
          ) : (
            <a className="font-semibold underline" href={mailtoFallback("Giving help", `I tried to give ${SYMBOLS[currency]}${final} by card and it didn't go through.`)}>Email us and we’ll help</a>
          )}
          .
        </Notice>
      )}
      <button type="submit" disabled={busy} className={buttonClass("dark", "lg", "w-full")}>
        <CreditCard size={19} aria-hidden />
        {busy ? "Opening secure checkout…" : `Give ${SYMBOLS[currency]}${final ? final.toLocaleString() : "0"}${frequency === "Monthly Partner" ? " / month" : ""}`}
      </button>
      <p className="text-center text-xs text-muted">Secure checkout by Stripe · Receipt emailed automatically</p>
    </form>
  );
}

/* ───────────────────────── Naira (Paystack + bank) ───────────────────────── */
function NairaPanel({ config, bank }: { config: GivingConfig; bank: { bankName: string; accountNumber: string; accountName: string } }) {
  const hasCard = Boolean(config.paystackKey || config.paystackPage);
  const [method, setMethod] = useState<"card" | "transfer">(hasCard ? "card" : "transfer");
  const [amount, setAmount] = useState<number | null>(10000);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("One Time");
  const [state, setState] = useState<"idle" | "busy" | "paid" | "noted" | "error">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const final = custom ? Number(custom) : amount || 0;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the value is still visible to copy by hand */
    }
  };

  const payInline = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!(final >= 100)) return setError("Please choose or enter an amount of at least ₦100.");
    if (!config.paystackKey) return;
    setState("busy");
    const launch = () => {
      const Pop = (window as unknown as { PaystackPop?: PaystackPop }).PaystackPop;
      if (!Pop) {
        setState("error");
        setError("The Paystack window could not load.");
        return;
      }
      Pop.setup({
        key: config.paystackKey,
        email,
        amount: Math.round(final * 100),
        currency: "NGN",
        ref: `hbg-${Date.now()}`,
        callback: (response: { reference: string }) => {
          // Payment succeeded at Paystack; recording it is best-effort.
          recordDonation({
            currency: "NGN",
            amount: final,
            frequency,
            payment_method: "Card (Paystack)",
            status: "completed",
            reference: response.reference,
            donor_email: email,
            donor_name: name || null,
          }).then((err) => err && console.error("Donation record failed:", err));
          setState("paid");
        },
        onClose: () => setState((s) => (s === "busy" ? "idle" : s)),
      }).openIframe();
    };
    if ((window as unknown as { PaystackPop?: PaystackPop }).PaystackPop) return launch();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = launch;
    script.onerror = () => {
      setState("error");
      setError("The Paystack window could not load.");
    };
    document.head.appendChild(script);
  };

  const notifyTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!(final > 0)) return setError("Please enter the amount you transferred.");
    setState("busy");
    const err = await recordDonation({
      currency: "NGN",
      amount: final,
      frequency,
      payment_method: "Bank Transfer",
      status: "pending",
      reference: `BANK-${Date.now()}`,
      donor_email: email,
      donor_name: name || null,
    });
    if (err) {
      setState("error");
      setError("We couldn’t record your notification.");
    } else setState("noted");
  };

  if (state === "paid" || state === "noted") {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 size={52} className="mx-auto text-emerald-600" aria-hidden />
        <h3 className="mt-5 font-headline text-3xl text-text">{state === "paid" ? "Thank you!" : "Transfer noted"}</h3>
        <p role="status" className="mx-auto mt-3 max-w-sm text-muted">
          {state === "paid"
            ? `Your seed of ₦${final.toLocaleString()} has been received. Paystack has emailed your receipt.`
            : `We’ll confirm your transfer of ₦${final.toLocaleString()} within 24 hours. God bless you!`}
        </p>
        <button type="button" onClick={() => setState("idle")} className={buttonClass("ghost-dark", "md", "mt-8")}>Give again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="font-headline text-2xl text-text">Give in Naira</h3>
      <AmountPicker name="ngn" currency="NGN" amount={amount} custom={custom} onPreset={(v) => { setAmount(v); setCustom(""); }} onCustom={(v) => { setCustom(v); setAmount(null); }} />
      <Frequency name="ngn-frequency" value={frequency} onChange={setFrequency} options={["One Time", "Monthly Pledge"]} />

      {hasCard && (
        <div role="tablist" aria-label="Naira payment method" className="grid grid-cols-2 gap-2 rounded-2xl bg-ivory p-1.5">
          {(["card", "transfer"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={method === m}
              onClick={() => { setMethod(m); setError(""); setState("idle"); }}
              className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition", method === m ? "bg-white text-text shadow" : "text-muted hover:text-text")}
            >
              {m === "card" ? <CreditCard size={16} aria-hidden /> : <Landmark size={16} aria-hidden />}
              {m === "card" ? "Card" : "Bank Transfer"}
            </button>
          ))}
        </div>
      )}

      {method === "card" && hasCard ? (
        config.paystackKey ? (
          <form onSubmit={payInline} className="space-y-6">
            <div>
              <label htmlFor="ngn-email" className={label}>Email for receipt</label>
              <input id="ngn-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
            </div>
            {error && (
              <Notice tone="error">
                {error}{" "}
                {config.paystackPage ? (
                  <a className="font-semibold underline" href={config.paystackPage} target="_blank" rel="noopener noreferrer">Use our Paystack giving page instead</a>
                ) : (
                  <>You can still give by <button type="button" className="font-semibold underline" onClick={() => { setMethod("transfer"); setError(""); setState("idle"); }}>bank transfer</button></>
                )}
                .
              </Notice>
            )}
            <button type="submit" disabled={state === "busy"} className={buttonClass("dark", "lg", "w-full")}>
              <CreditCard size={19} aria-hidden /> {state === "busy" ? "Opening Paystack…" : `Pay ₦${final ? final.toLocaleString() : "0"} with Card`}
            </button>
            <p className="text-center text-xs text-muted">Secured by Paystack</p>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">You’ll enter your amount and card details on Paystack’s secure page.</p>
            <a href={config.paystackPage!} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "lg", "w-full")}>
              <CreditCard size={19} aria-hidden /> Give with Paystack <ArrowUpRight size={17} aria-hidden />
              <span className="sr-only"> (opens Paystack in a new tab)</span>
            </a>
          </div>
        )
      ) : (
        <form onSubmit={notifyTransfer} className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-line">
            {[
              { k: "bank", l: "Bank", v: bank.bankName },
              { k: "acct", l: "Account number", v: bank.accountNumber },
              { k: "name", l: "Account name", v: bank.accountName },
            ].map((f) => (
              <div key={f.k} className="flex items-center justify-between gap-4 border-b border-line bg-white px-4 py-3 last:border-b-0">
                <div>
                  <p className="text-xs text-muted">{f.l}</p>
                  <p className="font-bold text-text">{f.v}</p>
                </div>
                <button type="button" onClick={() => copy(f.v, f.k)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-plum hover:bg-ivory" aria-label={`Copy ${f.l}`}>
                  {copied === f.k ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copied === f.k ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-muted">After your transfer, let us know below so we can verify and acknowledge it within 24 hours.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ngn-name" className={label}>Your name</label>
              <input id="ngn-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="ngn-temail" className={label}>Your email</label>
              <input id="ngn-temail" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            </div>
          </div>
          {state === "error" && (
            <Notice tone="error">
              {error}{" "}
              <a className="font-semibold underline" href={mailtoFallback("Naira transfer sent", `Name: ${name}\nEmail: ${email}\nAmount: ₦${final}\nFrequency: ${frequency}\nBank transfer to ${bank.accountName}.`)}>
                Email the ministry instead
              </a>
              .
            </Notice>
          )}
          <button type="submit" disabled={state === "busy"} className={buttonClass("dark", "lg", "w-full")}>
            <Landmark size={18} aria-hidden /> {state === "busy" ? "Sending…" : "I’ve Made the Transfer"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ───────────────────────── Interac (Canada) ───────────────────────── */
function InteracPanel({ to }: { to: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    const err = await recordDonation({
      currency: "CAD",
      amount: Number(amount),
      frequency: "One Time",
      payment_method: "Interac e-Transfer",
      status: "pending",
      reference: `INTERAC-${Date.now()}`,
      donor_email: email,
      donor_name: name,
    });
    setState(err ? "error" : "done");
  };

  if (state === "done") {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 size={52} className="mx-auto text-emerald-600" aria-hidden />
        <h3 className="mt-5 font-headline text-3xl text-text">Thank you, {name.split(" ")[0]}!</h3>
        <p role="status" className="mx-auto mt-3 max-w-sm text-muted">
          Your Interac transfer of <strong>C${amount}</strong> has been noted. We’ll confirm receipt within 24 hours.
        </p>
        <p className="mt-4 text-sm font-semibold text-gold-deep">God bless you — Pastor Amos Unogwu</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-2xl text-text">Interac e-Transfer</h3>
        <p className="mt-1 text-sm text-muted">For Canadian donors — no card needed.</p>
      </div>
      <ol className="space-y-2 rounded-2xl border border-line bg-ivory p-5 text-sm leading-relaxed text-muted [counter-reset:step]">
        <li>1. Open your Canadian bank app and choose <strong className="text-text">Interac e-Transfer → Send Money</strong>.</li>
        <li className="!my-4">
          <span className="block">2. Send to:</span>
          <span className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="flex min-w-0 items-center gap-2 font-bold text-text"><Mail size={16} className="shrink-0 text-gold-deep" aria-hidden /><span className="truncate">{to}</span></span>
            <button
              type="button"
              onClick={async () => { try { await navigator.clipboard.writeText(to); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* manual copy */ } }}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-plum"
              aria-label="Copy e-Transfer email"
            >
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? "Copied" : "Copy"}
            </button>
          </span>
        </li>
        <li>3. In the message / memo field write <span className="rounded bg-white px-1.5 py-0.5 font-mono text-text">HBG Giving</span>.</li>
        <li>4. Complete the transfer, then tell us below so we can acknowledge your gift.</li>
      </ol>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ix-name" className={label}>Your name</label>
            <input id="ix-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="ix-email" className={label}>Your email</label>
            <input id="ix-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label htmlFor="ix-amount" className={label}>Amount sent (C$)</label>
          <input id="ix-amount" required type="number" min="1" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
        </div>
        {state === "error" && (
          <Notice tone="error">
            We couldn’t record your notification.{" "}
            <a className="font-semibold underline" href={mailtoFallback("Interac e-Transfer sent", `Name: ${name}\nEmail: ${email}\nAmount: C$${amount}\nSent to: ${to}`)}>
              Email the ministry instead
            </a>
            .
          </Notice>
        )}
        <button type="submit" disabled={state === "busy"} className={buttonClass("dark", "lg", "w-full")}>
          <Landmark size={18} aria-hidden /> {state === "busy" ? "Sending…" : "I’ve Sent My Transfer"}
        </button>
      </form>
    </div>
  );
}

function SuccessBanner() {
  const params = useSearchParams();
  if (params.get("success") !== "1") return null;
  return (
    <div className="mb-5">
      <Notice tone="ok">
        <strong>Payment received — thank you!</strong> Heaven rejoices over your seed. Stripe has emailed your receipt.
      </Notice>
    </div>
  );
}

export default function GiveClient({
  config,
  bank,
}: {
  config: GivingConfig;
  bank: { bankName: string; accountNumber: string; accountName: string };
}) {
  const tabs: { id: Tab; label: string; Icon: typeof CreditCard }[] = [];
  tabs.push({ id: "card", label: "Card · CAD/USD", Icon: CreditCard });
  tabs.push({ id: "naira", label: "Naira (₦)", Icon: Landmark });
  if (config.interacEmail) tabs.push({ id: "interac", label: "Interac", Icon: Mail });

  const [tab, setTab] = useState<Tab>(config.stripeCheckout || config.stripeLink ? "card" : "naira");

  return (
    <div>
      <Suspense fallback={null}>
        <SuccessBanner />
      </Suspense>
      <div className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_40px_90px_-50px_rgba(27,20,36,0.55)] sm:p-9">
        {tabs.length > 1 && (
          <div role="tablist" aria-label="How would you like to give?" className={cn("mb-8 grid gap-1.5 rounded-2xl bg-ivory p-1.5", tabs.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {tabs.map(({ id, label: l, Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                type="button"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition sm:text-sm",
                  tab === id ? "bg-plum text-white shadow-lg" : "text-muted hover:text-text",
                )}
              >
                <Icon size={15} aria-hidden className="hidden sm:block" /> {l}
              </button>
            ))}
          </div>
        )}
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={tabs.length > 1 ? `tab-${tab}` : undefined}>
          {tab === "card" && (config.stripeCheckout || config.stripeLink ? <StripePanel config={config} /> : (
            <div className="rounded-2xl bg-ivory p-6 text-center">
              <h3 className="font-headline text-2xl text-text">Give in Dollars</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">Card giving in CAD and USD is opening soon. For now, please give in Naira, or reach us through the Connect page and we’ll help you give.</p>
              <a href="/connect?type=Partnership%20Inquiry" className="mt-5 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">Contact Us About Giving</a>
            </div>
          ))}
          {tab === "naira" && <NairaPanel config={config} bank={bank} />}
          {tab === "interac" && config.interacEmail && <InteracPanel to={config.interacEmail} />}
        </div>
      </div>
    </div>
  );
}
