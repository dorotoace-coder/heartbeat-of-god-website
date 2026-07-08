import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed the Future",
  description: "Feed the Future — a community project of Heartbeat of God Ministry feeding vulnerable families monthly with dignity and structure. Partner with us or sponsor a monthly outreach.",
};

export default function FeedTheFutureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
