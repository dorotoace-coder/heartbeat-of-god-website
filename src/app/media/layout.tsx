import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Media Archive",
  description: "Explore our digital library of sermons, teachings, and spiritual resources from Pastor Amos Unogwu.",
  path: "/media",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
