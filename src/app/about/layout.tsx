import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Heartbeat of God Ministry — our vision, founder Pastor Amos Unogwu, and the Win-Build-Send mission model that drives our global movement.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
