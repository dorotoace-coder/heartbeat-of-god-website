"use client";

import { useState, useEffect, useCallback } from "react";
import { Inbox, Phone, Mail, Lock, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Inquiry } from "@/lib/types";

const FILTERS = ["All", "Prayer Request", "First-Timer Card", "General Inquiry", "Testimony Submission", "Department Application", "Event Registration", "Media/Sound Inquiry"];
const STATUSES: Inquiry["status"][] = ["pending", "reviewed", "contacted"];

const STATUS_STYLES: Record<Inquiry["status"], string> = {
  pending: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  reviewed: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  contacted: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
};

export function InquiriesView() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInquiries((data as Inquiry[]) || []);
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  const updateStatus = async (id: string, status: Inquiry["status"]) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) console.error("Failed to update status:", error);
  };

  const visible = filter === "All" ? inquiries : inquiries.filter((i) => i.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
          <Inbox className="text-blue-600" size={24} />
          Intake Inbox
        </h1>
        <p className="text-sm text-slate-500">Prayer requests, first-timer cards, and connect form submissions.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-medium">No submissions in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((inq) => (
            <div key={inq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {inq.type}
                    </span>
                    {inq.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {inq.category}
                      </span>
                    )}
                    {inq.confidential && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-white">
                        <Lock size={10} /> Confidential
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(inq.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{inq.full_name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Mail size={12} />{inq.email}</span>
                    {inq.phone && <span className="flex items-center gap-1.5"><Phone size={12} />{inq.phone}</span>}
                    {inq.area && <span>Area: {inq.area}</span>}
                    {inq.visit_type && <span>Visit: {inq.visit_type}</span>}
                    {inq.invited_by && <span>Invited by: {inq.invited_by}</span>}
                  </div>
                  {(inq.message || inq.prayer_need) && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {inq.message || inq.prayer_need}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={inq.status}
                    onChange={(e) => updateStatus(inq.id, e.target.value as Inquiry["status"])}
                    className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer focus:outline-none ${STATUS_STYLES[inq.status]}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
