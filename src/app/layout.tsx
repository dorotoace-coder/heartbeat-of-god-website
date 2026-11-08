import type { Metadata, Viewport } from "next";
import { Newsreader, Manrope } from "next/font/google";
import { DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Heartbeat of God | Bringing Men to the Consciousness of God’s Presence",
    template: "%s | Heartbeat of God",
  },
  description: DESCRIPTION,
  keywords: ["Heartbeat of God", "HBG", "ministry", "apostolic", "revival", "Christ-consciousness", "salvation", "prayer", "evangelism", "Pastor Amos Unogwu"],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "Raising a generation of Christ-conscious believers globally.",
    images: [{ url: "/pastor-amos-pro.jpg", width: 1412, height: 946, alt: "Pastor Amos Unogwu, founder of Heartbeat of God Ministry" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: "Raising a generation of Christ-conscious believers globally.",
    images: ["/pastor-amos-pro.jpg"],
  },
  // Favicon + apple-touch icon come from src/app/icon.svg and src/app/apple-icon.svg
};

export const viewport: Viewport = {
  themeColor: "#0E0716",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-5 focus:py-2.5 focus:font-semibold focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
