"use client";
import { useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function PeopleIntake({ onSaved }: { onSaved?: () => void }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submission = useRef<string | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim() || null;
    submission.current ??= crypto.randomUUID();
    setSaving(true);
    try {
      const result = await supabase.from("congregation_people").insert({
        id: submission.current, full_name: value("name"), phone: value("phone"), address: value("address"),
        social_contact: value("social"), first_visit: value("first_visit"), requests_school: data.has("school")
      });
      if (result.error && result.error.code !== "23505") throw result.error;
      form.reset();
      submission.current = null;
      setMessage("Person recorded.");
      onSaved?.();
    } catch { setMessage("Could not confirm the save. Please retry."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="grid gap-4 rounded-2xl bg-white p-6 text-slate-900">
    <h2 className="text-xl font-semibold">Member or first-time visitor</h2>
    <label>Full name<input className="block w-full rounded border p-2" name="name" maxLength={160} required /></label>
    <label>Phone (optional)<input className="block w-full rounded border p-2" name="phone" type="tel" /></label>
    <label>Address (optional)<input className="block w-full rounded border p-2" name="address" /></label>
    <label>Social media contact (optional)<input className="block w-full rounded border p-2" name="social" /></label>
    <label>First visit, if known<input className="block rounded border p-2" name="first_visit" type="date" /></label>
    <label><input name="school" type="checkbox" /> Interested in Foundation School</label>
    <button className="rounded-lg bg-purple-900 px-4 py-3 text-white" disabled={saving}>Save person</button>
    <p role="status">{message}</p>
  </form>;
}
