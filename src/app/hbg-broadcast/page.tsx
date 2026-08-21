"use client";
import { useState } from "react";

const PLATFORMS = [
  { id: "telegram",  label: "Telegram",  icon: "✈️",  color: "#229ED9" },
  { id: "facebook",  label: "Facebook",  icon: "👥",  color: "#1877F2" },
  { id: "instagram", label: "Instagram", icon: "📸",  color: "#E1306C" },
  { id: "twitter",   label: "Twitter/X", icon: "🐦",  color: "#000000" },
  { id: "whatsapp",  label: "WhatsApp",  icon: "💬",  color: "#25D366" },
];

const QUICK_TEMPLATES = [
  {
    label: "MTA 2026 Launch",
    message: `🔥 MTA 2026 — Mighty Turn Around Assembly!\n\n📅 September 4–6, 2026\n📍 HBG Ministry, Akute, Nigeria & Online\n\n"There is a river whose streams make glad the city of God" — Psalm 46:4\n\nJoin us for 3 days of fire, prayer and prophetic power. Registration is FREE.\n\n👉 Register now: mta.heartbeatofgod.ca\n\n#MTA2026 #HBGMinistry #MightyTurnAround`,
    imageUrl: "https://heartbeatofgod.ca/we-wait-mta-campaign.html",
  },
  {
    label: "We Wait — 21 Days Fast",
    message: `🙏 WE WAIT — 21 Days of Fasting & Prayer\n\nAugust 13 – September 2, 2026\n\nHBG Ministry enters a season of corporate consecration, intercession and spiritual sharpening — leading directly into MTA 2026.\n\n⚡ Fast. Pray. Enter your turnaround.\n\nJoin us: mta.heartbeatofgod.ca\n\n#WeWait #MTA2026 #HBGMinistry`,
    imageUrl: "",
  },
  {
    label: "Wednesday Service",
    message: `🔥 WEDNESDAY SERVICE — This Wednesday!\n\nHeartbeat of God Ministry invites you to our Explosive Mid-Week Experience.\n\n⏰ Every Wednesday · 6:00 PM\n📍 HBG Ministry, Akute, Ogun State\n🌐 Also online — heartbeatofgod.ca\n\nCome with a friend!\nHost: Pastor Amos Unogwu\n\n#HBGMinistry #WednesdayService`,
    imageUrl: "",
  },
];

interface BroadcastResult {
  platform: string;
  ok: boolean;
  error?: string;
}

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["telegram", "facebook", "instagram", "twitter", "whatsapp"]);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BroadcastResult[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "partial" | "error">("idle");

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setMessage(t.message);
    if (t.imageUrl) setImageUrl(t.imageUrl);
  };

  const broadcast = async () => {
    if (!message.trim() || !secret.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-broadcast-secret": secret },
        body: JSON.stringify({ message, imageUrl: imageUrl || undefined, platforms: selected }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setStatus(data.success ? "success" : res.status === 207 ? "partial" : "error");
    } catch (e) {
      setStatus("error");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#05000a] text-white font-sans p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black tracking-[.3em] uppercase text-[#C9972A]/60 mb-1">HBG Ministry</p>
          <h1 className="text-3xl font-black text-white">📡 Broadcast Centre</h1>
          <p className="text-white/40 text-sm mt-1">Post to all platforms in one click</p>
        </div>

        {/* Quick Templates */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3">Quick Templates</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map(t => (
              <button key={t.label} onClick={() => applyTemplate(t)}
                className="px-4 py-2 rounded-full text-xs font-bold border border-[#C9972A]/25 text-[#C9972A]/80 hover:bg-[#C9972A]/10 transition-all">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform selector */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                  selected.includes(p.id)
                    ? "text-white border-transparent"
                    : "text-white/30 border-white/10 hover:border-white/20"
                }`}
                style={selected.includes(p.id) ? { background: p.color, borderColor: p.color } : {}}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="mb-4">
          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-2">Message</p>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            rows={6} placeholder="Type your announcement..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#C9972A]/40"/>
          <p className="text-white/20 text-xs mt-1 text-right">{message.length} chars · Twitter max 280</p>
        </div>

        {/* Image URL */}
        <div className="mb-4">
          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-2">Image URL <span className="text-white/20 normal-case">(optional — required for Instagram)</span></p>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://heartbeatofgod.ca/..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9972A]/40"/>
        </div>

        {/* Secret */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-2">Broadcast Key</p>
          <input type="password" value={secret} onChange={e => setSecret(e.target.value)}
            placeholder="Enter your broadcast key"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#C9972A]/40"/>
        </div>

        {/* Send button */}
        <button onClick={broadcast} disabled={loading || !message.trim() || !secret.trim() || !selected.length}
          className="w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all disabled:opacity-30"
          style={{ background: "linear-gradient(135deg, #ff6b2b, #C9972A)", color: "#0d0002",
            boxShadow: loading ? "none" : "0 0 30px rgba(201,151,42,0.35)" }}>
          {loading ? "Broadcasting..." : `🔥 Broadcast to ${selected.length} Platform${selected.length !== 1 ? "s" : ""}`}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-3">Results</p>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                r.ok ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <span className="text-sm font-bold capitalize">{r.platform}</span>
                <span className={`text-xs font-bold ${r.ok ? "text-green-400" : "text-red-400"}`}>
                  {r.ok ? "✅ Posted" : `❌ ${r.error || "Failed"}`}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
