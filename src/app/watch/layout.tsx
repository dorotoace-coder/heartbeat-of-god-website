import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Watch Live",
  description: "Watch Heartbeat of God live on YouTube (@HBG_tv) — Sundays 9:00 AM and Wednesdays 6:00 PM — or join us on Zoom.",
  path: "/watch",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
