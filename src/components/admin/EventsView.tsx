"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, Plus, MapPin, Clock, Users, ArrowRight, MoreVertical, X, Edit3, Trash2, ChevronDown, Megaphone, Loader2 } from "lucide-react";
import { useAdminRole, canPerformAction } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { generateRecurringEvents, type RecurringEventInstance } from './generateRecurringEvents';
interface EventItem {
  id: string;
  name: string;
  event_date: string;
  location: string;
  description: string | null;
  image_url: string | null;
  is_highlighted: boolean;
  recurrence: 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  end_date: string | null;
}

// ─── Event Action Dropdown ───────────────────────────────
function EventActionDropdown({ onEdit, onDelete }: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role = useAdminRole();
  const canEdit = canPerformAction(role, "events.edit");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!canEdit) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors relative z-10"
      >
        <MoreVertical size={18} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"
          >
            <Edit3 size={14} />
            Edit Event
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={14} />
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Event Modal (Create/Edit) ───────────────────────────
function EventModal({ event, onClose, onSave, saving }: {
  event: EventItem | null;
  onClose: () => void;
  onSave: (data: { name: string; event_date: string; location: string; description: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(event?.name || "");
  const [eventDate, setEventDate] = useState(event?.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "");
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || "");
  const [errors, setErrors] = useState<{ name?: string; event_date?: string }>({});

  const isEdit = !!event;

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Event name is required.";
    if (!eventDate.trim()) newErrors.event_date = "Date is required.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSave({ name: name.trim(), event_date: new Date(eventDate).toISOString(), location: location || "TBD", description: description || "" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isEdit ? "Edit Event" : "Create New Event"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isEdit ? "Update this event's details." : "Schedule a new gathering or service."}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>

        <div className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Event Name</label>
            <input
              type="text" value={name}
              onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
              placeholder="e.g. Sunday Glory Service"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-50 dark:bg-slate-950 ${errors.name ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date &amp; Time</label>
              <input type="datetime-local" value={eventDate}
                onChange={(e) => { setEventDate(e.target.value); setErrors(p => ({ ...p, event_date: undefined })); }}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.event_date ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}
              />
              {errors.event_date && <p className="text-xs text-red-500 mt-1.5">{errors.event_date}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Sanctuary"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of the event..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
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
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Prepare Broadcast</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6">
          {sent ? (
            <div className="text-center py-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">✓</div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Broadcast Queued!</p>
              <p className="text-xs text-slate-400 mt-1">The message will be sent to all active sessions.</p>
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Broadcast Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Enter announcement message..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </>
          )}
        </div>
        {!sent && (
          <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSend} disabled={!message.trim()}
              className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none"
            >Send Broadcast</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────
export function EventsView() {
  const role = useAdminRole();
  const canCreate = canPerformAction(role, "events.create");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Generate recurring instances for the next 12 weeks
      const allEvents = generateRecurringEvents(data || [], 12);

      // Convert back to EventItem format for display
      setEvents(allEvents.map((e: RecurringEventInstance) => ({
        id: e.id,
        name: e.name,
        event_date: e.instance_date.toISOString(),
        location: e.location || '',
        description: e.description,
        image_url: e.image_url,
        is_highlighted: e.is_highlighted,
        recurrence: e.recurrence,
        end_date: e.end_date || null,
      })));
    } catch (err) {
      console.error("Failed to load events:", err);
      showToast("⚠ Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Create / Update ────────────────────────────────────
  const handleSave = async (data: { name: string; event_date: string; location: string; description: string }) => {
    setSaving(true);
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update({ name: data.name, event_date: data.event_date, location: data.location, description: data.description })
          .eq("id", editingEvent.id);
        if (error) throw error;
        showToast(`✓ "${data.name}" updated.`);
      } else {
        const { error } = await supabase
          .from("events")
          .insert({ name: data.name, event_date: data.event_date, location: data.location, description: data.description });
        if (error) throw error;
        showToast(`✓ "${data.name}" created.`);
      }
      setModalOpen(false);
      setEditingEvent(null);
      await fetchEvents();
    } catch (err: any) {
      console.error("Save failed:", err);
      showToast(`⚠ Save failed: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const ev = events.find(e => e.id === id);
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      showToast(`"${ev?.name}" deleted.`);
      await fetchEvents();
    } catch (err: any) {
      console.error("Delete failed:", err);
      showToast(`⚠ Delete failed: ${err.message || "Unknown error"}`);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            Events Engine
          </h1>
          <p className="text-sm text-slate-500">Coordinate gatherings, services, and special ministry events.</p>
        </div>
        {canCreate && (
          <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]">
            <Plus size={18} />
            Create Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Upcoming Schedule</h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-3" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400 font-medium">No events in Supabase.</p>
              <p className="text-xs text-slate-300 mt-1">Create a new event to get started.</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group overflow-hidden relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 relative z-10 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${event.is_highlighted
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600"
                        : new Date(event.event_date) > new Date()
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                        {event.is_highlighted ? "Featured" : new Date(event.event_date) > new Date() ? "Upcoming" : "Past"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{formatDate(event.event_date)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {event.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {formatTime(event.event_date)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        {event.location}
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <EventActionDropdown
                    onEdit={() => { setEditingEvent(event); setModalOpen(true); }}
                    onDelete={() => handleDelete(event.id)}
                  />
                  <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:translate-x-[-10px] group-hover:translate-y-[-10px] transition-transform duration-700">
                    <Calendar size={120} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Live Resonance</h2>
          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-950/20">
            <div className="relative z-10">
              <h3 className="text-xl font-headline italic mb-4">Divine Connectivity</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Next Global Synchronous Event starting in
                <span className="text-blue-400 font-bold ml-2">48 hours</span>.
                All systems are primed for a high-bandwidth spiritual exchange.
              </p>
              <button
                onClick={() => setBroadcastOpen(true)}
                className="flex items-center gap-2 group text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors"
              >
                Prepare Broadcast Module
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full" />
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <EventModal
          event={editingEvent}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {broadcastOpen && <BroadcastModal onClose={() => setBroadcastOpen(false)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
