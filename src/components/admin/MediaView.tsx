"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Video, Play, Upload, MoreVertical, Eye, Share2, Trash2, X, Edit3, ChevronDown, Link2, CheckCircle, Loader2 } from "lucide-react";
import { useAdminRole, canPerformAction } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

interface MediaItem {
  id: string;
  title: string;
  preacher: string;
  date_preached: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  category: string;
  video_url: string | null;
  description: string | null;
}

const CATEGORY_OPTIONS = ["General", "Spiritual Growth", "The Holy Spirit", "Evangelism", "Prayer", "Worship", "Teaching", "Testimony"];

// ─── Media Action Dropdown ───────────────────────────────
function MediaActionDropdown({ onEdit, onDelete }: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role = useAdminRole();
  const canEdit = canPerformAction(role, "media.upload");
  const canDel = canPerformAction(role, "media.delete");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!canEdit && !canDel) return (
    <button className="p-1 text-slate-400 cursor-default"><MoreVertical size={16} /></button>
  );

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {canEdit && (
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"
            ><Edit3 size={14} />Edit Details</button>
          )}
          {canDel && (
            <>
              <div className="border-t border-slate-100 dark:border-slate-800" />
              <button onClick={() => { onDelete(); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              ><Trash2 size={14} />Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Upload / Edit Modal ─────────────────────────────────
function MediaModal({ item, onClose, onSave, saving }: {
  item: MediaItem | null;
  onClose: () => void;
  onSave: (data: { title: string; preacher: string; date_preached: string; duration: string; thumbnail_url: string; category: string; description: string }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [preacher, setPreacher] = useState(item?.preacher || "");
  const [datePreached, setDatePreached] = useState(item?.date_preached || "");
  const [duration, setDuration] = useState(item?.duration || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnail_url || "");
  const [category, setCategory] = useState(item?.category || "General");
  const [description, setDescription] = useState(item?.description || "");
  const [errors, setErrors] = useState<{ title?: string; preacher?: string }>({});

  const isEdit = !!item;

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!preacher.trim()) newErrors.preacher = "Preacher name is required.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSave({
      title: title.trim(),
      preacher: preacher.trim(),
      date_preached: datePreached || new Date().toISOString().split("T")[0],
      duration: duration || "0:00",
      thumbnail_url: thumbnailUrl || "https://images.unsplash.com/photo-1544427928-142ec24aa861",
      category,
      description: description || "",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isEdit ? "Edit Content" : "Upload Content"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isEdit ? "Update media details." : "Add a new sermon or recording."}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Title</label>
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })); }} placeholder="e.g. Walking in Divine Authority"
              className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.title ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`} />
            {errors.title && <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Preacher / Speaker</label>
              <input type="text" value={preacher} onChange={(e) => { setPreacher(e.target.value); setErrors(p => ({ ...p, preacher: undefined })); }} placeholder="e.g. Pst. Sarah"
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.preacher ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`} />
              {errors.preacher && <p className="text-xs text-red-500 mt-1.5">{errors.preacher}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date Preached</label>
              <input type="date" value={datePreached} onChange={(e) => setDatePreached(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Duration</label>
              <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 45:12"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Category</label>
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-10">
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Thumbnail URL</label>
            <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief summary..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" />
          </div>
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Popover ───────────────────────────────────────
function SharePopover({ title, onClose }: { title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const fakeLink = `https://hbg.church/watch/${title.toLowerCase().replace(/\s+/g, "-")}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fakeLink).catch(() => {});
    setCopied(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Link2 size={18} className="text-blue-500" />Share Content</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-widest">Shareable Link</p>
        <div className="flex gap-2">
          <input type="text" readOnly value={fakeLink}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 truncate" />
          <button onClick={handleCopy}
            className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${copied ? "bg-emerald-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {copied ? <CheckCircle size={18} /> : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────
export function MediaView() {
  const role = useAdminRole();
  const canUpload = canPerformAction(role, "media.upload");
  const canDelete = canPerformAction(role, "media.delete");

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Fetch from Supabase ────────────────────────────────
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .order("date_preached", { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (err) {
      console.error("Failed to load media:", err);
      showToast("⚠ Failed to load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  // ── Create / Update ────────────────────────────────────
  const handleSave = async (data: { title: string; preacher: string; date_preached: string; duration: string; thumbnail_url: string; category: string; description: string }) => {
    setSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("sermons")
          .update({
            title: data.title,
            preacher: data.preacher,
            date_preached: data.date_preached,
            duration: data.duration,
            thumbnail_url: data.thumbnail_url,
            category: data.category,
            description: data.description,
          })
          .eq("id", editingItem.id);
        if (error) throw error;
        showToast(`✓ "${data.title}" updated.`);
      } else {
        const { error } = await supabase
          .from("sermons")
          .insert({
            title: data.title,
            preacher: data.preacher,
            date_preached: data.date_preached,
            duration: data.duration,
            thumbnail_url: data.thumbnail_url,
            category: data.category,
            description: data.description,
          });
        if (error) throw error;
        showToast(`✓ "${data.title}" uploaded.`);
      }
      setModalOpen(false);
      setEditingItem(null);
      await fetchMedia();
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
      const item = media.find(m => m.id === id);
      const { error } = await supabase.from("sermons").delete().eq("id", id);
      if (error) throw error;
      showToast(`"${item?.title}" deleted.`);
      await fetchMedia();
    } catch (err: any) {
      console.error("Delete failed:", err);
      showToast(`⚠ Delete failed: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
            <Video className="text-blue-600" size={24} />
            Media Vault
          </h1>
          <p className="text-sm text-slate-500">Manage sermons, live streams, and ministry digital assets.</p>
        </div>
        {canUpload && (
          <button onClick={() => { setEditingItem(null); setModalOpen(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]">
            <Upload size={18} />
            Upload Content
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden group hover:shadow-xl transition-all h-full flex flex-col">
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                 <img
                   src={item.thumbnail_url || "https://images.unsplash.com/photo-1544427928-142ec24aa861"}
                   alt={item.title}
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 dark:opacity-40"
                 />
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-[2px]">
                    <button
                      onClick={() => setPlayingItem(item)}
                      className="w-12 h-12 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                       <Play size={20} className="fill-blue-600 ml-1" />
                    </button>
                 </div>
                 {item.duration && (
                   <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded">
                      {item.duration}
                   </div>
                 )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                 <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <MediaActionDropdown
                      onEdit={() => { setEditingItem(item); setModalOpen(true); }}
                      onDelete={() => handleDelete(item.id)}
                    />
                 </div>
                 <p className="text-xs text-slate-500 mb-4">{item.preacher} • {item.date_preached ? new Date(item.date_preached).toLocaleDateString() : "Recent"}</p>
                 <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                       <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button onClick={() => setShareItem(item)} className="hover:text-blue-500 transition-colors"><Share2 size={14} /></button>
                       {canDelete && (
                         <button onClick={() => handleDelete(item.id)} className="hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          ))}

          {canUpload && (
            <button onClick={() => { setEditingItem(null); setModalOpen(true); }} className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-300 dark:text-slate-700 hover:border-blue-400 hover:text-blue-400 transition-all p-12 h-full min-h-[300px]">
               <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                  <Upload size={24} />
               </div>
               <span className="font-bold text-sm tracking-widest uppercase">Add Sermon</span>
            </button>
          )}
        </div>
      )}

      {!loading && media.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-medium">No media in Supabase.</p>
          <p className="text-xs text-slate-300 mt-1">Upload content to populate the public Media page.</p>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <MediaModal
          item={editingItem}
          onClose={() => { setModalOpen(false); setEditingItem(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {shareItem && <SharePopover title={shareItem.title} onClose={() => setShareItem(null)} />}

      {/* Play Preview Modal */}
      {playingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPlayingItem(null)}>
          <div className="bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-slate-800 relative flex items-center justify-center">
              <img src={playingItem.thumbnail_url || "https://images.unsplash.com/photo-1544427928-142ec24aa861"} alt={playingItem.title} className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Play size={48} className="mb-4 opacity-60" />
                <p className="font-bold text-lg">{playingItem.title}</p>
                <p className="text-sm text-slate-400 mt-1">Video playback preview — connect media source to enable</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">{playingItem.preacher}</p>
                <p className="text-xs text-slate-400">{playingItem.date_preached ? new Date(playingItem.date_preached).toLocaleDateString() : "Recent"} • {playingItem.duration || "N/A"}</p>
              </div>
              <button onClick={() => setPlayingItem(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold text-sm transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
