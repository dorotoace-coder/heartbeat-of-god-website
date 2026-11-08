import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Programs & Calendar",
  description: "TRIBE X — Throne Room on November 27, 2026, the weekly ministry rhythm and the annual Heartbeat of God ministry calendar.",
  path: "/programs",
  image: { url: "/tribe-x-throne-room.jpg", width: 1080, height: 1350, alt: "TRIBE X — Throne Room flyer" },
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
