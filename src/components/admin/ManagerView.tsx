"use client";

import { useState } from "react";
import { Radio, Calendar, Video, Edit, Plus, FileText, Settings, LayoutDashboard, X, ChevronDown } from "lucide-react";
import { PulseState } from "@/lib/pulse";

interface ManagerViewProps {
  pulse: PulseState;
}

// ─── Edit Content Modal ──────────────────────────────────
function EditContentModal({ sermon, onClose, onSave }: {
  sermon: { title: string; preacher: string };
  onClose: () => void;
  onSave: (data: { title: string; preacher: string }) => void;
}) {
  const [title, setTitle] = useState(sermon.title);
  const [preacher, setPreacher] = useState(sermon.preacher);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit Content Rotation</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sermon Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Preacher</label>
            <input type="text" value={preacher} onChange={(e) => setPreacher(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { onSave({ title, preacher }); }} className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── New Event Quick Modal ───────────────────────────────
function QuickEventModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Quick New Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Event Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Community Outreach"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          <p className="text-[11px] text-slate-400 mt-2">You can add full details in the Events Engine after creation.</p>
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { if (name.trim()) onSave(name.trim()); }} disabled={!name.trim()}
            className="px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none">Create Event</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3"><Settings className="text-slate-400" size={22} /><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Operations Settings</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6 space-y-4">
          {[
            { label: "Auto-Rotate Sermons", desc: "Automatically cycle the sermon of the day", checked: true },
            { label: "Email Notifications", desc: "Send weekly digest to department leaders", checked: true },
            { label: "Public Event Page", desc: "Allow visitors to see the events calendar", checked: false },
          ].map((s, i) => (
            <label key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <input type="checkbox" defaultChecked={s.checked} className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{s.label}</p>
                <p className="text-xs text-slate-400">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">Save Settings</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────
export function ManagerView({ pulse }: ManagerViewProps) {
  const [editContentOpen, setEditContentOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Local overrides for displayed sermon data
  const [sermonOverride, setSermonOverride] = useState<{ title: string; preacher: string } | null>(null);
  const currentSermon = sermonOverride || { title: pulse.sermonOfTheDay.title, preacher: pulse.sermonOfTheDay.preacher };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-amber-500 w-8 h-8" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">Operations Management</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSettingsOpen(true)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all flex items-center gap-2">
            <Settings size={18} /> Settings
          </button>
          <button onClick={() => setNewEventOpen(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
            <Plus size={18} /> New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Content Rotation Control */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Video size={20} className="text-blue-500" /> Content Rotation
            </h3>
            <button onClick={() => setEditContentOpen(true)} className="text-sm font-bold text-blue-500 hover:underline">Edit Queue</button>
          </div>
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img src={pulse.sermonOfTheDay.imageUrl} alt="Sermon" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">{currentSermon.title}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Preacher: {currentSermon.preacher}</p>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md">In Rotation</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-md">Auto-Selected</span>
              </div>
            </div>
            <button onClick={() => setEditContentOpen(true)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
              <Edit size={20} />
            </button>
          </div>
        </div>

        {/* Global Event Control */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Radio size={20} className="text-red-500" /> Platform Status
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pulse.isLive ? 'bg-red-500/10 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              {pulse.isLive ? 'Platform is LIVE' : 'Platform Offline'}
            </span>
          </div>
          <div className="space-y-4">
            <div onClick={() => setNewEventOpen(true)} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Major Gathering</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{pulse.nextEventName}</p>
                </div>
              </div>
              <Edit size={16} className="text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Coordination Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
           <FileText size={20} className="text-emerald-500" /> Departmental Updates
        </h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 opacity-50">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
               <Edit size={16} />
            </div>
            <div>
              <p className="text-sm text-slate-800 dark:text-slate-100 font-bold mb-1">Coming Soon: Departmental Coordination</p>
              <p className="text-xs text-slate-500">The Operations Manager will be able to review updates from all Departmental Leaders here.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {editContentOpen && (
        <EditContentModal
          sermon={currentSermon}
          onClose={() => setEditContentOpen(false)}
          onSave={(data) => { setSermonOverride(data); setEditContentOpen(false); showToast("✓ Content rotation updated."); }}
        />
      )}
      {newEventOpen && (
        <QuickEventModal
          onClose={() => setNewEventOpen(false)}
          onSave={(name) => { setNewEventOpen(false); showToast(`✓ "${name}" created. Open Events Engine for full details.`); }}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
