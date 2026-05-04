"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, CheckCircle2, CreditCard, Landmark, Mail } from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const PaystackForm = dynamic(() => import("@/components/PaystackForm"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky" />
    </div>
  ),
});

type GatewayTab = "paystack" | "stripe" | "interac";
type Currency = "NGN" | "CAD" | "USD" | "EUR";

const PRESETS: Record<Currency, number[]> = {
  NGN: [5000, 10000, 25000, 50000, 100000],
  CAD: [25, 50, 100, 250, 500],
  USD: [25, 50, 100, 250, 500],
  EUR: [25, 50, 100, 250, 500],
};
const SYMBOLS: Record<Currency, string> = { NGN: "₦", CAD: "C$", USD: "$", EUR: "€" };

export default function GivePage() {
  const [mounted, setMounted] = useState(false);
  const [gateway, setGateway] = useState<GatewayTab>("paystack");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("One Time");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Interac form state
  const [interacName, setInteracName] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [interacAmount, setInteracAmount] = useState("");
  const [interacSent, setInteracSent] = useState(false);
  const [interacLoading, setInteracLoading] = useState(false);

  // Stripe state
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeEmail, setStripeEmail] = useState("");
  const [stripeAmount, setStripeAmount] = useState<number | null>(50);
  const [stripeCustom, setStripeCustom] = useState("");
  const [stripeCurrency, setStripeCurrency] = useState<"CAD" | "USD" | "EUR">("CAD");
  const [stripeFrequency, setStripeFrequency] = useState("One Time");

  // URL success param
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "1") setShowSuccess(true);
    }
  }, []);

  // Paystack config
  const paystackConfig = {
    reference: Date.now().toString(),
    email: email || "anonymous@heartbeatofgod.com",
    amount: (customAmount ? Number(customAmount) : amount || 0) * 100,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
    currency: "NGN",
  };

  const handleStripePay = async () => {
    const finalAmount = stripeCustom ? Number(stripeCustom) : stripeAmount || 0;
    if (!stripeEmail || finalAmount <= 0) {
      alert("Please enter your email and an amount.");
      return;
    }
    setStripeLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          currency: stripeCurrency,
          email: stripeEmail,
          frequency: stripeFrequency,
          label: stripeFrequency === "Monthly Partner" ? "Monthly Kingdom Partner" : "Kingdom Offering",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Stripe checkout failed. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleInteracNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setInteracLoading(true);
    try {
      await supabase.from("donations").insert({
        currency: "CAD",
        amount: Number(interacAmount),
        frequency: "One Time",
        payment_method: "Interac e-Transfer",
        status: "pending",
        reference: `INTERAC-${Date.now()}`,
        donor_email: interacEmail,
        donor_name: interacName,
      });
    } catch { /* silent — still show confirmation */ }
    setInteracSent(true);
    setInteracLoading(false);
  };

  const tabClass = (t: GatewayTab) =>
    `flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
      gateway === t
        ? "bg-midnight text-white shadow-lg"
        : "text-on-surface-variant hover:bg-surface-container-high"
    }`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-4 sm:px-8 bg-surface relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-sky/8 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-midnight/5 blur-[120px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3" />

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          {/* Left — messaging */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-sky/10 text-sky-dark rounded-full text-xs font-bold tracking-widest uppercase w-max">
              <Heart size={14} className="fill-sky text-sky" /> Kingdom Partnership
            </span>
            <h1 className="font-headline text-5xl md:text-6xl text-midnight mb-6 leading-[1.1]">
              Sow into the <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-dark to-sky italic">Movement</span>
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
              Your giving enables us to take the message of God's presence to the ends of the earth. Thank you for partnering with the heartbeat of God.
            </p>
            <div className="space-y-5">
              {[
                { title: "Global Outreach", body: "Funding crusades, media broadcasts, and international missions." },
                { title: "Community Upliftment", body: "Empowering local communities through welfare and education initiatives." },
                { title: "ILPC 2026", body: "Supporting the International Leaders & Pastors Conference — June 5–7, Akute, Nigeria." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-sky/10 flex items-center justify-center text-sky shrink-0 mt-0.5">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-midnight">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — payment panel */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3"
                >
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                  <p className="text-emerald-700 font-semibold text-sm">Payment received — thank you! Heaven rejoices over your seed.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white shadow-2xl rounded-3xl p-6 sm:p-8 border border-outline-variant/30">
              {/* Gateway tabs */}
              <div className="flex gap-2 p-1.5 bg-surface-container-low rounded-2xl mb-8">
                <button onClick={() => { setGateway("paystack"); setCurrency("NGN"); }} className={tabClass("paystack")}>
                  <span className="text-base">🇳🇬</span> Naira
                </button>
                <button onClick={() => { setGateway("stripe"); setStripeCurrency("CAD"); }} className={tabClass("stripe")}>
                  <CreditCard size={15} /> Card (CAD/USD)
                </button>
                <button onClick={() => setGateway("interac")} className={tabClass("interac")}>
                  <span className="text-base">🍁</span> Interac
                </button>
              </div>

              {/* ── PAYSTACK (NGN) ── */}
              {gateway === "paystack" && mounted && (
                <PaystackForm
                  config={paystackConfig}
                  currency={currency}
                  amount={amount}
                  customAmount={customAmount}
                  email={email}
                  frequency={frequency}
                  paymentMethod={paymentMethod}
                  loading={loading}
                  step={step}
                  presets={PRESETS}
                  symbols={SYMBOLS}
                  setAmount={setAmount}
                  setCustomAmount={setCustomAmount}
                  setEmail={setEmail}
                  setFrequency={setFrequency}
                  setPaymentMethod={setPaymentMethod}
                  setStep={setStep}
                  setLoading={setLoading}
                  handleCurrencyChange={(c: Currency) => {
                    setCurrency(c);
                    setAmount(PRESETS[c][1]);
                    setCustomAmount("");
                  }}
                />
              )}

              {/* ── STRIPE (CAD / USD / EUR) ── */}
              {gateway === "stripe" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-midnight">Give by Card</h2>
                    <select
                      value={stripeCurrency}
                      onChange={(e) => {
                        setStripeCurrency(e.target.value as "CAD" | "USD" | "EUR");
                        setStripeAmount(PRESETS[e.target.value as Currency][1]);
                        setStripeCustom("");
                      }}
                      className="bg-surface-container-high border-none text-midnight text-sm font-bold rounded-lg py-2 pl-4 pr-8 focus:ring-2 focus:ring-sky cursor-pointer"
                    >
                      <option value="CAD">CAD (C$)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  {/* Preset amounts */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {PRESETS[stripeCurrency].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setStripeAmount(val); setStripeCustom(""); }}
                        className={`py-3.5 rounded-xl font-bold text-base transition-all ${
                          stripeAmount === val && !stripeCustom
                            ? "bg-midnight text-white shadow-lg scale-105"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                        }`}
                      >
                        {SYMBOLS[stripeCurrency]}{val}
                      </button>
                    ))}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">{SYMBOLS[stripeCurrency]}</span>
                      <input
                        type="number"
                        placeholder="Other"
                        value={stripeCustom}
                        onChange={(e) => { setStripeCustom(e.target.value); setStripeAmount(null); }}
                        className={`w-full py-3.5 pl-7 pr-3 rounded-xl font-bold text-base bg-surface-container-high text-midnight border-2 focus:outline-none transition-all ${stripeCustom ? "border-sky" : "border-transparent"}`}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Email for Receipt</label>
                    <input
                      type="email"
                      value={stripeEmail}
                      onChange={(e) => setStripeEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50"
                    />
                  </div>

                  {/* Frequency */}
                  <div className="flex gap-3 mb-7">
                    {["One Time", "Monthly Partner"].map((f) => (
                      <label key={f} className="flex-1 cursor-pointer">
                        <input type="radio" name="stripe-freq" value={f} checked={stripeFrequency === f} onChange={(e) => setStripeFrequency(e.target.value)} className="peer sr-only" />
                        <div className="text-center py-3 rounded-xl border-2 border-outline-variant font-medium text-on-surface-variant peer-checked:border-sky peer-checked:text-sky-dark peer-checked:bg-sky/5 transition-all text-sm">
                          {f}
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleStripePay}
                    disabled={stripeLoading}
                    className="w-full py-4 bg-gradient-to-r from-midnight to-midnight-light text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-midnight/30 transition-all active:scale-95 disabled:opacity-70"
                  >
                    <CreditCard size={20} />
                    {stripeLoading ? "Redirecting…" : `Pay ${SYMBOLS[stripeCurrency]}${(stripeCustom || stripeAmount || 0).toLocaleString()} ${stripeFrequency === "Monthly Partner" ? "/ mo" : ""}`}
                  </button>
                  <p className="text-center text-xs text-on-surface-variant/50 mt-3">Secure checkout via Stripe · Receipt sent automatically</p>
                </div>
              )}

              {/* ── INTERAC (Canada) ── */}
              {gateway === "interac" && (
                <div>
                  {!interacSent ? (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl">🍁</div>
                        <div>
                          <h2 className="text-xl font-bold text-midnight">Interac e-Transfer</h2>
                          <p className="text-xs text-on-surface-variant">For Canadian donors — no card needed</p>
                        </div>
                      </div>

                      {/* Transfer instructions */}
                      <div className="bg-sky/5 border border-sky/20 rounded-2xl p-5 mb-6 space-y-3">
                        <p className="text-xs font-bold text-sky-dark uppercase tracking-widest mb-2">How to send</p>
                        <div className="space-y-2 text-sm text-on-surface-variant">
                          <p>1. Open your Canadian bank app</p>
                          <p>2. Go to <strong className="text-midnight">Interac e-Transfer → Send Money</strong></p>
                          <p>3. Send to:</p>
                        </div>
                        <div className="bg-white border border-outline-variant rounded-xl px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-on-surface-variant mb-0.5">Transfer to this email</p>
                            <p className="font-bold text-midnight text-sm">heartbeatofgodf@gmail.com</p>
                          </div>
                          <Mail size={18} className="text-sky shrink-0" />
                        </div>
                        <div className="space-y-2 text-sm text-on-surface-variant">
                          <p>4. In the <strong className="text-midnight">Message / Memo</strong> field write: <span className="font-mono bg-surface-container px-1 rounded">HBG Giving</span></p>
                          <p>5. Complete your transfer, then fill the form below so we can acknowledge your gift.</p>
                        </div>
                      </div>

                      <form onSubmit={handleInteracNotify} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Your Name</label>
                          <input required value={interacName} onChange={(e) => setInteracName(e.target.value)} placeholder="Full name" className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Your Email</label>
                          <input required type="email" value={interacEmail} onChange={(e) => setInteracEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Amount Sent (C$)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">C$</span>
                            <input required type="number" min="1" value={interacAmount} onChange={(e) => setInteracAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50" />
                          </div>
                        </div>
                        <button type="submit" disabled={interacLoading} className="w-full py-4 bg-gradient-to-r from-midnight to-midnight-light text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-midnight/30 transition-all active:scale-95 disabled:opacity-70">
                          <Landmark size={18} />
                          {interacLoading ? "Submitting…" : "I've Sent My Transfer"}
                        </button>
                      </form>
                    </>
                  ) : (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-500">
                        <CheckCircle2 size={40} />
                      </div>
                      <h2 className="text-2xl font-bold text-midnight mb-2">Thank You, {interacName}!</h2>
                      <p className="text-on-surface-variant text-sm max-w-sm mx-auto mb-2">
                        Your Interac transfer of <strong>C${interacAmount}</strong> has been noted. We'll confirm receipt within 24 hours.
                      </p>
                      <p className="text-sky-dark text-xs font-semibold">God bless you — Pastor Amos Unogwu</p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
