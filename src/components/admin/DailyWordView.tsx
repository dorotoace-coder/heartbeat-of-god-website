"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, Edit3, Trash2, Eye, EyeOff, ExternalLink, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminRole, canPerformAction } from "@/lib/permissions";
import { dailyWordSlug, formatPublishDate, slugify, todayISO, type DailyWord } from "@/lib/dailyWord";

type FormState = {
  id: string | null;
  publish_date: string;
  title: string;
  slug: string;
  slugTouched: boolean;
  scripture_ref: string;
  scripture_text: string;
  devotional: string;
  image_url: string;
  youtube_url: string;
  instagram_url: string;
  tiktok_url: string;
  published: boolean;
};

const empty = (): FormState => ({
  id: null,
  publish_date: todayISO(),
  title: "",
  slug: "",
  slugTouched: false,
  scripture_ref: "",
  scripture_text: "",
  devotional: "",
  image_url: "",
  youtube_url: "",
  instagram_url: "",
  tiktok_url: "",
  published: false,
});

const URL_FIELDS = ["image_url", "youtube_url", "instagram_url", "tiktok_url"] as const;

const input =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40";
const label = "block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5";

export function DailyWordView() {
  const role = useAdminRole();
  const canEdit = canPerformAction(role, "dailyword.edit");
  const canDelete = canPerformAction(role, "dailyword.delete");

  const [rows, setRows] = useState<DailyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_words")
      .select("*")
      .order("publish_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      setLoadError(
        error.code === "42P01" || /daily_words/.test(error.message)
          ? "The daily_words table does not exist yet. Run src/lib/schema.sql in the Supabase SQL editor."
          : error.message,
      );
    } else {
      setLoadError(null);
      setRows((data as DailyWord[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [k]: v };
      if ((k === "title" || k === "publish_date") && !f.slugTouched) {
        next.slug = dailyWordSlug(next.publish_date, next.title);
      }
      return next;
    });

  const edit = (w: DailyWord) => {
    setFormError(null);
    setForm({
      id: w.id,
      publish_date: w.publish_date,
      title: w.title,
      slug: w.slug,
      slugTouched: true,
      scripture_ref: w.scripture_ref,
      scripture_text: w.scripture_text,
      devotional: w.devotional ?? "",
      image_url: w.image_url ?? "",
      youtube_url: w.youtube_url ?? "",
      instagram_url: w.instagram_url ?? "",
      tiktok_url: w.tiktok_url ?? "",
      published: w.published,
    });
  };

  const save = async (publish: boolean) => {
    if (!form) return;
    setFormError(null);
    const slug = slugify(form.slug) || dailyWordSlug(form.publish_date, form.title);
    if (!form.title.trim() || !form.scripture_ref.trim() || !form.scripture_text.trim() || !form.publish_date) {
      setFormError("Date, title, scripture reference and scripture text are required.");
      return;
    }
    for (const k of URL_FIELDS) {
      const v = form[k].trim();
      if (v && !/^https:\/\/\S+$/.test(v)) {
        setFormError(`${k.replace("_url", "").replace("_", " ")} link must start with https://`);
        return;
      }
    }
    const payload = {
      slug,
      publish_date: form.publish_date,
      title: form.title.trim(),
      scripture_ref: form.scripture_ref.trim(),
      scripture_text: form.scripture_text.trim(),
      devotional: form.devotional.trim(),
      image_url: form.image_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      tiktok_url: form.tiktok_url.trim() || null,
      published: publish,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from("daily_words").update(payload).eq("id", form.id)
      : await supabase.from("daily_words").insert(payload);
    setSaving(false);
    if (error) {
      setFormError(
        error.code === "23505"
          ? "That slug is already used by another Daily Word. Change the title or the slug."
          : error.code === "42501"
            ? "Your account is not allowed to save Daily Words (manager, pastor or owner role required)."
            : error.message,
      );
      return;
    }
    setForm(null);
    await load();
  };

  const togglePublish = async (w: DailyWord) => {
    const { error } = await supabase.from("daily_words").update({ published: !w.published }).eq("id", w.id);
    if (error) alert(error.message);
    await load();
  };

  const remove = async (w: DailyWord) => {
    if (!confirm(`Delete “${w.title}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("daily_words").delete().eq("id", w.id);
    if (error) alert(error.message);
    await load();
  };

  const today = todayISO();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
            <BookOpen className="text-blue-600" size={24} /> Daily Word
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Published posts appear at /daily-word. Today’s published post replaces the home page Word of the Day (refreshes within the hour).
          </p>
        </div>
        {canEdit && !form && (
          <button
            onClick={() => { setFormError(null); setForm(empty()); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} /> New Daily Word
          </button>
        )}
      </div>

      {form && (
        <form
          onSubmit={(e) => { e.preventDefault(); save(form.published); }}
          className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{form.id ? "Edit Daily Word" : "New Daily Word"}</h3>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close form">
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div>
              <label className={label} htmlFor="dw-date">Publish date</label>
              <input id="dw-date" type="date" required className={input} value={form.publish_date} onChange={(e) => set("publish_date", e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="dw-title">Title</label>
              <input id="dw-title" required className={input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Be Still and Know" />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="dw-slug">Slug (auto from date + title)</label>
            <div className="flex gap-2">
              <input
                id="dw-slug"
                className={`${input} font-mono`}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"), slugTouched: true })}
              />
              {form.slugTouched && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, slugTouched: false, slug: dailyWordSlug(form.publish_date, form.title) })}
                  className="whitespace-nowrap rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">/daily-word/{form.slug || "…"}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div>
              <label className={label} htmlFor="dw-ref">Scripture reference</label>
              <input id="dw-ref" required className={input} value={form.scripture_ref} onChange={(e) => set("scripture_ref", e.target.value)} placeholder="Psalm 46:10" />
            </div>
            <div>
              <label className={label} htmlFor="dw-text">Scripture text (KJV)</label>
              <textarea id="dw-text" required rows={3} className={input} value={form.scripture_text} onChange={(e) => set("scripture_text", e.target.value)} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="dw-dev">Devotional (markdown: blank line = new paragraph, ## heading, &gt; quote, - list, **bold**, *italic*)</label>
            <textarea id="dw-dev" rows={12} className={input} value={form.devotional} onChange={(e) => set("devotional", e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["image_url", "Image URL (optional)"],
              ["youtube_url", "YouTube link (optional)"],
              ["instagram_url", "Instagram link (optional)"],
              ["tiktok_url", "TikTok link (optional)"],
            ] as const).map(([k, l]) => (
              <div key={k}>
                <label className={label} htmlFor={`dw-${k}`}>{l}</label>
                <input id={`dw-${k}`} type="url" inputMode="url" className={input} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://" />
              </div>
            ))}
          </div>

          {formError && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-medium text-red-600">{formError}</p>}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <button type="button" disabled={saving} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} {form.id && form.published ? "Save (published)" : "Save & publish"}
            </button>
            <button type="button" disabled={saving} onClick={() => save(false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
              <EyeOff size={16} /> {form.id && form.published ? "Unpublish & save as draft" : "Save as draft"}
            </button>
            {form.publish_date > today && (
              <span className="text-xs text-slate-500">Scheduled: shows publicly from {formatPublishDate(form.publish_date, "short")} if published.</span>
            )}
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : loadError ? (
          <p className="p-8 text-sm text-red-600">{loadError}</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-slate-400">No Daily Words yet. The public archive shows “first Daily Word coming soon” until one is published.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((w) => {
              const scheduled = w.published && w.publish_date > today;
              return (
                <li key={w.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">{formatPublishDate(w.publish_date, "short")}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        scheduled
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                          : w.published
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}>
                        {scheduled ? "Scheduled" : w.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-slate-800 dark:text-slate-100">{w.title}</p>
                    <p className="truncate text-xs text-slate-500">{w.scripture_ref} · /daily-word/{w.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {w.published && !scheduled && (
                      <a href={`/daily-word/${w.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="View">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {canEdit && (
                      <>
                        <button onClick={() => togglePublish(w)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title={w.published ? "Unpublish" : "Publish"}>
                          {w.published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => edit(w)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20" title="Edit">
                          <Edit3 size={16} />
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button onClick={() => remove(w)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
