"use client";

import { useState } from "react";
import { Activity, Users, Banknote, Calendar, ShieldCheck, Megaphone, Globe, X, CheckCircle } from "lucide-react";
import { PulseState } from "@/lib/pulse";

interface PastorViewProps {
  pulse: PulseState;
}

// ─── Broadcast Modal ─────────────────────────────────────
function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Megaphone className="text-blue-500" size={22} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Broadcast Update</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6">
          {sent ? (
            <div className="text-center py-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Broadcast Sent!</p>
              <p className="text-xs text-slate-400 mt-1">The update has been queued for all active sessions.</p>
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Enter your broadcast message..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" />
            </>
          )}
        </div>
        {!sent && (
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSend} disabled={!message.trim()}
              className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none">
              Send Broadcast
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Heatmap Modal ───────────────────────────────────────
function HeatmapModal({ onClose, activeUsers }: { onClose: () => void; activeUsers: number }) {
  const regions = [
    { name: "North America", pct: 42, users: Math.round(activeUsers * 0.42) },
    { name: "Africa", pct: 28, users: Math.round(activeUsers * 0.28) },
    { name: "Europe", pct: 15, users: Math.round(activeUsers * 0.15) },
    { name: "Asia", pct: 10, users: Math.round(activeUsers * 0.10) },
    { name: "South America", pct: 5, users: Math.round(activeUsers * 0.05) },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Globe className="text-blue-500" size={22} />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Global Heatmap</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6 space-y-4">
          {regions.map((r) => (
            <div key={r.name} className="flex items-center gap-4">
              <div className="w-28 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{r.name}</div>
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${r.pct}%` }} />
              </div>
              <div className="w-20 text-right text-xs font-bold text-slate-500">{r.users.toLocaleString()} ({r.pct}%)</div>
            </div>
          ))}
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <p className="text-xs text-slate-400">Total: <span className="font-bold text-slate-700 dark:text-slate-200">{activeUsers.toLocaleString()}</span> active users</p>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────
export function PastorView({ pulse }: PastorViewProps) {
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="text-blue-500 w-8 h-8" />
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">Pastor&apos;s Oversight</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Global Congregation</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-baseline gap-2">
            {pulse.globalMetrics.activeUsers.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Banknote size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Ministry Giving (Weekly)</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-baseline gap-2">
            ${pulse.globalMetrics.totalGivingThisWeek.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Next Major Gathering</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 truncate text-sm">
            {pulse.nextEventName}
          </h3>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Activity size={160} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Platform Resonance</h2>
          <p className="text-slate-400 mb-6 leading-relaxed">
            The Ministry&apos;s digital presence is currently reaching across the globe. System Health is
            <span className="text-emerald-400 font-bold ml-1">OPTIMAL</span>. The autonomous content engine is
            serving the &quot;Sermon of the Day&quot; to all active sessions.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setBroadcastOpen(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all hover:scale-[1.02]">Broadcast Update</button>
            <button onClick={() => setHeatmapOpen(true)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all border border-slate-700 hover:scale-[1.02]">View Global Heatmap</button>
          </div>
        </div>
      </div>

      {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} />}
      {heatmapOpen && <HeatmapModal onClose={() => setHeatmapOpen(false)} activeUsers={pulse.globalMetrics.activeUsers} />}
    </div>
  );
}
