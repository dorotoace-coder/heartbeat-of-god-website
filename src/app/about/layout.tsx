import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About",
  description: "Learn about Heartbeat of God Ministry — our vision, founder Pastor Amos Unogwu, and the Win-Build-Send mission model that drives our global movement.",
  path: "/about",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
