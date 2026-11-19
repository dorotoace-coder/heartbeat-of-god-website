import type { MetadataRoute } from "next";
import { DESCRIPTION } from "@/lib/site";

/** Install-as-app manifest. Icons are the existing /hbg-logo.png centred on the site's ink background. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Heartbeat of God",
    short_name: "HBG",
    description: DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0E0716",
    theme_color: "#0E0716",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Daily Word", url: "/daily-word" },
      { name: "Watch Live", url: "/watch" },
      { name: "Give", url: "/give" },
    ],
  };
}
