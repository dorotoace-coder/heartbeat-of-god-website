import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Ministry Departments",
  description: "Discover your place of service in the Kingdom. Apply to join our Pastoral, Media, Prayer, or Outreach teams.",
  path: "/departments",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
