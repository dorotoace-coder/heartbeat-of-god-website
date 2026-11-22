"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabase";

const bucket = supabase.storage.from("staff-media-vault");
const pageSize = 40;
const directUploadLimit = 6_000_000;
const planFileLimit = 50_000_000;
const displayName = (name: string) => name.replace(/^[0-9a-f-]{36}_/, "");
type Caption = { asset_path: string; caption: string; approved_at: string | null };

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
  const [open, setOpen] = useState<string | null>(null);
  const pendingUpload = useRef<{ signature: string; path: string } | null>(null);

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
      const result = await bucket.list("", {
        limit: pageSize + 1, offset: page * pageSize, sortBy: { column: "name", order: "asc" },
      });
      if (!current) return;
      if (result.error) setStatus("The file list could not be loaded. Please refresh.");
      const pageNames = (result.data ?? []).slice(0, pageSize).map(file => file.name);
      setNames(pageNames);
      setMore((result.data?.length ?? 0) > pageSize);
      if (pageNames.length) {
        const saved = await supabase.from("media_captions").select("asset_path,caption,approved_at").in("asset_path", pageNames);
        if (!current) return;
        if (saved.error) setStatus("Captions could not load. Refresh to retry.");
        else {
          setCaptions(Object.fromEntries(saved.data.map(row => [row.asset_path, row])));
          setDrafts(Object.fromEntries(saved.data.map(row => [row.asset_path, row.caption])));
        }
      }
    }
    void load();
    return () => { current = false; };
  }, [page, revision]);

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
      setStatus("This storage plan accepts files up to 50 MB. Keep the original footage and ask the Pastor for a large-file handoff.");
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

  if (allowed === null) return <p role="status">Opening Media Vault…</p>;
  if (!allowed) return <p>Media Vault access is restricted to assigned staff.</p>;
  return <section className="space-y-5 rounded-2xl bg-white p-6 text-slate-900">
    <h2 className="text-2xl font-semibold">Private Media Vault</h2>
    <p className="text-sm text-slate-600">Private images, audio and video up to 50 MB per file. Larger files need a separate handoff. Uploads above 6 MB can resume after a connection interruption.</p>
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
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-900">{captions[name]?.approved_at ? "Caption approved" : captions[name] ? "Caption awaiting review" : "Uncaptioned"}</span>
      </div>
      <button className="text-sm font-semibold text-purple-900 underline" onClick={() => setOpen(open === name ? null : name)}>{open === name ? "Close caption" : "Caption and review"}</button>
      {open === name && <div className="grid gap-2 rounded-xl bg-purple-50 p-3">
        <label className="text-sm font-semibold" htmlFor={`caption-${name}`}>Caption draft</label>
        <textarea id={`caption-${name}`} className="min-h-24 rounded-lg border bg-white p-3" maxLength={1200} value={drafts[name] ?? ""}
          onChange={event => setDrafts(current => ({ ...current, [name]: event.target.value }))} />
        <div className="flex flex-wrap gap-2">
          {/\.(jpe?g|png|webp)$/i.test(name) && <button disabled={busy} className="rounded-lg border border-purple-900 px-3 py-2 text-purple-900 disabled:opacity-50" onClick={() => void draftCaption(name)}>Suggest from image</button>}
          <button disabled={busy || !(drafts[name] ?? "").trim()} className="rounded-lg bg-purple-900 px-3 py-2 text-white disabled:opacity-50" onClick={() => void saveCaption(name)}>Save draft</button>
          {role === "pastor" && captions[name] && !captions[name].approved_at && <button disabled={busy || drafts[name]?.trim() !== captions[name].caption} className="rounded-lg border border-purple-900 px-3 py-2 text-purple-900 disabled:opacity-50" onClick={() => void approveCaption(name)}>Approve saved caption</button>}
        </div>
        <p className="text-xs">AI suggestions are unpublished drafts. Check names, dates, consent and Scripture before approval.</p>
      </div>}
    </li>)}</ul>
    {!names.length && !status && <p>No files in this vault yet.</p>}
    <div className="flex gap-4">
      {page > 0 && <button onClick={() => setPage(page - 1)}>Previous files</button>}
      {more && <button onClick={() => setPage(page + 1)}>More files</button>}
    </div>
  </section>;
}
