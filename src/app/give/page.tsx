"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Heart, CreditCard, Landmark, CheckCircle2 } from "lucide-react";

export default function GivePage() {
  const [currency, setCurrency] = useState<"NGN" | "USD" | "CAD" | "EUR" | "HZ">("NGN");
  const [amount, setAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

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

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary-container/20 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-container/10 blur-[120px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          
          {/* Left: Messaging */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold tracking-widest uppercase w-max">
              <Heart size={14} className="fill-blue-500 text-blue-500" /> Kingdom Partnership
            </span>
            <h1 className="font-headline text-5xl md:text-6xl text-slate-900 dark:text-white mb-6 leading-[1.1]">
              Sow into the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 italic">Movement</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              Your giving enables us to take the message of God's presence to the ends of the earth. Thank you for partnering with the heartbeat of God.
            </p>
            
            <div className="space-y-6">
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-amber-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Global Outreach</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Funding crusades, media broadcasts, and international missions.</p>
                  </div>
               </div>
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-amber-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Community Upliftment</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Empowering local communities through welfare and education initiatives.</p>
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
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-8 border border-slate-100 dark:border-slate-800">
              
              {step === 1 ? (
                <form onSubmit={handleSimulatePayment}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Choose Give Amount</h2>
                    <select 
                      value={currency} 
                      onChange={(e) => handleCurrencyChange(e.target.value as any)}
                      className="bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 text-sm font-bold rounded-lg py-2 pl-4 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="HZ">HZ (1k ₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  
                  {/* Preset Amounts */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {presets[currency].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => { setAmount(val); setCustomAmount(""); }}
                        className={`py-4 rounded-xl font-bold text-lg transition-all ${
                          amount === val && !customAmount
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {symbols[currency]}{val.toLocaleString()}
                      </button>
                    ))}
                    
                    <div className="relative col-span-2 md:col-span-1">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{symbols[currency]}</span>
                       <input 
                         type="number"
                         placeholder="Other"
                         value={customAmount}
                         onChange={(e) => {
                           setCustomAmount(e.target.value);
                           setAmount(null);
                         }}
                         className={`w-full py-4 pl-8 pr-4 rounded-xl font-bold text-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-2 focus:outline-none transition-all ${customAmount ? 'border-blue-500' : 'border-transparent'}`}
                       />
                    </div>
                  </div>
                  
                  {/* Frequency */}
                  <div className="flex gap-4 mb-8">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="frequency" className="peer sr-only" defaultChecked />
                      <div className="text-center py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-400 peer-checked:border-blue-500 peer-checked:text-blue-600 dark:peer-checked:text-blue-400 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all">
                        One Time
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="frequency" className="peer sr-only" />
                      <div className="text-center py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-400 peer-checked:border-blue-500 peer-checked:text-blue-600 dark:peer-checked:text-blue-400 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all">
                        Monthly Partner
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4 mb-8">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-slate-700 dark:text-slate-300 font-medium">
                        <CreditCard size={20} /> Card
                      </button>
                      <button type="button" className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-slate-700 dark:text-slate-300 font-medium">
                        <Landmark size={20} /> Bank Transfer
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Heart size={20} /> Give {symbols[currency]}{(customAmount || amount || 0).toLocaleString()}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-4">Safe and secure SSL encrypted transaction.</p>
                </form>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Thank You!</h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                    Your generous seed of {symbols[currency]}{(customAmount || amount || 0).toLocaleString()} has been received. Heaven rejoices!
                  </p>
                  <button 
                    onClick={() => setStep(1)}
                    className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Give Again
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
