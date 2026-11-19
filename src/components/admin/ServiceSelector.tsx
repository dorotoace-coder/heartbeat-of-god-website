"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PulseService = { id: string; title: string; service_date: string; service_time: string };

export default function ServiceSelector({ value, onChange, exclude, label = "Service" }: {
  value: PulseService | null;
  onChange: (service: PulseService | null) => void;
  exclude?: (service: PulseService) => boolean;
  label?: string;
}) {
  const [services, setServices] = useState<PulseService[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    async function load() {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", dateStyle: "short" }).format();
      const result = await supabase.from("pulse_services").select("id,title,service_date,service_time")
        .lte("service_date", today)
        .order("service_date", { ascending: false }).order("service_time", { ascending: false }).limit(60);
      if (disposed) return;
      if (result.error) setError(true);
      else setServices(result.data);
    }
    void load();
    return () => { disposed = true; };
  }, []);

  if (error) return <p role="alert">The service list could not load. Refresh to try again.</p>;
  if (services === null) return <p role="status">Loading services…</p>;
  const choices = exclude ? services.filter((service) => !exclude(service)) : services;
  if (!choices.length) return <p role="status">No services are scheduled yet. Contact your service lead.</p>;

  return (
    <label className="col-span-full block text-sm font-semibold">
      {label}
      <select required value={value?.id ?? ""} onChange={(event) =>
        onChange(choices.find((service) => service.id === event.target.value) ?? null)}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-950">
        <option value="">Choose an Akute service</option>
        {choices.map((service) => <option key={service.id} value={service.id}>
          {service.service_date} · {service.service_time.slice(0, 5)} WAT · {service.title}
        </option>)}
      </select>
    </label>
  );
}
