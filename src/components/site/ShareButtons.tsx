"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88zm8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z" />
    </svg>
  );
}

const noop = () => () => {};
const canNativeShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * WhatsApp / Facebook / X / copy link, plus the device share sheet where the
 * browser supports it (most phones). `url` should be absolute.
 */
export default function ShareButtons({
  url,
  title,
  text,
  tone = "light",
  className,
}: {
  url: string;
  title: string;
  text?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const native = useSyncExternalStore(noop, canNativeShare, () => false);
  const message = text ? `${title} — ${text}` : title;
  const enc = encodeURIComponent;

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${message} ${url}`)}`, Icon: WhatsAppIcon },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, Icon: FacebookIcon },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(url)}`, Icon: XIcon },
  ];

  const btn = cn(
    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
    tone === "dark"
      ? "border-white/15 text-white/80 hover:border-gold/60 hover:text-gold-soft"
      : "border-line bg-white text-text hover:border-plum/40 hover:text-plum",
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title, text: text ?? title, url });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Share">
      {native && (
        <button type="button" onClick={share} className={cn(btn, tone === "dark" ? "bg-gold text-ink hover:text-ink" : "border-plum bg-plum text-white hover:text-white")}>
          <Share2 size={16} aria-hidden /> Share
        </button>
      )}
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`Share on ${label} (opens in a new tab)`}>
          <Icon /> <span className="hidden sm:inline">{label}</span>
        </a>
      ))}
      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
