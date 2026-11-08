/**
 * Public, non-secret facts the whole site reads from.
 * Everything here is already published on heartbeatofgod.ca.
 * Do NOT add phone numbers, private emails, keys or IDs to this file —
 * anything private belongs in a Vercel environment variable.
 */

export const SITE_URL = "https://heartbeatofgod.ca";
export const SITE_NAME = "Heartbeat of God Ministry";
export const TAGLINE = "Bringing Men to the Consciousness of God’s Presence";
export const DESCRIPTION =
  "An apostolic ministry committed to raising a generation of Christ-conscious believers globally through the Word and the Spirit.";

export const FOUNDER = "Pastor Amos Unogwu";

/** Public ministry inbox (already published on /connect). */
export const MINISTRY_EMAIL = "heartbeatofgodf@gmail.com";

export const HQ_ADDRESS = [
  "100/102 Akute Road, Martins Bus Stop",
  "opp. Royal Prince Supermarket, Akute, Ogun State",
];

export const SOCIAL_HANDLES = {
  youtube: "@HBG_tv",
  instagram: "@hbgministries",
  tiktok: "@hbgministries",
};

export const SOCIALS = {
  youtube: "https://youtube.com/@HBG_tv",
  youtubeLive: "https://youtube.com/@HBG_tv/live",
  instagram: "https://instagram.com/hbgministries",
  tiktok: "https://tiktok.com/@hbgministries",
};

/**
 * YouTube channel behind @HBG_tv — used for the live-stream embed and the
 * "Latest from HBG TV" feed. Verified Nov 2026 from the public @HBG_tv page
 * ("Heartbeat Of God Foundation"); the previous ID pointed to a channel that
 * no longer exists.
 */
export const YOUTUBE_CHANNEL_ID = "UC2EFyzk--fBYxUUBtPVpyYA";
export const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
export const YOUTUBE_LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`;

/** Public Zoom registration link for online services. */
export const ZOOM_REGISTER_URL = "https://us06web.zoom.us/meeting/register/ISNaNBhoTWWu4PmQiEsyDg";

export const SERVICE_TIMES = [
  { name: "Sunday Celebration Service", day: "Sundays", time: "9:00 AM", note: "Praise, worship, and the Word" },
  { name: "Wednesday Live", day: "Wednesdays", time: "6:00 PM", note: "Join us live online" },
  { name: "Night of Prayer", day: "3rd Friday of each quarter", time: "10:00 PM", note: "All-night intercession and encounter with God" },
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/media", label: "Media" },
  { href: "/departments", label: "Departments" },
  { href: "/feed-the-future", label: "Feed the Future" },
  { href: "/connect", label: "Connect" },
] as const;

/** Optional public contact phone. Set NEXT_PUBLIC_CONTACT_PHONE in Vercel to show it. */
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "";

/**
 * Optional WhatsApp Channel link. Set NEXT_PUBLIC_WHATSAPP_CHANNEL_URL in Vercel
 * to show a "Follow on WhatsApp" button in the Follow HBG block. Empty = hidden.
 */
export const WHATSAPP_CHANNEL_URL = (() => {
  const v = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim() || "";
  return /^https:\/\//.test(v) ? v : "";
})();

/**
 * Calendar day used to decide which Daily Word is "today" (and to hide
 * posts scheduled for a future date). The ministry publishes from Winnipeg.
 */
export const DAILY_WORD_TIMEZONE = "America/Winnipeg";
