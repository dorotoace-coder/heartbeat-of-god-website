import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Connect with Us",
  description: "Send a prayer request, testimony, first-timer card or department application to Heartbeat of God Ministry. We’re here to listen and guide.",
  path: "/connect",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
