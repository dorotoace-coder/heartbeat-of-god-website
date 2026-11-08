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

export const SOCIALS = {
  youtube: "https://youtube.com/@HBG_tv",
  youtubeLive: "https://youtube.com/@HBG_tv/live",
  instagram: "https://instagram.com/hbgministries",
  tiktok: "https://tiktok.com/@hbgministries",
};

/** YouTube channel behind @HBG_tv — used for the live-stream embed. */
export const YOUTUBE_CHANNEL_ID = "UCwlSi6aHBXj9MHhpWLUfXuA";
export const YOUTUBE_LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`;

/** Public Zoom registration link for online services. */
export const ZOOM_REGISTER_URL = "https://us06web.zoom.us/meeting/register/ISNaNBhoTWWu4PmQiEsyDg";

export const SERVICE_TIMES = [
  { name: "Sunday Celebration Service", day: "Sundays", time: "9:00 AM", note: "Praise, worship, and the Word" },
  { name: "Wednesday Live", day: "Wednesdays", time: "6:00 PM", note: "Join us live online" },
  { name: "Night of Prayer", day: "Fridays", time: "10:00 PM", note: "All-night intercession and encounter with God" },
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
