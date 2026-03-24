"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Fingerprint, Loader2, Mail, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [success, setSuccess] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    console.log("Initiating auth in mode:", mode, "for:", email);

    try {
      console.log("Submitting auth request...");
      
      // Add a safety timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Uplink timeout: Server not responding.")), 15000)
      );

      if (mode === "signin") {
        const authPromise = supabase.auth.signInWithPassword({ email, password });
        const { data, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (authError) {
          console.error("SignIn Error:", authError);
          if (authError.message.toLowerCase().includes("email not confirmed")) {
            setError("Access Restricted: Identity verification pending. Please check your email inbox to confirm your account.");
          } else {
            setError(authError.message);
          }
          return;
        }

        console.log("SignIn Successful, routing to admin panel...");
        router.push("/admin");
      } else {
        const authPromise = supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: "Admin User" } }
        });
        const { data, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (authError) {
          console.error("SignUp Error:", authError);
          setError(authError.message);
          return;
        }

        console.log("SignUp Successful:", data);
        setSuccess("Success: Identity record created. IMPORTANT: Check your email to CONFIRM your account before signing in.");
        setMode("signin");
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      setError(err.message || "An unexpected error occurred during uplink.");
    } finally {
      setLoading(false);
    }
  };

  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('departments').select('count', { count: 'exact', head: true });
        if (error && error.code !== 'PGRST116') throw error; // Head check might error on empty, that's fine
        setStatus("online");
      } catch (e) {
        console.error("Supabase Connection Check Failed:", e);
        setStatus("offline");
      }
    };
    checkSupabase();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600 rounded-full blur-[150px] animate-[pulse_4s_ease-in-out_infinite]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-400">
            {mode === "signin" ? <Lock size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-3xl font-headline text-white mb-2 tracking-tight">
            {mode === "signin" ? "System Uplink" : "Register Identity"}
          </h1>
          <p className="text-blue-200/60 font-medium">The Pulse OS Terminal Access</p>
        </div>

        <form onSubmit={handleAuth} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-3" htmlFor="email">
                Identity (Email)
              </label>
              <div className="relative">
                <input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="name@example.com"
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-200/50 uppercase tracking-widest mb-3" htmlFor="clearance">
                Access Code (Password)
              </label>
              <div className="relative">
                <input 
                  id="clearance"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono tracking-widest"
                  placeholder="••••••••"
                  required
                />
                <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-3 animate-in fade-in">{error}</p>}
            {success && <p className="text-emerald-400 text-sm mt-3 animate-in fade-in">{success}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Validating...
              </>
            ) : mode === "signin" ? (
              "Initialize Subsystem"
            ) : (
              "Register New Unit"
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-4 text-white/40 hover:text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {mode === "signin" ? (
              <><UserPlus size={14} /> Need a New Access Key? (Sign Up)</>
            ) : (
              <><LogIn size={14} /> Return to Uplink Terminal (Sign In)</>
            )}
          </button>
        </form>
        
        <div className="text-center mt-8 space-y-6">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold">
            <span className="text-white/20">Beacon Status:</span>
            {status === "connecting" && <span className="text-blue-400 animate-pulse">Syncing...</span>}
            {status === "online" && <span className="text-emerald-400">Secure Uplink Online</span>}
            {status === "offline" && <span className="text-red-500">Uplink Offline (Check .env)</span>}
          </div>
          <Link href="/" className="inline-block text-white/40 hover:text-white transition-colors text-sm font-medium">
            ← Return to Public Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}
