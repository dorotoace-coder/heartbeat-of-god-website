import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Prayer Wall & Testimonies",
  socialTitle: "Prayer Wall | Heartbeat of God",
  description:
    "Share a prayer request or a testimony with Heartbeat of God Ministry. Our team prays over every request; shared entries appear after review.",
  path: "/prayer-wall",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
