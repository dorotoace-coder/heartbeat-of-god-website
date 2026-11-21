"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const bucket = supabase.storage.from("staff-media-vault");
const pageSize = 40;
const displayName = (name: string) => name.replace(/^[0-9a-f-]{36}_/, "");

export default function PrivateMediaVault() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let current = true;
    async function load() {
      const permission = await supabase.rpc("can_use_media_vault");
      if (!current) return;
      setAllowed(permission.data === true && !permission.error);
      if (permission.error || !permission.data) return;
      const result = await bucket.list("", {
        limit: pageSize + 1, offset: page * pageSize, sortBy: { column: "name", order: "asc" },
      });
      if (!current) return;
      if (result.error) setStatus("The file list could not be loaded. Please refresh.");
      setNames((result.data ?? []).slice(0, pageSize).map(file => file.name));
      setMore((result.data?.length ?? 0) > pageSize);
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
    setBusy(true);
    setStatus("Uploading…");
    try {
      const name = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-160);
      const { error } = await bucket.upload(crypto.randomUUID() + "_" + name, file);
      if (error) throw error;
      form.reset();
      setStatus(file.name + " was saved.");
      setPage(0);
      setRevision(value => value + 1);
    } catch {
      setStatus("Upload failed. Check the file size and your connection, then try again.");
    } finally {
      setBusy(false);
    }
  }

  async function download(name: string) {
    const result = await bucket.createSignedUrl(name, 60, { download: displayName(name) });
    if (result.error) { setStatus("The file could not be opened."); return; }
    window.location.assign(result.data.signedUrl);
  }

  if (allowed === null) return <p role="status">Opening Media Vault…</p>;
  if (!allowed) return <p>Media Vault access is restricted to assigned staff.</p>;
  return <section className="space-y-5 rounded-2xl bg-white p-6 text-slate-900">
    <h2 className="text-2xl font-semibold">Private Media Vault</h2>
    <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 gap-2">Image, video or audio
        <input className="max-w-full" name="asset" type="file" accept="image/*,video/*,audio/*" required />
      </label>
      <button disabled={busy} className="rounded-lg bg-purple-900 px-4 py-2 text-white">Upload file</button>
    </form>
    <p role="status">{status}</p>
    <ul className="divide-y">{names.map(name => <li key={name} className="py-2">
      <button className="break-all text-left text-purple-900 underline" onClick={() => download(name)}>Download {displayName(name)}</button>
    </li>)}</ul>
    {!names.length && !status && <p>No files in this vault yet.</p>}
    <div className="flex gap-4">
      {page > 0 && <button onClick={() => setPage(page - 1)}>Previous files</button>}
      {more && <button onClick={() => setPage(page + 1)}>More files</button>}
    </div>
  </section>;
}
