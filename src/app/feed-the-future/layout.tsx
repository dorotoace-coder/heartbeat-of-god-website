import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Feed the Future",
  description: "Feed the Future — a community project of Heartbeat of God Ministry feeding vulnerable families monthly with dignity and structure. Partner with us or sponsor a monthly outreach.",
  path: "/feed-the-future",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
