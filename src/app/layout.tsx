import type { Metadata } from "next";
import { Newsreader, Manrope } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"]
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Heartbeat of God | Divine Presence",
    template: "%s | Heartbeat of God"
  },
  description: "An apostolic ministry committed to raising a generation of Christ-conscious believers globally through the Word and the Spirit.",
  keywords: ["ministry", "apostolic", "revival", "Christ-consciousness", "salvation", "prayer", "evangelism"],
  authors: [{ name: "Heartbeat of God Ministry" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://heartbeatofgod.ca",
    siteName: "Heartbeat of God Ministry",
    title: "Heartbeat of God Ministry",
    description: "Raising a generation of Christ-conscious believers globally.",
    images: [{ url: "/hbg-logo.png", width: 1200, height: 630, alt: "Heartbeat of God Ministry" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Heartbeat of God Ministry",
    description: "Raising a generation of Christ-conscious believers globally.",
    images: ["/hbg-logo.png"]
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.svg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${newsreader.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-midnight focus:text-white focus:rounded-lg">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
