import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Give",
  description:
    "Partner with Heartbeat of God Ministry through your giving — by card (CAD/USD), Naira, or Interac e-Transfer. Support global outreach, media, Feed the Future and more.",
  path: "/give",
});

export default function GiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
