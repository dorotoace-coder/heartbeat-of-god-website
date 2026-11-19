import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ILPC — International Leaders & Pastors Conference",
  socialTitle: "ILPC | Heartbeat of God",
  description:
    "ILPC 2026, “Fresh Oil for a New Season”, was held June 5–7, 2026 in Akute, Ogun State, Nigeria and online. ILPC 2027 returns in June 2027 — dates to be announced.",
  path: "/ilpc",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
