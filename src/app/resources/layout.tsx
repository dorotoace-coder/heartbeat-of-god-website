import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Resources — Books",
  socialTitle: "Books | Heartbeat of God",
  description:
    "Books by Pastor Amos Unogwu, including Life After Death (2026).",
  path: "/resources",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
