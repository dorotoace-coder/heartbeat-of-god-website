"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

const bucket = supabase.storage.from("staff-media-vault");
const pageSize = 40;
const directUploadLimit = 6_000_000;
const planFileLimit = 50_000_000;
const linkPageSize = 20;
const driveLink = /^https:\/\/drive\.google\.com\/(file\/d\/[A-Za-z0-9_-]{10,200}(\/(view|preview|edit))?\/?|open)(\?[A-Za-z0-9_=&.%-]*)?$/;
const displayName = (name: string) => name.replace(/^[0-9a-f-]{36}_/, "");
type Caption = { asset_path: string; caption: string; approved_at: string | null };
type Review = { asset_path: string; title: string; purpose: "website" | "youtube" | "archive"; note: string | null; status: "in_review" | "approved" | "archived"; external_url: string | null };
type ReviewDraft = { title: string; purpose: Review["purpose"]; note: string };
const reviewDraft = (name: string): ReviewDraft => ({
  title: displayName(name).replace(/\.[^.]+$/, ""),
  purpose: /\.(mp4|mov|m4v|webm|mp3|m4a|wav)$/i.test(name) ? "youtube" : "website",
  note: "",
});

function resumableEndpoint() {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co");
  if (url.hostname.endsWith(".supabase.co")) url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  return `${url.origin}/storage/v1/upload/resumable`;
}

async function uploadResumable(file: File, path: string, onProgress: (percent: number) => void) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Sign in required");
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: resumableEndpoint(),
      headers: { authorization: `Bearer ${data.session.access_token}` },
      metadata: { bucketName: "staff-media-vault", objectName: path, contentType: file.type, cacheControl: "3600" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onProgress: (uploaded, total) => onProgress(Math.round(uploaded / total * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });
    void upload.findPreviousUploads().then(previous => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(() => upload.start());
  });
}

export default function PrivateMediaVault() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [captions, setCaptions] = useState<Record<string, Caption>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [links, setLinks] = useState<Review[]>([]);
  const [linkPage, setLinkPage] = useState(0);
  const [moreLinks, setMoreLinks] = useState(false);
  const pendingUpload = useRef<{ signature: string; path: string } | null>(null);
  const pendingLink = useRef<{ url: string; path: string } | null>(null);

  useEffect(() => {
    let current = true;
    async function load() {
      const [permission, workspace] = await Promise.all([
        supabase.rpc("can_use_media_vault"), supabase.rpc("staff_workspace"),
      ]);
      if (!current) return;
      setAllowed(permission.data === true && !permission.error);
      setRole(workspace.data ?? "");
      if (permission.error || !permission.data) return;
      const [result, linkRows] = await Promise.all([
        bucket.list("", { limit: pageSize + 1, offset: page * pageSize, sortBy: { column: "name", order: "asc" } }),
        supabase.from("media_asset_reviews").select("asset_path,title,purpose,note,status,external_url")
          .eq("storage_provider", "google_drive").order("submitted_at", { ascending: false })
          .range(linkPage * linkPageSize, linkPage * linkPageSize + linkPageSize),
      ]);
      if (!current) return;
      if (result.error) setStatus("The file list could not be loaded. Please refresh.");
      if (linkRows.error) setStatus("Large video links could not be loaded. Please refresh.");
      const pageNames = (result.data ?? []).slice(0, pageSize).map(file => file.name);
      const pageLinks = (linkRows.data ?? []).slice(0, linkPageSize) as Review[];
      setNames(pageNames);
      setMore((result.data?.length ?? 0) > pageSize);
      setLinks(pageLinks);
      setMoreLinks((linkRows.data?.length ?? 0) > linkPageSize);
      const paths = [...pageNames, ...pageLinks.map(link => link.asset_path)];
      if (paths.length) {
        const [saved, reviewRows] = await Promise.all([
          supabase.from("media_captions").select("asset_path,caption,approved_at").in("asset_path", paths),
          supabase.from("media_asset_reviews").select("asset_path,title,purpose,note,status,external_url").in("asset_path", paths),
        ]);
        if (!current) return;
        if (saved.error || reviewRows.error) setStatus("Media review records could not load. Refresh to retry.");
        else {
          setCaptions(Object.fromEntries(saved.data.map(row => [row.asset_path, row])));
          setDrafts(Object.fromEntries(saved.data.map(row => [row.asset_path, row.caption])));
          setReviews(Object.fromEntries(reviewRows.data.map(row => [row.asset_path, row])));
          setReviewDrafts(Object.fromEntries(paths.map(name => {
            const saved = reviewRows.data.find(row => row.asset_path === name);
            return [name, saved ? { title: saved.title, purpose: saved.purpose, note: saved.note ?? "" } : reviewDraft(name)];
          })));
        }
      }
    }
    void load();
    return () => { current = false; };
  }, [page, linkPage, revision]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("asset");
    if (!(file instanceof File) || !file.size || busy) return;
    if (!/^(image|audio|video)\//.test(file.type)) {
      setStatus("Choose an image, audio recording or video.");
      return;
    }
    if (file.size > planFileLimit) {
      setStatus("Files over 50 MB go in the shared Google Drive folder. Upload it there, then add its link under Large videos.");
      return;
    }
    setBusy(true);
    setStatus("Uploading…");
    setUploadProgress(0);
    try {
      const name = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-160);
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (pendingUpload.current?.signature !== signature) pendingUpload.current = { signature, path: crypto.randomUUID() + "_" + name };
      if (file.size > directUploadLimit && tus.isSupported) {
        await uploadResumable(file, pendingUpload.current.path, setUploadProgress);
      } else {
        const { error } = await bucket.upload(pendingUpload.current.path, file);
        if (error) throw error;
      }
      pendingUpload.current = null;
      form.reset();
      setStatus(file.name + " was saved.");
      setPage(0);
      setRevision(value => value + 1);
    } catch {
      setStatus("Upload paused or failed. Select the same file to retry, and check your connection.");
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function download(name: string) {
    const result = await bucket.createSignedUrl(name, 60, { download: displayName(name) });
    if (result.error) { setStatus("The file could not be opened."); return; }
    window.location.assign(result.data.signedUrl);
  }

  async function draftCaption(name: string) {
    setBusy(true); setStatus("Drafting caption…");
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sign in required");
      const response = await fetch("/api/pulse/media-caption", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ path: name }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.caption !== "string") {
        setStatus(result.error ?? "Caption drafting failed. You can write one manually.");
        return;
      }
      setDrafts(current => ({ ...current, [name]: result.caption }));
      setStatus("AI draft ready. Review and edit it before saving.");
    } catch { setStatus("Caption drafting failed. You can write one manually."); }
    finally { setBusy(false); }
  }

  async function saveCaption(name: string) {
    const caption = (drafts[name] ?? "").trim();
    if (!caption || caption.length > 1200) { setStatus("Enter a caption of up to 1,200 characters."); return; }
    setBusy(true);
    const result = captions[name]
      ? await supabase.from("media_captions").update({ caption }).eq("asset_path", name)
      : await supabase.from("media_captions").insert({ asset_path: name, caption });
    setBusy(false);
    if (result.error) { setStatus("Caption could not be saved. Refresh and try again."); return; }
    setStatus("Caption saved for Pastor review.");
    setRevision(value => value + 1);
  }

  async function approveCaption(name: string) {
    setBusy(true);
    const result = await supabase.rpc("approve_media_caption", { p_path: name });
    setBusy(false);
    setStatus(result.error ? "Caption approval failed. Refresh and try again." : "Caption approved.");
    if (!result.error) setRevision(value => value + 1);
  }

  function editReview(name: string, change: Partial<ReviewDraft>) {
    setReviewDrafts(current => ({ ...current, [name]: { ...(current[name] ?? reviewDraft(name)), ...change } }));
  }

  async function submitReview(name: string) {
    const draft = reviewDrafts[name] ?? reviewDraft(name);
    if (!draft.title.trim() || draft.title.length > 160 || draft.note.length > 1000) {
      setStatus("Check the review title and note length."); return;
    }
    setBusy(true);
    const linked = reviews[name]?.external_url;
    const result = linked
      ? await supabase.rpc("submit_media_link", {
          p_path: name, p_url: linked, p_title: draft.title.trim(), p_purpose: draft.purpose, p_note: draft.note.trim(),
        })
      : await supabase.rpc("submit_media_asset", {
          p_path: name, p_title: draft.title.trim(), p_purpose: draft.purpose, p_note: draft.note.trim(),
        });
    setBusy(false);
    setStatus(result.error ? "The item could not be submitted. Refresh and try again." : "Saved in the Pastor review queue.");
    if (!result.error) setRevision(value => value + 1);
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const url = String(data.get("url") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
    const purpose = String(data.get("purpose") ?? "youtube") as Review["purpose"];
    const note = String(data.get("note") ?? "").trim();
    if (!driveLink.test(url) || (url.includes("/open") && !/[?&]id=[A-Za-z0-9_-]{10,200}(&|$)/.test(url))) {
      setStatus("Paste the link to one video file from Google Drive (Share, then Copy link)."); return;
    }
    if (!title || title.length > 160 || note.length > 1000) { setStatus("Enter a title, and keep the note under 1,000 characters."); return; }
    if (pendingLink.current?.url !== url) pendingLink.current = { url, path: "drive/" + crypto.randomUUID() };
    setBusy(true);
    const result = await supabase.rpc("submit_media_link", {
      p_path: pendingLink.current.path, p_url: url, p_title: title, p_purpose: purpose, p_note: note,
    });
    setBusy(false);
    if (result.error) {
      setStatus(/already in the vault/.test(result.error.message) ? "That Drive video is already listed below." :
        "The link could not be saved. Check it is a Google Drive file link and try again.");
      return;
    }
    pendingLink.current = null;
    form.reset();
    setStatus(`${title} was added to the Pastor review queue. Add a caption when it is ready.`);
    setLinkPage(0);
    setRevision(value => value + 1);
  }

  function reviewPanel(name: string) {
    const draft = reviewDrafts[name] ?? reviewDraft(name);
    const locked = busy || !!reviews[name] && reviews[name].status !== "in_review";
    return <div className="grid gap-2 rounded-xl bg-purple-50 p-3">
      <label className="text-sm font-semibold" htmlFor={`caption-${name}`}>Caption draft</label>
      <textarea id={`caption-${name}`} className="min-h-24 rounded-lg border bg-white p-3" maxLength={1200} value={drafts[name] ?? ""}
        onChange={event => setDrafts(current => ({ ...current, [name]: event.target.value }))} />
      <div className="flex flex-wrap gap-2">
        {/\.(jpe?g|png|webp)$/i.test(name) && <button disabled={busy} className="rounded-lg border border-purple-900 px-3 py-2 text-purple-900 disabled:opacity-50" onClick={() => void draftCaption(name)}>Suggest from image</button>}
        <button disabled={busy || !(drafts[name] ?? "").trim()} className="rounded-lg bg-purple-900 px-3 py-2 text-white disabled:opacity-50" onClick={() => void saveCaption(name)}>Save draft</button>
        {role === "pastor" && captions[name] && !captions[name].approved_at && <button disabled={busy || drafts[name]?.trim() !== captions[name].caption} className="rounded-lg border border-purple-900 px-3 py-2 text-purple-900 disabled:opacity-50" onClick={() => void approveCaption(name)}>Approve saved caption</button>}
      </div>
      <p className="text-xs">AI suggestions are unpublished drafts. Check names, dates, consent and Scripture before approval.</p>
      <div className="mt-3 grid gap-2 border-t border-purple-200 pt-3">
        <h3 className="font-semibold">Review and destination</h3>
        <label>Title<input className="w-full rounded-lg border bg-white p-2" maxLength={160} value={draft.title} onChange={event => editReview(name, { title: event.target.value })} disabled={locked} /></label>
        <label>Intended use<select className="w-full rounded-lg border bg-white p-2" value={draft.purpose} onChange={event => editReview(name, { purpose: event.target.value as Review["purpose"] })} disabled={locked}>
          <option value="website">Website candidate</option><option value="youtube">YouTube candidate</option><option value="archive">Private archive only</option>
        </select></label>
        <label>Context for the Pastor<textarea className="min-h-20 w-full rounded-lg border bg-white p-2" maxLength={1000} value={draft.note} onChange={event => editReview(name, { note: event.target.value })} disabled={locked} /></label>
        {(!reviews[name] || reviews[name].status === "in_review") && <button disabled={busy} className="rounded-lg border border-purple-900 px-3 py-2 text-purple-900 disabled:opacity-50" onClick={() => void submitReview(name)}>{reviews[name] ? "Save review details" : "Submit for Pastor review"}</button>}
        {role === "pastor" && reviews[name]?.status === "in_review" && <div className="flex flex-wrap gap-2">
          {reviews[name].purpose !== "archive" && <button disabled={busy || !captions[name]?.approved_at} className="rounded-lg bg-purple-900 px-3 py-2 text-white disabled:opacity-50" onClick={() => void reviewAsset(name, "approve")}>Approve for {reviews[name].purpose}</button>}
          <button disabled={busy} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => void reviewAsset(name, "archive")}>Move to private archive</button>
        </div>}
        {role === "pastor" && reviews[name] && reviews[name].status !== "in_review" && <button disabled={busy} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => void reviewAsset(name, "reopen")}>Reopen review</button>}
        <p className="text-xs text-slate-600">Approval prepares a file for the chosen destination. Publication and YouTube upload are separate Pastor actions.</p>
      </div>
    </div>;
  }

  const reviewBadge = (name: string) => <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-900">{reviews[name]?.status === "approved" ? `Approved for ${reviews[name].purpose}` : reviews[name]?.status === "archived" ? "Private archive" : reviews[name] ? "Pastor review queue" : "Not submitted"}</span>;
  const panelToggle = (name: string) => <button className="text-sm font-semibold text-purple-900 underline" onClick={() => setOpen(open === name ? null : name)}>{open === name ? "Close caption" : "Caption and review"}</button>;

  async function reviewAsset(name: string, action: "approve" | "archive" | "reopen") {
    setBusy(true);
    const result = await supabase.rpc("review_media_asset", { p_path: name, p_action: action });
    setBusy(false);
    setStatus(result.error ? "The review could not be completed. Check the saved caption and retry." :
      action === "approve" ? "Approved for the chosen destination. No file was published automatically." :
      action === "archive" ? "Moved to the private archive." : "Returned to the review queue.");
    if (!result.error) setRevision(value => value + 1);
  }

  if (allowed === null) return <p role="status">Opening Media Vault…</p>;
  if (!allowed) return <p>Media Vault access is restricted to assigned staff.</p>;
  return <section className="space-y-5 rounded-2xl bg-white p-6 text-slate-900">
    <h2 className="text-2xl font-semibold">Private Media Vault</h2>
    <p className="text-sm text-slate-600">Private images, audio and video up to 50 MB per file. Larger videos go in the shared Google Drive folder and are added under Large videos. Uploads above 6 MB can resume after a connection interruption.</p>
    <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 gap-2">Image, video or audio
        <input className="max-w-full" name="asset" type="file" accept="image/*,video/*,audio/*" required />
      </label>
      <button disabled={busy} className="rounded-lg bg-purple-900 px-4 py-2 text-white">Upload file</button>
    </form>
    {uploadProgress !== null && <progress className="w-full accent-purple-900" max={100} value={uploadProgress} aria-label="Media upload progress">{uploadProgress}%</progress>}
    <p role="status">{status}</p>
    <ul className="divide-y">{names.map(name => <li key={name} className="space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="break-all text-left text-purple-900 underline" onClick={() => download(name)}>Download {displayName(name)}</button>
        {reviewBadge(name)}
      </div>
      {panelToggle(name)}
      {open === name && reviewPanel(name)}
    </li>)}</ul>
    {!names.length && !status && <p>No files in this vault yet.</p>}
    <div className="flex gap-4">
      {page > 0 && <button onClick={() => setPage(page - 1)}>Previous files</button>}
      {more && <button onClick={() => setPage(page + 1)}>More files</button>}
    </div>

    <div className="space-y-4 border-t pt-5">
      <h2 className="text-xl font-semibold">Large videos</h2>
      <p className="text-sm text-slate-600">For raw videos over 50 MB. Upload the video to the shared Google Drive folder, then use Share, Copy link and paste it here. Only people the folder is shared with can open it. Move originals to the archive drive once edited.</p>
      <form onSubmit={addLink} className="grid gap-3 rounded-xl bg-purple-50 p-3">
        <label className="grid gap-1">Google Drive link<input className="w-full rounded-lg border bg-white p-2" name="url" type="url" inputMode="url" maxLength={500} placeholder="https://drive.google.com/file/d/…" required /></label>
        <label className="grid gap-1">Title<input className="w-full rounded-lg border bg-white p-2" name="title" maxLength={160} required /></label>
        <label className="grid gap-1">Intended use<select className="w-full rounded-lg border bg-white p-2" name="purpose" defaultValue="youtube">
          <option value="website">Website candidate</option><option value="youtube">YouTube candidate</option><option value="archive">Private archive only</option>
        </select></label>
        <label className="grid gap-1">Context for the Pastor<textarea className="min-h-20 w-full rounded-lg border bg-white p-2" name="note" maxLength={1000} /></label>
        <button disabled={busy} className="justify-self-start rounded-lg bg-purple-900 px-4 py-2 text-white disabled:opacity-50">Add large video</button>
      </form>
      <ul className="divide-y">{links.map(link => <li key={link.asset_path} className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {link.external_url && <a className="break-all text-purple-900 underline" href={link.external_url} target="_blank" rel="noopener noreferrer">Open {link.title} in Google Drive</a>}
          {reviewBadge(link.asset_path)}
        </div>
        {panelToggle(link.asset_path)}
        {open === link.asset_path && reviewPanel(link.asset_path)}
      </li>)}</ul>
      {!links.length && <p>No large videos linked yet.</p>}
      <div className="flex gap-4">
        {linkPage > 0 && <button onClick={() => setLinkPage(linkPage - 1)}>Newer videos</button>}
        {moreLinks && <button onClick={() => setLinkPage(linkPage + 1)}>Older videos</button>}
      </div>
    </div>
  </section>;
}
