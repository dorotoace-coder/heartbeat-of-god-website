"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { cn } from "@/lib/cn";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "hidden" | "idle" | "working" | "on" | "denied" | "error";

/**
 * "Daily Word at 7 AM" notifications toggle. Renders nothing unless the
 * browser supports push AND /api/push/config says push is configured
 * (VAPID keys + Supabase service key set). On iPhone it appears once the
 * site is installed to the Home Screen (iOS 16.4+).
 */
export default function DailyWordPush({ tone = "dark", className }: { tone?: "light" | "dark"; className?: string }) {
  const [state, setState] = useState<State>("hidden");
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = (await fetch("/api/push/config").then((r) => r.json())) as { enabled?: boolean; publicKey?: string | null };
        if (!cfg.enabled || !cfg.publicKey || cancelled) return;
        setKey(cfg.publicKey);
        if (Notification.permission === "denied") return setState("denied");
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "idle");
      } catch {
        /* stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = async () => {
    if (!key) return;
    setState("working");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        throw new Error("save failed");
      }
      setState("on");
    } catch {
      setState("error");
    }
  };

  const unsubscribe = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("error");
    }
  };

  if (state === "hidden") return null;

  const dark = tone === "dark";
  const muted = dark ? "text-white/60" : "text-muted";
  const linkCls = dark ? "text-gold-soft hover:text-gold" : "text-gold-deep hover:text-plum";

  return (
    <div className={cn("text-sm", className)} aria-live="polite">
      {state === "on" ? (
        <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", dark ? "text-gold-soft" : "text-gold-deep")}>
          <Check size={16} aria-hidden /> Daily Word notifications are on (7:00 AM Central).
          <button type="button" onClick={unsubscribe} className={cn("inline-flex items-center gap-1 underline underline-offset-2", muted)}>
            <BellOff size={14} aria-hidden /> Turn off
          </button>
        </p>
      ) : state === "denied" ? (
        <p className={muted}>Notifications are blocked for this site. Allow them in your browser settings to get the Daily Word.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={subscribe}
            disabled={state === "working"}
            className={cn("inline-flex items-center gap-2 font-semibold transition disabled:opacity-60", linkCls)}
          >
            <Bell size={16} aria-hidden /> {state === "working" ? "Turning on…" : "Get the Daily Word at 7 AM"}
          </button>
          {state === "error" && <p role="alert" className={cn("mt-1 text-xs", muted)}>We couldn’t turn on notifications just now.</p>}
        </>
      )}
    </div>
  );
}
