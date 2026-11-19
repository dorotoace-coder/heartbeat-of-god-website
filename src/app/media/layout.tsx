import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

const base = pageMetadata({
  title: "Media Archive",
  description: "Explore our digital library of sermons, teachings, and spiritual resources from Pastor Amos Unogwu.",
  path: "/media",
});

// Advertise the sermon podcast feed to podcast apps and browsers.
export const metadata: Metadata = {
  ...base,
  alternates: {
    ...base.alternates,
    types: { "application/rss+xml": [{ url: "/podcast.xml", title: "Heartbeat of God — Sermon Podcast" }] },
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
