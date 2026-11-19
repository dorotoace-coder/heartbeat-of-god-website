import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Resources — Books & Music",
  socialTitle: "Books & Music | Heartbeat of God",
  description:
    "Books by Pastor Amos Unogwu, including Life After Death (2026), and gospel / Afro-soft rock music from Doroto Ace.",
  path: "/resources",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
