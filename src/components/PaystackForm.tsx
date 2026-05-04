"use client";

import { CreditCard, Landmark, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { useState } from "react";

const BANK_DETAILS = {
  bankName: "— (add your bank name)",
  accountNumber: "— (add account number)",
  accountName: "Heartbeat of God Ministry",
  sortCode: "",
};

type PaystackFormProps = {
  config: any;
  currency: string;
  amount: number | null;
  customAmount: string;
  email: string;
  frequency: string;
  paymentMethod: "card" | "bank_transfer";
  loading: boolean;
  step: 1 | 2;
  presets: Record<string, number[]>;
  symbols: Record<string, string>;
  setAmount: (v: number | null) => void;
  setCustomAmount: (v: string) => void;
  setEmail: (v: string) => void;
  setFrequency: (v: string) => void;
  setPaymentMethod: (v: "card" | "bank_transfer") => void;
  setStep: (v: 1 | 2) => void;
  setLoading: (v: boolean) => void;
  handleCurrencyChange: (c: any) => void;
};

function CardPayment({ config, amount, customAmount, email, frequency, symbols, setStep, setLoading }: any) {
  const initializePayment = usePaystackPayment(config);
  const [err, setErr] = useState("");

  const handlePay = () => {
    setErr("");
    if (!email || email === "anonymous@heartbeatofgod.com") {
      setErr("Please enter your email address to continue.");
      return;
    }
    const finalAmount = customAmount ? Number(customAmount) : amount || 0;
    if (finalAmount <= 0) {
      setErr("Please select or enter an amount.");
      return;
    }

    const onSuccess = async (reference: any) => {
      setLoading(true);
      try {
        await supabase.from("donations").insert({
          currency: config.currency || "NGN",
          amount: finalAmount,
          frequency,
          payment_method: "Card",
          status: "completed",
          reference: reference.reference,
          donor_email: email,
        });
      } catch (e) {
        console.error("Supabase record failed:", e);
      } finally {
        setLoading(false);
        setStep(2);
      }
    };

    const onClose = () => {
      console.log("Paystack modal closed");
    };

    initializePayment({ onSuccess, onClose });
  };

  return (
    <div>
      {err && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {err}
        </div>
      )}
      <button
        type="button"
        onClick={handlePay}
        className="w-full py-4 bg-gradient-to-r from-midnight to-midnight-light hover:from-midnight-light hover:to-midnight text-white rounded-xl font-bold text-lg shadow-lg shadow-midnight/30 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <CreditCard size={20} />
        Pay {symbols["NGN"]}{(customAmount || amount || 0).toLocaleString()} with Card
      </button>
    </div>
  );
}

function BankTransfer({ amount, customAmount, email, frequency, symbols, setStep, setLoading }: any) {
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const finalAmount = customAmount ? Number(customAmount) : amount || 0;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleConfirm = async () => {
    if (!email || email === "anonymous@heartbeatofgod.com") {
      alert("Please enter your email address above so we can confirm your transfer.");
      return;
    }
    setConfirmLoading(true);
    try {
      await supabase.from("donations").insert({
        currency: "NGN",
        amount: finalAmount,
        frequency,
        payment_method: "Bank Transfer",
        status: "pending",
        reference: `BANK-${Date.now()}`,
        donor_email: email,
      });
    } catch (e) {
      console.error("Supabase record failed:", e);
    } finally {
      setConfirmLoading(false);
      setConfirmed(true);
    }
  };

  if (confirmed) {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-xl font-bold text-midnight mb-2">Transfer Noted!</h3>
        <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
          We'll confirm your transfer of ₦{finalAmount.toLocaleString()} within 24 hours. God bless you!
        </p>
        <button onClick={() => setConfirmed(false)} className="mt-6 px-6 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-sm font-medium hover:bg-surface-container-highest transition-colors">
          Back
        </button>
      </motion.div>
    );
  }

  const fields = [
    { label: "Bank Name", value: BANK_DETAILS.bankName, key: "bank" },
    { label: "Account Number", value: BANK_DETAILS.accountNumber, key: "acct" },
    { label: "Account Name", value: BANK_DETAILS.accountName, key: "name" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center">
          <Landmark size={18} className="text-sky-dark" />
        </div>
        <div>
          <p className="font-bold text-midnight text-sm">Direct Bank Transfer (NGN)</p>
          <p className="text-xs text-on-surface-variant">Transfer to HBG Ministry account</p>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl divide-y divide-outline-variant/30 mb-5 overflow-hidden border border-outline-variant/20">
        {fields.map(({ label, value, key }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs text-on-surface-variant mb-0.5">{label}</p>
              <p className="font-bold text-midnight text-sm">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(value, key)}
              className="flex items-center gap-1 text-xs text-sky-dark hover:text-sky font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-sky/5"
            >
              {copied === key ? <Check size={13} /> : <Copy size={13} />}
              {copied === key ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>

      {finalAmount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 mb-5 rounded-xl bg-sky/5 border border-sky/20">
          <p className="text-sm text-on-surface-variant">Transfer amount</p>
          <p className="font-black text-midnight text-lg">{symbols["NGN"]}{finalAmount.toLocaleString()}</p>
        </div>
      )}

      <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
        After completing your transfer, click below to notify us. We'll verify and acknowledge within 24 hours.
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirmLoading}
        className="w-full py-4 bg-sky-dark hover:bg-sky text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-sky-dark/20 transition-all active:scale-95 disabled:opacity-70"
      >
        <CheckCircle2 size={18} />
        {confirmLoading ? "Submitting…" : "I've Made the Transfer"}
      </button>
    </div>
  );
}

export default function PaystackForm({
  config, currency, amount, customAmount, email, frequency, loading,
  step, presets, symbols,
  setAmount, setCustomAmount, setEmail, setFrequency,
  setStep, setLoading, handleCurrencyChange,
}: PaystackFormProps) {
  const [activeMethod, setActiveMethod] = useState<"card" | "transfer">("card");
  const hasValidKey = config.publicKey && !config.publicKey.includes("placeholder");

  if (step === 2) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-midnight mb-2">Thank You!</h2>
        <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">
          Your generous seed of {symbols[currency]}{(customAmount || amount || 0).toLocaleString()} has been received. Heaven rejoices!
        </p>
        <button onClick={() => setStep(1)} className="px-8 py-3 bg-surface-container-high text-on-surface-variant font-medium rounded-xl hover:bg-surface-container-highest transition-colors">
          Give Again
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Amount selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-midnight">Choose Amount</h2>
          <span className="text-sm font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-lg">NGN ₦</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {presets["NGN"].map((val: number) => (
            <button
              key={val}
              type="button"
              onClick={() => { setAmount(val); setCustomAmount(""); }}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                amount === val && !customAmount
                  ? "bg-midnight text-white shadow-lg shadow-midnight/30 scale-105"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {symbols["NGN"]}{val.toLocaleString()}
            </button>
          ))}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">{symbols["NGN"]}</span>
            <input
              type="number"
              placeholder="Other"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
              className={`w-full py-4 pl-10 pr-3 rounded-xl font-bold text-lg bg-surface-container-high text-midnight border-2 focus:outline-none transition-all ${customAmount ? "border-sky" : "border-transparent"}`}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Your Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Required for receipt"
          className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50"
        />
      </div>

      {/* Frequency */}
      <div className="flex gap-3 mb-6">
        {["One Time", "Monthly Pledge"].map((f) => (
          <label key={f} className="flex-1 cursor-pointer">
            <input type="radio" name="ngn-freq" value={f} checked={frequency === f} onChange={(e) => setFrequency(e.target.value)} className="peer sr-only" />
            <div className="text-center py-2.5 rounded-xl border-2 border-outline-variant font-medium text-on-surface-variant peer-checked:border-sky peer-checked:text-sky-dark peer-checked:bg-sky/5 transition-all text-sm cursor-pointer">
              {f}
            </div>
          </label>
        ))}
      </div>

      {/* Payment method tabs */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setActiveMethod("card")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${activeMethod === "card" ? "border-midnight bg-midnight text-white" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"}`}
        >
          <CreditCard size={16} /> Card
        </button>
        <button
          type="button"
          onClick={() => setActiveMethod("transfer")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-2 ${activeMethod === "transfer" ? "border-sky-dark bg-sky-dark text-white" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"}`}
        >
          <Landmark size={16} /> Bank Transfer
        </button>
      </div>

      {/* Card method */}
      {activeMethod === "card" && (
        hasValidKey ? (
          <CardPayment
            config={config}
            amount={amount}
            customAmount={customAmount}
            email={email}
            frequency={frequency}
            symbols={symbols}
            setStep={setStep}
            setLoading={setLoading}
          />
        ) : (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold mb-1">Paystack card payments coming soon</p>
              <p className="text-amber-700">Add your Paystack live key to Vercel to activate card payments. In the meantime, use Bank Transfer below.</p>
            </div>
          </div>
        )
      )}

      {/* Bank Transfer method */}
      {activeMethod === "transfer" && (
        <BankTransfer
          amount={amount}
          customAmount={customAmount}
          email={email}
          frequency={frequency}
          symbols={symbols}
          setStep={setStep}
          setLoading={setLoading}
        />
      )}

      <p className="text-center text-xs text-on-surface-variant/50 mt-4">
        {activeMethod === "card" ? "Secured via Paystack · SSL encrypted" : "Direct bank transfer · Manually verified within 24h"}
      </p>
    </div>
  );
}
