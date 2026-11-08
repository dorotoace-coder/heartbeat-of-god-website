import { Youtube, Instagram } from "lucide-react";
import { SOCIALS } from "@/lib/site";

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

const items = [
  { href: SOCIALS.youtube, label: "YouTube — @HBG_tv", Icon: Youtube },
  { href: SOCIALS.instagram, label: "Instagram — @hbgministries", Icon: Instagram },
  { href: SOCIALS.tiktok, label: "TikTok — @hbgministries", Icon: TikTokIcon },
];

export default function SocialIcons({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex gap-3 ${className}`}>
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-gold/60 hover:text-gold-soft"
          >
            <Icon size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}
