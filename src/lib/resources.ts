/**
 * Books and music by Pastor Amos Unogwu (recording name: Doroto Ace).
 *
 * Every link below was opened and checked on Nov 18, 2026. Add a store or
 * platform only after confirming the listing is his. Empty = hidden.
 */

export type ResourceLink = { label: string; href: string };

export type Book = {
  title: string;
  subtitle?: string;
  author: string;
  published: string;
  formats: string;
  /** Publisher's description, as on the store listing. */
  description: string;
  links: ResourceLink[];
  /**
   * TODO(Doroto): cover artwork file. None is in the repo and no store image
   * is re-hosted here. Add e.g. /public/books/life-after-death.jpg and set it;
   * until then a typographic cover is shown.
   */
  cover?: { src: string; width: number; height: number };
};

export const BOOKS: Book[] = [
  {
    title: "Life After Death",
    subtitle: "Not Bout Death But About Life",
    author: "Amos Unogwu",
    published: "January 2026",
    formats: "Paperback · Kindle",
    description:
      "Life After Death is not a book about dying—it is a book about living. Drawing from lived interruption, spiritual awakening, and theological reflection, Amos Unogwu reframes death as disconnection and life as alignment with divine source.",
    links: [
      { label: "Paperback — Amazon.ca", href: "https://www.amazon.ca/dp/B0GJF1JJ5J" },
      { label: "Kindle — Amazon.ca", href: "https://www.amazon.ca/dp/B0GKNPGXCQ" },
    ],
  },
  {
    title: "STIR UP",
    subtitle: "32 Days of Prayer & Prophetic Alignment",
    author: "Amos Unogwu",
    published: "",
    formats: "Kindle",
    description: "",
    links: [{ label: "Kindle — Amazon.ca", href: "https://www.amazon.ca/dp/B0GJ3S9K5M" }],
  },
];

export const AUTHOR_PAGE: ResourceLink = {
  label: "All books by Amos Unogwu on Amazon.ca",
  href: "https://www.amazon.ca/Amos-Unogwu/e/B0GK2DDYX1",
};

export const MUSIC = {
  artist: "Doroto Ace",
  blurb:
    "Live-band gospel and Afro-soft rock from Pastor Amos — songs of hope, played on drums, guitar and keys.",
  /** Singles listed on his Apple Music artist page. */
  releases: ["Assurance (2024)", "Arabata Ribiti (2021)", "Till the End (2012)"],
  links: [
    { label: "YouTube", href: "https://www.youtube.com/@dorotoace" },
    { label: "Apple Music", href: "https://music.apple.com/ca/artist/doroto-ace/580970686" },
    { label: "SoundCloud", href: "https://soundcloud.com/dorotoace" },
    // TODO(Doroto): Spotify artist link — not found in search; add once confirmed.
  ] as ResourceLink[],
};
