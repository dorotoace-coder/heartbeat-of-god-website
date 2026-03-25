import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch Live",
  description: "Experience the unfiltered presence of God through Heartbeat Television — our 24/7 broadcast of uplifting music, revelatory teachings, and live encounters.",
};

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
