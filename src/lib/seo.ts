import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

type PageMeta = {
  title: string;
  /** Overrides the "<title> | Heartbeat of God" social title. */
  socialTitle?: string;
  description: string;
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
};

const DEFAULT_IMAGE = {
  url: "/pastor-amos-pro.jpg",
  width: 1412,
  height: 946,
  alt: "Pastor Amos Unogwu, founder of Heartbeat of God Ministry",
};

/** Per-page metadata with matching Open Graph + Twitter cards. */
export function pageMetadata({ title, socialTitle, description, path, image = DEFAULT_IMAGE }: PageMeta): Metadata {
  const url = `${SITE_URL}${path}`;
  const social = socialTitle ?? `${title} | Heartbeat of God`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: social,
      description,
      images: [image],
      locale: "en_CA",
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [image.url],
    },
  };
}
