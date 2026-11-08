import { Youtube, Instagram } from "lucide-react";
import { SOCIALS, SOCIAL_HANDLES, WHATSAPP_CHANNEL_URL } from "@/lib/site";
import { cn } from "@/lib/cn";

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden>
      <path d="M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 7 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.9 9.88zm8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z" />
    </svg>
  );
}

function YouTubeIcon() {
  return <Youtube size={20} aria-hidden />;
}

function InstagramIcon() {
  return <Instagram size={20} aria-hidden />;
}

/**
 * Follow HBG — YouTube, Instagram and TikTok, plus a WhatsApp Channel button
 * only when NEXT_PUBLIC_WHATSAPP_CHANNEL_URL is set.
 */
export default function FollowHBG({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const items = [
    { href: SOCIALS.youtube, label: "YouTube", handle: SOCIAL_HANDLES.youtube, Icon: YouTubeIcon },
    { href: SOCIALS.instagram, label: "Instagram", handle: SOCIAL_HANDLES.instagram, Icon: InstagramIcon },
    { href: SOCIALS.tiktok, label: "TikTok", handle: SOCIAL_HANDLES.tiktok, Icon: TikTokIcon },
    ...(WHATSAPP_CHANNEL_URL
      ? [{ href: WHATSAPP_CHANNEL_URL, label: "WhatsApp", handle: "HBG Channel", Icon: WhatsAppIcon }]
      : []),
  ];

  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", items.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}>
      {items.map(({ href, label, handle, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex items-center gap-4 rounded-2xl border p-4 transition",
              tone === "dark"
                ? "border-white/10 bg-white/[0.04] text-white hover:border-gold/50"
                : "border-line bg-white text-text hover:-translate-y-0.5 hover:border-gold/60",
            )}
          >
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tone === "dark" ? "bg-white/10 text-gold-soft" : "bg-plum text-gold-soft")}>
              <Icon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{label === "WhatsApp" ? "Follow on WhatsApp" : `Follow on ${label}`}</span>
              <span className={cn("block truncate text-sm", tone === "dark" ? "text-white/60" : "text-muted")}>{handle}</span>
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
