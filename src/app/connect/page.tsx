"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function ConnectPage() {
  const [formStep, setFormStep] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [subject, setSubject] = useState("General Inquiry");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStep("sending");
    
    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          full_name: formData.name,
          email: formData.email,
          type: subject,
          message: formData.message
        }]);

      if (error) throw error;
      setFormStep("success");
    } catch (err) {
      console.error('Submission failed:', err);
      setFormStep("error");
      setTimeout(() => setFormStep("idle"), 5000);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-surface">
        <section className="px-8 max-w-7xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <span className="text-sky font-bold text-sm tracking-[0.2em] uppercase mb-4 inline-block">Get In Touch</span>
            <h1 className="font-headline text-5xl md:text-7xl text-midnight mb-8">
              Connect With Us
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Whether you have a testimony, a prayer request, or you're ready to serve in a department, we're here to listen and guide.
            </p>
          </motion.div>
        </section>

        <section className="px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-8"
          >
            <div className="p-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm">
              <h3 className="font-headline text-2xl text-midnight mb-8">Ministry Channels</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-sky uppercase tracking-widest mb-1">Email</p>
                    <p className="text-midnight font-medium">administration@heartbeat.org</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-sky uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-midnight font-medium">+1 (555) 789-0123</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-sky uppercase tracking-widest mb-1">Global Headquarters</p>
                    <p className="text-midnight font-medium leading-relaxed">Divine Grace Plaza, Suite 402<br />Abuja, Nigeria</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-outline-variant/30 text-center">
                 <p className="text-on-surface-variant text-sm italic">
                    "Call to me and I will answer you, and tell you great and unsearchable things you do not know." — Jeremiah 33:3
                 </p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-[3rem] p-10 lg:p-16 border border-outline-variant/30 shadow-xl relative overflow-hidden">
               {/* Success Overlay */}
               <AnimatePresence>
                 {formStep === "success" && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center text-center p-12"
                   >
                     <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-8">
                       <CheckCircle2 size={48} />
                     </div>
                     <h2 className="font-headline text-4xl text-midnight mb-4">Message Received!</h2>
                     <p className="text-on-surface-variant text-lg max-w-md mx-auto mb-10">
                        Thank you for reaching out. A coordinator from the relevant department will review your message and connect with you shortly.
                     </p>
                     <button 
                       onClick={() => setFormStep("idle")}
                       className="px-8 py-3 bg-sky text-white rounded-xl font-bold hover:scale-105 transition-all"
                     >
                       Send Another Message
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>
               {/* Error Overlay */}
               <AnimatePresence>
                 {formStep === "error" && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center text-center p-12"
                   >
                     <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-8">
                       <AlertCircle size={48} />
                     </div>
                     <h2 className="font-headline text-4xl text-midnight mb-4">Oops!</h2>
                     <p className="text-on-surface-variant text-lg max-w-md mx-auto mb-10">
                        Something went wrong while sending your message. Please check your connection or try again later.
                     </p>
                     <button 
                       onClick={() => setFormStep("idle")}
                       className="px-8 py-3 bg-midnight text-white rounded-xl font-bold hover:scale-105 transition-all"
                     >
                       Try Again
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-midnight uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                         required 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                         placeholder="John Doe" 
                         className="w-full bg-surface-container-low border-2 border-transparent focus:border-sky rounded-2xl px-6 py-4 focus:outline-none transition-all" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-midnight uppercase tracking-widest ml-1">Email Address</label>
                       <input 
                         required 
                         type="email" 
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                         placeholder="john@example.com" 
                         className="w-full bg-surface-container-low border-2 border-transparent focus:border-sky rounded-2xl px-6 py-4 focus:outline-none transition-all" 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-midnight uppercase tracking-widest ml-1">Inquiry Type</label>
                    <select 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-sky rounded-2xl px-6 py-4 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option>General Inquiry</option>
                      <option>Prayer Request</option>
                      <option>Testimony Submission</option>
                      <option>Department Application</option>
                      <option>Event Registration</option>
                      <option>Media/Sound Inquiry</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold text-midnight uppercase tracking-widest ml-1">Your Message</label>
                    <textarea 
                      required 
                      rows={6} 
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="How can we help or partner with you?" 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-sky rounded-2xl px-6 py-4 focus:outline-none transition-all resize-none" 
                    />
                 </div>

                 <button 
                   disabled={formStep === "sending"}
                   type="submit" 
                   className="w-full py-5 bg-midnight text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-midnight/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {formStep === "sending" ? (
                     <span className="animate-pulse">Sending Message...</span>
                   ) : (
                     <>
                       <Send size={20} />
                       Send to Ministry
                     </>
                   )}
                 </button>
               </form>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
