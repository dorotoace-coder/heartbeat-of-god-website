"use client";

import { CreditCard, Landmark, CheckCircle2 } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function PaystackForm({ 
  config, currency, amount, customAmount, email, frequency, paymentMethod, loading, step, presets, symbols,
  setAmount, setCustomAmount, setEmail, setFrequency, setPaymentMethod, setStep, setLoading, handleCurrencyChange
}: any) {
  const initializePayment = usePaystackPayment(config);

  const onSuccess = async (reference: any) => {
    setLoading(true);
    try {
      const finalAmount = customAmount ? Number(customAmount) : amount || 0;
      await supabase.from("donations").insert({
        currency,
        amount: finalAmount,
        frequency,
        payment_method: paymentMethod === 'card' ? 'Card' : 'Bank Transfer',
        status: "completed",
        reference: reference.reference,
      });
      setStep(2);
    } catch (error) {
      console.error("Failed to record donation in Supabase:", error);
      alert("Payment successful, but failed to record internally. Support has been notified.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address so we can send your receipt.");
      return;
    }
    initializePayment({ onSuccess, onClose: () => console.log("Paystack closed") });
  };

  return (
    step === 1 ? (
      <form id="give-form" onSubmit={handlePaymentSubmit}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-midnight">Choose Give Amount</h2>
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as any)}
            className="bg-surface-container-high border-none text-midnight text-sm font-bold rounded-lg py-2 pl-4 pr-8 focus:ring-2 focus:ring-sky cursor-pointer"
          >
            <option value="NGN">NGN (₦)</option>
          </select>
        </div>
        
        {/* Preset Amounts */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {presets[currency].map((val: number) => (
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
              {symbols[currency]}{val.toLocaleString()}
            </button>
          ))}
          
          <div className="relative col-span-2 md:col-span-1">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">{symbols[currency]}</span>
             <input 
               type="number"
               placeholder="Other"
               value={customAmount}
               onChange={(e) => {
                 setCustomAmount(e.target.value);
                 setAmount(null);
               }}
               className={`w-full py-4 pl-8 pr-4 rounded-xl font-bold text-lg bg-surface-container-high text-midnight border-2 focus:outline-none transition-all ${customAmount ? 'border-sky' : 'border-transparent'}`}
             />
          </div>
        </div>
        
        {/* Email */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Required for receipt"
            className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-sky/50" 
          />
        </div>

        {/* Frequency */}
        <div className="flex gap-4 mb-8">
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="frequency" value="One Time" checked={frequency === "One Time"} onChange={(e) => setFrequency(e.target.value)} className="peer sr-only" />
            <div className="text-center py-3 rounded-xl border-2 border-outline-variant font-medium text-on-surface-variant peer-checked:border-sky peer-checked:text-sky-dark peer-checked:bg-sky/5 transition-all">
              One Time
            </div>
          </label>
          <label className="flex-1 cursor-pointer" title="Monthly partnership via Paystack — please contact us to set up your recurring giving plan">
            <input type="radio" name="frequency" value="Monthly Partner" checked={frequency === "Monthly Partner"} onChange={(e) => setFrequency(e.target.value)} className="peer sr-only" />
            <div className="text-center py-3 rounded-xl border-2 border-outline-variant font-medium text-on-surface-variant peer-checked:border-sky peer-checked:text-sky-dark peer-checked:bg-sky/5 transition-all text-sm">
              Monthly Pledge
            </div>
          </label>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="font-bold text-midnight">Complete Your Giving</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              type="submit" 
              disabled={loading}
              onClick={() => setPaymentMethod("card")}
              className="w-full py-4 bg-gradient-to-r from-midnight to-midnight-light hover:from-midnight-light hover:to-midnight text-white rounded-xl font-bold text-lg shadow-lg shadow-midnight/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75 disabled:active:scale-100"
            >
              <CreditCard size={20} /> {loading ? "Processing..." : `Card • ${symbols[currency]}${(customAmount || amount || 0).toLocaleString()}`}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              onClick={() => setPaymentMethod("bank_transfer")}
              className="w-full py-4 bg-sky-dark hover:bg-sky text-white rounded-xl font-bold text-lg shadow-lg shadow-sky-dark/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75 disabled:active:scale-100"
            >
              <Landmark size={20} /> {loading ? "Processing..." : `Transfer • ${symbols[currency]}${(customAmount || amount || 0).toLocaleString()}`}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant/60 mt-4">Safe and secure SSL encrypted transaction via Paystack.</p>
      </form>
    ) : (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-12"
      >
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-midnight mb-2">Thank You!</h2>
        <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">
          Your generous seed of {symbols[currency]}{(customAmount || amount || 0).toLocaleString()} has been received. Heaven rejoices!
        </p>
        <button 
          onClick={() => setStep(1)}
          className="px-8 py-3 bg-surface-container-high text-on-surface-variant font-medium rounded-xl hover:bg-surface-container-highest transition-colors"
        >
          Give Again
        </button>
      </motion.div>
    )
  );
}
