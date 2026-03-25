"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Heart, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import with no SSR to prevent "window is not defined" because react-paystack
// touches the window object upon module evaluation.
const PaystackForm = dynamic(() => import("@/components/PaystackForm"), { 
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky"></div>
    </div>
  )
});

export default function GivePage() {
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState<"NGN" | "USD" | "CAD" | "EUR" | "HZ">("NGN");
  const [amount, setAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("One Time");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">("card");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const presets = {
    NGN: [5000, 10000, 25000, 50000, 100000],
    HZ: [5, 10, 25, 50, 100],
    USD: [50, 100, 250, 500, 1000],
    CAD: [50, 100, 250, 500, 1000],
    EUR: [50, 100, 250, 500, 1000],
  };

  const symbols = {
    NGN: "₦",
    HZ: "Hz ",
    USD: "$",
    CAD: "C$",
    EUR: "€",
  };

  const handleCurrencyChange = (curr: "NGN" | "USD" | "CAD" | "EUR" | "HZ") => {
    setCurrency(curr);
    setAmount(presets[curr][1]); // Default to the second preset
    setCustomAmount("");
  };

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email || "anonymous@heartbeatofgod.com",
    amount: (customAmount ? Number(customAmount) : amount || 0) * 100, // Paystack uses kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY !== "pk_test_placeholder" 
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY 
      : "pk_test_1234567890abcdef1234567890abcdef12345678",
    currency: currency === "HZ" ? "NGN" : currency,
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-8 flex items-center justify-center bg-surface relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-sky/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-midnight/5 blur-[120px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          
          {/* Left: Messaging */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-sky/10 text-sky-dark rounded-full text-xs font-bold tracking-widest uppercase w-max">
              <Heart size={14} className="fill-sky text-sky" /> Kingdom Partnership
            </span>
            <h1 className="font-headline text-5xl md:text-6xl text-midnight mb-6 leading-[1.1]">
              Sow into the <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-dark to-sky italic">Movement</span>
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
              Your giving enables us to take the message of God's presence to the ends of the earth. Thank you for partnering with the heartbeat of God.
            </p>
            
            <div className="space-y-6">
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-sky/10 flex items-center justify-center text-sky shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-midnight">Global Outreach</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Funding crusades, media broadcasts, and international missions.</p>
                  </div>
               </div>
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-sky/10 flex items-center justify-center text-sky shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-midnight">Community Upliftment</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Empowering local communities through welfare and education initiatives.</p>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Right: Donation Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white shadow-2xl rounded-3xl p-8 border border-outline-variant/30">
              {mounted ? (
                <PaystackForm 
                  config={config} 
                  currency={currency} 
                  amount={amount}
                  customAmount={customAmount}
                  email={email}
                  frequency={frequency}
                  paymentMethod={paymentMethod}
                  loading={loading}
                  step={step}
                  presets={presets}
                  symbols={symbols}
                  setAmount={setAmount}
                  setCustomAmount={setCustomAmount}
                  setEmail={setEmail}
                  setFrequency={setFrequency}
                  setPaymentMethod={setPaymentMethod}
                  setStep={setStep}
                  setLoading={setLoading}
                  handleCurrencyChange={handleCurrencyChange}
                />
              ) : (
                <div className="h-[500px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky"></div>
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
