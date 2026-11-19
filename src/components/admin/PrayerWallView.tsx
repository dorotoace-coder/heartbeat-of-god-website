"use client";

import { useState, useEffect, useCallback } from "react";
import { HandHeart, Check, EyeOff, Trash2, Globe, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRAYER_WALL_TABLE, type PrayerWallAdminEntry } from "@/lib/prayerWall";
import { useAdminRole, canPerformAction } from "@/lib/permissions";

const FILTERS = ["Pending", "Approved", "Private", "All"] as const;
type Filter = (typeof FILTERS)[number];

export function PrayerWallView() {
  const role = useAdminRole();
  const canModerate = canPerformAction(role, "prayerwall.moderate");
  const canDelete = canPerformAction(role, "prayerwall.delete");
  const [entries, setEntries] = useState<PrayerWallAdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState<Filter>("Pending");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(PRAYER_WALL_TABLE)
      .select("id,created_at,kind,name,message,prayed_count,share_publicly,approved,approved_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load prayer wall:", error);
      // 42P01 / PGRST205: the table hasn't been created yet.
      setMissing(error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message));
      setEntries([]);
    } else {
      setMissing(false);
      setEntries((data as PrayerWallAdminEntry[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEntries, 0);
    return () => clearTimeout(t);
  }, [fetchEntries]);

  const setApproved = async (id: string, approved: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const patch = approved
      ? { approved: true, approved_at: new Date().toISOString(), approved_by: session?.user.id ?? null }
      : { approved: false, approved_at: null, approved_by: null };
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, approved, approved_at: patch.approved_at } : e)));
    const { error } = await supabase.from(PRAYER_WALL_TABLE).update(patch).eq("id", id);
    if (error) {
      console.error("Failed to update entry:", error);
      fetchEntries();
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this entry permanently?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from(PRAYER_WALL_TABLE).delete().eq("id", id);
    if (error) {
      console.error("Failed to delete entry:", error);
      fetchEntries();
    }
  };

  const visible = entries.filter((e) => {
    if (filter === "Pending") return e.share_publicly && !e.approved;
    if (filter === "Approved") return e.approved;
    if (filter === "Private") return !e.share_publicly;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
          <HandHeart className="text-blue-600" size={24} />
          Prayer Wall
        </h1>
        <p className="text-sm text-slate-500">
          Prayer requests and testimonies from /prayer-wall. Nothing is public until you approve it, and only entries the visitor chose to share can be approved.
        </p>
      </div>

      {missing && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            The prayer wall table hasn’t been created yet. Run <code className="font-mono">supabase/migrations-pending/prayer_wall.sql</code> in Supabase to turn it on.
          </p>
        </div>
      )}

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
          <p className="text-slate-400 font-medium">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((e) => (
            <div key={e.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {e.kind === "testimony" ? "Testimony" : "Prayer request"}
                    </span>
                    {e.share_publicly ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                        <Globe size={10} /> Wants it shared
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-white">
                        <Lock size={10} /> Private
                      </span>
                    )}
                    {e.approved && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                        Live on wall
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {e.prayed_count > 0 && <span className="text-xs text-slate-400">· {e.prayed_count} prayed</span>}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{e.name || "Anonymous"}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{e.message}</p>
                </div>

                <div className="flex items-center gap-2">
                  {canModerate && e.share_publicly && !e.approved && (
                    <button
                      onClick={() => setApproved(e.id, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Check size={14} /> Approve
                    </button>
                  )}
                  {canModerate && e.approved && (
                    <button
                      onClick={() => setApproved(e.id, false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <EyeOff size={14} /> Unpublish
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => remove(e.id)}
                      aria-label="Delete entry"
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
