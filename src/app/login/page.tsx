"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Fingerprint, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate network delay
    setTimeout(() => {
      // In a real app, this would be an API call verifying a hash.
      // For this prototype, the password is 'admin'
      if (password === "admin") {
        document.cookie = "hbg_admin_session=authenticated-super-admin; path=/";
        // Artificial delay for an "autonomous system connecting" feel
        setTimeout(() => router.push("/admin"), 1000);
      } else {
        setError("Invalid secure clearance code.");
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[150px] animate-[pulse_4s_ease-in-out_infinite]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-400">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-headline text-white mb-2 tracking-tight">System Uplink</h1>
          <p className="text-blue-200/60 font-medium">Verify credentials to access The Pulse OS</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-3" htmlFor="clearance">
              Master Clearance Code
            </label>
            <div className="relative">
              <input 
                id="clearance"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono tracking-widest"
                placeholder="•••••"
              />
              <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            </div>
            {error && <p className="text-red-400 text-sm mt-3 animate-in fade-in">{error}</p>}
            
            {/* Developer Hint */}
            <p className="text-white/20 text-xs mt-3 italic text-center">Development Mode Pin: admin</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Initiating Uplink...
              </>
            ) : (
              "Initialize Subsystem"
            )}
          </button>
        </form>
        
        <div className="text-center mt-8">
          <Link href="/" className="text-white/40 hover:text-white transition-colors text-sm font-medium">
            ← Return to Public Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
